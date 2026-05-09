'use client';

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
	Search,
	Loader2,
	AlertTriangle,
	ExternalLink,
	Download,
	Package,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface MLItem {
	id: string;
	title: string;
	price: number;
	currency_id: string;
	available_quantity: number;
	condition: string;
	permalink: string;
	thumbnail: string;
	shipping: { free_shipping?: boolean };
}

const CLP = (n: number) =>
	n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const PAGE_SIZE = 20;

export default function MLSearchPage() {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<MLItem[]>([]);
	const [total, setTotal] = useState(0);
	const [offset, setOffset] = useState(0);
	const [loading, setLoading] = useState(false);
	const [importing, setImporting] = useState<string | null>(null);
	const [imported, setImported] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	async function doSearch(q: string, off = 0) {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch(
				`/api/admin/ml/search?q=${encodeURIComponent(q)}&limit=${PAGE_SIZE}&offset=${off}`,
			);
			const json = await res.json() as {
				ok?: boolean;
				results?: MLItem[];
				paging?: { total: number };
				error?: string;
			};
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setResults(json.results ?? []);
			setTotal(json.paging?.total ?? 0);
			setOffset(off);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al buscar.');
		} finally {
			setLoading(false);
		}
	}

	async function importItem(item: MLItem) {
		if (importing) return;
		setImporting(item.id);
		try {
			const res = await fetch('/api/admin/productos/import-from-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: item.permalink, persist: true }),
			});
			const json = await res.json() as { ok?: boolean; error?: string };
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setImported((prev) => new Set([...prev, item.id]));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al importar.');
		} finally {
			setImporting(null);
		}
	}

	const pages = Math.ceil(total / PAGE_SIZE);
	const page = Math.floor(offset / PAGE_SIZE) + 1;

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="MercadoLibre · Buscador"
				title="Buscar en catálogo ML"
				description="Busca productos en MercadoLibre Chile e impórtalos a tu catálogo con un clic."
			/>

			{/* Search form */}
			<form
				onSubmit={(e) => { e.preventDefault(); void doSearch(query); }}
				className="mb-6 flex gap-3"
			>
				<div className="relative flex-1">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
					<input
						ref={inputRef}
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Ej: pintura látex, taladro inalámbrico…"
						disabled={loading}
						className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 py-3 pl-10 pr-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-yellow-400/60 focus:ring-2 focus:ring-yellow-400/30 disabled:opacity-60"
					/>
				</div>
				<button
					type="submit"
					disabled={loading || !query.trim()}
					className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-60"
				>
					{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
					Buscar
				</button>
			</form>

			{error && (
				<div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
					<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
					{error}
				</div>
			)}

			{/* Results */}
			{results.length > 0 && (
				<>
					<p className="mb-3 text-sm text-zinc-400">
						{total.toLocaleString('es-CL')} resultados · Página {page} de {pages}
					</p>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{results.map((item) => (
							<div
								key={item.id}
								className="flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
							>
								<div className="relative h-40 bg-zinc-800">
									{item.thumbnail ? (
										<img
											src={item.thumbnail.replace(/^http:/, 'https:')}
											alt={item.title}
											className="h-full w-full object-contain p-2"
										/>
									) : (
										<div className="flex h-full items-center justify-center">
											<Package className="h-10 w-10 text-zinc-600" />
										</div>
									)}
									{item.shipping?.free_shipping && (
										<span className="absolute bottom-2 left-2 rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-bold text-green-400 ring-1 ring-green-500/30">
											Envío gratis
										</span>
									)}
								</div>
								<div className="flex flex-1 flex-col gap-2 p-4">
									<p className="line-clamp-2 text-sm font-medium text-white">{item.title}</p>
									<p className="text-lg font-bold text-yellow-400">
										{item.currency_id === 'CLP' ? CLP(item.price) : `${item.currency_id} ${item.price.toLocaleString('es-CL')}`}
									</p>
									<p className="text-xs text-zinc-500">
										{item.condition === 'new' ? 'Nuevo' : 'Usado'} · {item.available_quantity} disponibles
									</p>
									<div className="mt-auto flex gap-2 pt-2">
										<a
											href={item.permalink}
											target="_blank"
											rel="noopener noreferrer"
											className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-700 py-2 text-xs text-zinc-300 hover:border-zinc-500 hover:text-white"
										>
											<ExternalLink className="h-3 w-3" />
											Ver en ML
										</a>
										<button
											onClick={() => void importItem(item)}
											disabled={importing === item.id || imported.has(item.id)}
											className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
												imported.has(item.id)
													? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/30'
													: 'bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-60'
											}`}
										>
											{importing === item.id ? (
												<Loader2 className="h-3 w-3 animate-spin" />
											) : imported.has(item.id) ? (
												'Importado ✓'
											) : (
												<><Download className="h-3 w-3" />Importar</>
											)}
										</button>
									</div>
								</div>
							</div>
						))}
					</div>

					{/* Pagination */}
					{pages > 1 && (
						<div className="mt-6 flex items-center justify-center gap-3">
							<button
								onClick={() => void doSearch(query, offset - PAGE_SIZE)}
								disabled={offset === 0 || loading}
								className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
							>
								<ChevronLeft className="h-4 w-4" /> Anterior
							</button>
							<span className="text-sm text-zinc-400">{page} / {pages}</span>
							<button
								onClick={() => void doSearch(query, offset + PAGE_SIZE)}
								disabled={offset + PAGE_SIZE >= total || loading}
								className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
							>
								Siguiente <ChevronRight className="h-4 w-4" />
							</button>
						</div>
					)}
				</>
			)}

			{!loading && results.length === 0 && query && (
				<div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
					<Package className="h-10 w-10" />
					<p>Sin resultados para «{query}»</p>
				</div>
			)}
		</AdminPage>
	);
}
