import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { mlGetQuestions, mlAnswerQuestion } from '@/lib/mlApi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/ml/questions?item_id={}&status={UNANSWERED|ANSWERED}&limit={}&offset={}
 * Returns questions for the authenticated seller.
 */
export async function GET(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const { searchParams } = request.nextUrl;
		const itemId = searchParams.get('item_id') ?? undefined;
		const status = searchParams.get('status') ?? 'UNANSWERED';
		const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 100);
		const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

		const data = await mlGetQuestions({ itemId, status, limit, offset });

		// Best-effort sync to ml_questions table.
		if (data.questions.length) {
			const client = getAdminInsforge();
			const rows = data.questions.map((q) => ({
				id: q.id,
				item_id: q.item_id,
				seller_id: q.seller_id ?? null,
				status: q.status,
				text: q.text,
				answer_text: q.answer?.text ?? null,
				answer_status: q.answer?.status ?? null,
				answer_date: q.answer?.date_created ?? null,
				buyer_id: q.from?.id ?? null,
				date_created: q.date_created,
				synced_at: new Date().toISOString(),
			}));
			try {
				await client.database
					.from('ml_questions')
					.upsert(rows, { onConflict: 'id' });
			} catch {
				// Table may not exist yet.
			}
		}

		return NextResponse.json({ ok: true, ...data });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al obtener preguntas ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}

/**
 * POST /api/admin/ml/questions
 * Body: { question_id: number, text: string }
 * Answers an ML question and updates the local DB record.
 */
export async function POST(request: NextRequest) {
	try {
		const session = await getAdminSession(request);
		if (!session) return adminUnauthorized();

		const body = (await request.json().catch(() => ({}))) as {
			question_id?: unknown;
			text?: unknown;
		};
		const questionId = Number(body.question_id);
		const text = typeof body.text === 'string' ? body.text.trim() : '';

		if (!questionId || !text) {
			return NextResponse.json(
				{ error: 'Falta question_id o text.' },
				{ status: 400 },
			);
		}
		if (text.length > 2000) {
			return NextResponse.json(
				{ error: 'La respuesta no puede superar los 2000 caracteres.' },
				{ status: 400 },
			);
		}

		const result = await mlAnswerQuestion(questionId, text);

		// Update local DB record.
		const client = getAdminInsforge();
		try {
			await client.database
				.from('ml_questions')
				.update({
					status: 'ANSWERED',
					answer_text: text,
					answer_date: new Date().toISOString(),
				})
				.eq('id', questionId);
		} catch {
			// Best-effort.
		}

		return NextResponse.json({ ok: true, ...result });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error al responder pregunta ML.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
