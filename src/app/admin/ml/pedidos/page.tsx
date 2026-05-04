'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import {
	ShoppingCart,
	Loader2,
	AlertTriangle,
	RefreshCw,
	DownloadCloud,
	Package,
	ChevronDown,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface MLOrderItem {
	item: { id: string; title: string; thumbnail?: string };
	quantity: number;
	unit_price: number;
	currency_id: string;
}

interface MLOrder {
	id: number;
	status: string;
	status_detail: string | null;
	date_created: string;
	total_amount: number;
	currency_id: string;
	order_items: MLOrderItem[];
	buyer: { id: number; nickname: string; email?: string };
	shipping?: { id?: number; status?: string };
}

const CLP = (n: number) =>
	n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const STATUS_COLOR: Record<string, string> = {
	paid: 'text-green-400 bg-green-500/10 ring-green-500/30',
	payment_in_process: 'text-yellow-400 bg-yellow-500/10 ring-yellow-500/30',
	cancelled: 'text-zinc-400 bg-zinc-800 ring-zinc-700',
	confirmed: 'text-blue-400 bg-blue-500/10 ring-blue-500/30',
};

const STATUS_ES: Record<string, string> = {
	paid: 'Pagado',
	payment_in_process: 'En proceso',
	cancelled: 'Cancelado',
	confirmed: 'Confirmado',
	partially_refunded: 'Reembolso parcial',
	pending_cancel: 'Cancelación pendiente',
	invalid: 'Inválido',
};

const FILTER_OPTIONS = [
	{ value: '', label: 'Todos' },
	{ value: 'paid', label: 'Pagados' },
	{ value: 'payment_in_process', label: 'En proceso' },
	{ value: 'cancelled', label: 'Cancelados' },
];

export default function MLPedidosPage() {
	const [orders, setOrders] = useState<MLOrder[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [syncing, setSyncing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState('');
	const [expanded, setExpanded] = useState<Set<number>>(new Set());

	const load = useCallback(async (sync = false) => {
		sync ? setSyncing(true) : setLoading(true);
		setError(null);
		try {
			const params = new URLSearchParams({ limit: '50', ...(statusFilter ? { status: statusFilter } : {}), ...(sync ? { sync: 'true' } : {}) });
			const res = await fetch(`/api/admin/ml/orders?${params}`);
			const json = await res.json() as {
				ok?: boolean;
				results?: MLOrder[];
				paging?: { total: number };
				error?: string;
			};
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setOrders(json.results ?? []);
			setTotal(json.paging?.total ?? 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al cargar pedidos ML.');
		} finally {
			setLoading(false);
			setSyncing(false);
		}
	}, [statusFilter]);

	useEffect(() => { void load(); }, [load]);

	function toggleExpand(id: number) {
		setExpanded((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="MercadoLibre · Ventas"
				title="Pedidos ML"
				description={`${total} pedidos en tu cuenta de ML.`}
			/>

			<div className="mb-4 flex flex-wrap items-center gap-3">
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					aria-label="Filtrar por estado"
					className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/60"
				>
					{FILTER_OPTIONS.map((o) => (
						<option key={o.value} value={o.value}>{o.label}</option>
					))}
				</select>
				<button
					onClick={() => void load(true)}
					disabled={loading || syncing}
					className="ml-auto flex items-center gap-2 rounded-lg border border-yellow-500/40 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-40"
				>
					{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
					Sincronizar con BD
				</button>
				<button
					onClick={() => void load()}
					disabled={loading}
					className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 disabled:opacity-40"
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
					<Loader2 className="h-5 w-5 animate-spin" /> Cargando pedidos…
				</div>
			)}

			{!loading && orders.length === 0 && !error && (
				<div className="flex flex-col items-center gap-3 py-16 text-zinc-500">
					<ShoppingCart className="h-10 w-10" />
					<p>No se encontraron pedidos con ese filtro.</p>
				</div>
			)}

			{!loading && orders.length > 0 && (
				<div className="space-y-3">
					{orders.map((order) => {
						const isOpen = expanded.has(order.id);
						return (
							<div key={order.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
								<button
									onClick={() => toggleExpand(order.id)}
									className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-zinc-900"
								>
									<ShoppingCart className="h-4 w-4 flex-shrink-0 text-zinc-500" />
									<div className="flex-1 min-w-0">
										<div className="flex flex-wrap items-center gap-2">
											<span className="font-mono text-xs text-zinc-500">#{order.id}</span>
											<span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${STATUS_COLOR[order.status] ?? 'text-zinc-400 bg-zinc-800 ring-zinc-700'}`}>
												{STATUS_ES[order.status] ?? order.status}
											</span>
										</div>
										<p className="mt-0.5 text-sm text-white">
											{order.buyer.nickname}
											{order.buyer.email && <span className="ml-2 text-xs text-zinc-400">{order.buyer.email}</span>}
										</p>
									</div>
									<div className="text-right flex-shrink-0">
										<p className="font-bold text-yellow-400">
											{order.currency_id === 'CLP' ? CLP(order.total_amount) : `${order.currency_id} ${order.total_amount}`}
										</p>
										<p className="text-xs text-zinc-500">
											{new Date(order.date_created).toLocaleDateString('es-CL')}
										</p>
									</div>
									<ChevronDown className={`h-4 w-4 flex-shrink-0 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
								</button>

								{isOpen && (
									<div className="border-t border-zinc-800 px-5 py-4">
										<p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
											Artículos del pedido
										</p>
										<div className="space-y-2">
											{order.order_items.map((oi, i) => (
												<div key={i} className="flex items-center gap-3">
													<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-800">
														<Package className="h-5 w-5 text-zinc-600" />
													</div>
													<div className="flex-1 min-w-0">
														<p className="truncate text-sm text-white">{oi.item.title}</p>
														<p className="text-xs text-zinc-500">{oi.item.id} · ×{oi.quantity}</p>
													</div>
													<p className="flex-shrink-0 text-sm font-semibold text-yellow-400">
														{oi.currency_id === 'CLP' ? CLP(oi.unit_price * oi.quantity) : `${oi.currency_id} ${oi.unit_price * oi.quantity}`}
													</p>
												</div>
											))}
										</div>
										{order.shipping && (
											<p className="mt-3 text-xs text-zinc-500">
												Envío #{order.shipping.id} · Estado: {order.shipping.status ?? '—'}
											</p>
										)}
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
