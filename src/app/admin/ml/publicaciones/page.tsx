'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import {
	Store,
	Loader2,
	AlertTriangle,
	RefreshCw,
	ExternalLink,
	Package,
	Play,
	Pause,
	Pencil,
	CheckCircle2,
	X,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface MLItem {
	id: string;
	title: string;
	price: number;
	currency_id: string;
	available_quantity: number;
	sold_quantity: number;
	status: string;
	condition: string;
	permalink: string;
	thumbnail: string;
}

const CLP = (n: number) =>
	n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const STATUS_LABEL: Record<string, string> = {
	active: 'Activo',
	paused: 'Pausado',
	closed: 'Cerrado',
	under_review: 'En revisión',
};

const STATUS_COLOR: Record<string, string> = {
	active: 'text-green-400 bg-green-500/10 ring-green-500/30',
	paused: 'text-yellow-400 bg-yellow-500/10 ring-yellow-500/30',
	closed: 'text-zinc-400 bg-zinc-500/10 ring-zinc-500/30',
	under_review: 'text-orange-400 bg-orange-500/10 ring-orange-500/30',
};

interface EditState {
	id: string;
	price: string;
	stock: string;
}

export default function MLPublicacionesPage() {
	const [items, setItems] = useState<MLItem[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [editing, setEditing] = useState<EditState | null>(null);
	const [saving, setSaving] = useState<string | null>(null);
	const [toggling, setToggling] = useState<string | null>(null);
	const [saveMsg, setSaveMsg] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/admin/ml/items?limit=50');
			const json = await res.json() as {
				ok?: boolean;
				results?: MLItem[];
				paging?: { total: number };
				error?: string;
			};
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setItems(json.results ?? []);
			setTotal(json.paging?.total ?? 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al cargar publicaciones ML.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { void load(); }, [load]);

	async function toggleStatus(item: MLItem) {
		setToggling(item.id);
		try {
			const newStatus = item.status === 'active' ? 'paused' : 'active';
			const res = await fetch(`/api/admin/ml/items/${item.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});
			const json = await res.json() as { ok?: boolean; item?: MLItem; error?: string };
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: newStatus } : i)));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al cambiar estado.');
		} finally {
			setToggling(null);
		}
	}

	async function saveEdit() {
		if (!editing) return;
		setSaving(editing.id);
		try {
			const patch: Record<string, number> = {};
			const price = parseFloat(editing.price.replace(/\./g, '').replace(',', '.'));
			const stock = parseInt(editing.stock, 10);
			if (!isNaN(price) && price > 0) patch.price = price;
			if (!isNaN(stock) && stock >= 0) patch.available_quantity = stock;
			if (!Object.keys(patch).length) { setEditing(null); return; }

			const res = await fetch(`/api/admin/ml/items/${editing.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(patch),
			});
			const json = await res.json() as { ok?: boolean; item?: MLItem; error?: string };
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			if (json.item) {
				setItems((prev) => prev.map((i) => (i.id === editing.id ? json.item! : i)));
			}
			setSaveMsg('Guardado ✓');
			setTimeout(() => setSaveMsg(null), 3000);
			setEditing(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al guardar.');
		} finally {
			setSaving(null);
		}
	}

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="MercadoLibre · Vendedor"
				title="Mis publicaciones"
				description={`${total} publicaciones en tu cuenta de ML.`}
			/>

			<div className="mb-4 flex items-center justify-between">
				{saveMsg && (
					<span className="flex items-center gap-1.5 text-sm text-green-400">
						<CheckCircle2 className="h-4 w-4" /> {saveMsg}
					</span>
				)}
				<button
					onClick={() => void load()}
					disabled={loading}
					className="ml-auto flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					Actualizar
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
					<Loader2 className="h-5 w-5 animate-spin" /> Cargando publicaciones…
				</div>
			)}

			{!loading && items.length === 0 && !error && (
				<div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
					<Store className="h-10 w-10" />
					<p>No se encontraron publicaciones en esta cuenta.</p>
				</div>
			)}

			{!loading && items.length > 0 && (
				<div className="overflow-hidden rounded-2xl border border-zinc-800">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-zinc-800 bg-zinc-900/80">
								<th className="px-4 py-3 text-left font-medium text-zinc-400">Producto</th>
								<th className="px-4 py-3 text-right font-medium text-zinc-400">Precio</th>
								<th className="px-4 py-3 text-right font-medium text-zinc-400">Stock</th>
								<th className="px-4 py-3 text-right font-medium text-zinc-400">Vendidos</th>
								<th className="px-4 py-3 text-center font-medium text-zinc-400">Estado</th>
								<th className="px-4 py-3 text-right font-medium text-zinc-400">Acciones</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-zinc-800/60">
							{items.map((item) => {
								const isEditing = editing?.id === item.id;
								return (
									<tr key={item.id} className="hover:bg-zinc-900/40">
										<td className="px-4 py-3">
											<div className="flex items-center gap-3">
												{item.thumbnail ? (
													<img
														src={item.thumbnail.replace(/^http:/, 'https:')}
														alt={item.title}
														className="h-10 w-10 flex-shrink-0 rounded-lg object-contain bg-zinc-800"
													/>
												) : (
													<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800">
														<Package className="h-5 w-5 text-zinc-600" />
													</div>
												)}
												<div className="min-w-0">
													<p className="truncate font-medium text-white max-w-[200px]">{item.title}</p>
													<p className="text-xs text-zinc-500">{item.id}</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-3 text-right">
											{isEditing ? (
												<input
													type="text"
													value={editing.price}														aria-label="Precio"
														placeholder="0"													onChange={(e) => setEditing((prev) => prev ? { ...prev, price: e.target.value } : null)}
													className="w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-right text-sm text-white outline-none focus:border-yellow-400/60"
												/>
											) : (
												<span className="font-semibold text-yellow-400">
													{item.currency_id === 'CLP' ? CLP(item.price) : `${item.currency_id} ${item.price}`}
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-right">
											{isEditing ? (
												<input
													type="number"
													min="0"														aria-label="Stock disponible"
														placeholder="0"													value={editing.stock}
													onChange={(e) => setEditing((prev) => prev ? { ...prev, stock: e.target.value } : null)}
													className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-right text-sm text-white outline-none focus:border-yellow-400/60"
												/>
											) : (
												<span className={item.available_quantity === 0 ? 'text-red-400' : 'text-zinc-200'}>
													{item.available_quantity}
												</span>
											)}
										</td>
										<td className="px-4 py-3 text-right text-zinc-400">{item.sold_quantity}</td>
										<td className="px-4 py-3 text-center">
											<span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_COLOR[item.status] ?? 'text-zinc-400 bg-zinc-800 ring-zinc-700'}`}>
												{STATUS_LABEL[item.status] ?? item.status}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center justify-end gap-2">
												{isEditing ? (
													<>
														<button
															onClick={() => void saveEdit()}
															disabled={saving === item.id}
															className="rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-300 disabled:opacity-60"
														>
															{saving === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
														</button>
														<button
															onClick={() => setEditing(null)}
															aria-label="Cancelar edición"
															title="Cancelar edición"
															className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:text-white"
														>
															<X className="h-3 w-3" />
														</button>
													</>
												) : (
													<>
														<button
															onClick={() => setEditing({ id: item.id, price: String(item.price), stock: String(item.available_quantity) })}
															className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:text-white"
															aria-label="Editar"
														>
															<Pencil className="h-3 w-3" />
														</button>
														<button
															onClick={() => void toggleStatus(item)}
															disabled={toggling === item.id || item.status === 'closed'}
															className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:text-white disabled:opacity-40"
															aria-label={item.status === 'active' ? 'Pausar' : 'Activar'}
														>
															{toggling === item.id
																? <Loader2 className="h-3 w-3 animate-spin" />
																: item.status === 'active'
																	? <Pause className="h-3 w-3" />
																	: <Play className="h-3 w-3" />}
														</button>
														<a
															href={item.permalink}
															target="_blank"
															rel="noopener noreferrer"
															className="rounded-lg border border-zinc-700 p-1.5 text-zinc-400 hover:text-white"
															aria-label="Ver en ML"
														>
															<ExternalLink className="h-3 w-3" />
														</a>
													</>
												)}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</AdminPage>
	);
}
