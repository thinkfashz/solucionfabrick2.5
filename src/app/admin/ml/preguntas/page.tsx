'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
	MessageCircle,
	Loader2,
	AlertTriangle,
	RefreshCw,
	Send,
	CheckCircle2,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface MLQuestion {
	id: number;
	item_id: string;
	status: string;
	text: string;
	date_created: string;
	answer: { text: string; date_created: string } | null;
	from: { id: number };
}

type Tab = 'UNANSWERED' | 'ANSWERED';

export default function MLPreguntasPage() {
	const [questions, setQuestions] = useState<MLQuestion[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [tab, setTab] = useState<Tab>('UNANSWERED');
	const [answering, setAnswering] = useState<number | null>(null);
	const [answerText, setAnswerText] = useState<Record<number, string>>({});
	const [sending, setSending] = useState<number | null>(null);
	const [sent, setSent] = useState<Set<number>>(new Set());
	const textareaRef = useRef<Record<number, HTMLTextAreaElement | null>>({});

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(`/api/admin/ml/questions?status=${tab}&limit=50`);
			const json = await res.json() as {
				ok?: boolean;
				questions?: MLQuestion[];
				total?: number;
				error?: string;
			};
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setQuestions(json.questions ?? []);
			setTotal(json.total ?? 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al cargar preguntas ML.');
		} finally {
			setLoading(false);
		}
	}, [tab]);

	useEffect(() => { void load(); }, [load]);

	async function sendAnswer(questionId: number) {
		const text = (answerText[questionId] ?? '').trim();
		if (!text) return;
		setSending(questionId);
		try {
			const res = await fetch('/api/admin/ml/questions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ question_id: questionId, text }),
			});
			const json = await res.json() as { ok?: boolean; error?: string };
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setSent((prev) => new Set([...prev, questionId]));
			setAnswering(null);
			// Remove from list after short delay.
			setTimeout(() => {
				setQuestions((prev) => prev.filter((q) => q.id !== questionId));
			}, 1500);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al enviar respuesta.');
		} finally {
			setSending(null);
		}
	}

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="MercadoLibre · Compradores"
				title="Preguntas"
				description="Responde las preguntas de tus compradores directamente desde el admin."
			/>

			{/* Tabs */}
			<div className="mb-6 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-1 w-fit">
				{(['UNANSWERED', 'ANSWERED'] as Tab[]).map((t) => (
					<button
						key={t}
						onClick={() => setTab(t)}
						className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
							tab === t
								? 'bg-yellow-400 text-black'
								: 'text-zinc-400 hover:text-white'
						}`}
					>
						{t === 'UNANSWERED' ? 'Sin responder' : 'Respondidas'}
					</button>
				))}
				<button
					onClick={() => void load()}
					disabled={loading}
					className="ml-2 rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:text-white disabled:opacity-40"
					aria-label="Actualizar"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
				</button>
			</div>

			{error && (
				<div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
					<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
					{error}
				</div>
			)}

			{loading && (
				<div className="flex items-center gap-3 py-16 text-zinc-400">
					<Loader2 className="h-5 w-5 animate-spin" /> Cargando preguntas…
				</div>
			)}

			{!loading && questions.length === 0 && !error && (
				<div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
					<MessageCircle className="h-10 w-10" />
					<p>{tab === 'UNANSWERED' ? '¡Sin preguntas pendientes!' : 'No hay preguntas respondidas aún.'}</p>
				</div>
			)}

			{!loading && questions.length > 0 && (
				<div className="space-y-4">
					{questions.map((q) => {
						const isSent = sent.has(q.id);
						const isOpen = answering === q.id;
						return (
							<div
								key={q.id}
								className={`rounded-2xl border p-5 transition ${
									isSent
										? 'border-green-500/30 bg-green-500/5'
										: 'border-zinc-800 bg-zinc-900/50'
								}`}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex-1 min-w-0">
										<p className="font-medium text-white">{q.text}</p>
										<p className="mt-1 text-xs text-zinc-500">
											{q.item_id} · {new Date(q.date_created).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
										</p>
									</div>
									{isSent ? (
										<CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
									) : q.status === 'UNANSWERED' && (
										<button
											onClick={() => {
												setAnswering(isOpen ? null : q.id);
												setTimeout(() => textareaRef.current[q.id]?.focus(), 50);
											}}
											className="flex-shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
										>
											Responder
										</button>
									)}
								</div>

								{/* Existing answer */}
								{q.answer && (
									<div className="mt-3 rounded-lg border-l-2 border-yellow-400/40 bg-yellow-400/5 pl-4 py-2">
										<p className="text-sm text-zinc-200">{q.answer.text}</p>
										<p className="mt-1 text-xs text-zinc-500">
											{new Date(q.answer.date_created).toLocaleDateString('es-CL')}
										</p>
									</div>
								)}

								{/* Reply form */}
								{isOpen && !isSent && (
									<div className="mt-3 flex flex-col gap-2">
										<textarea
											ref={(el) => { textareaRef.current[q.id] = el; }}
											value={answerText[q.id] ?? ''}
											onChange={(e) => setAnswerText((prev) => ({ ...prev, [q.id]: e.target.value }))}
											placeholder="Escribe tu respuesta aquí…"
											rows={3}
											maxLength={2000}
											className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/20"
										/>
										<div className="flex items-center justify-between">
											<span className="text-xs text-zinc-500">
												{(answerText[q.id] ?? '').length}/2000
											</span>
											<button
												onClick={() => void sendAnswer(q.id)}
												disabled={sending === q.id || !(answerText[q.id] ?? '').trim()}
												className="flex items-center gap-2 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-60"
											>
												{sending === q.id
													? <Loader2 className="h-4 w-4 animate-spin" />
													: <Send className="h-4 w-4" />}
												Enviar
											</button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</AdminPage>
	);
}
