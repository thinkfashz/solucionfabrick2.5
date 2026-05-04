'use client';

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import {
	TrendingDown,
	Loader2,
	AlertTriangle,
	RefreshCw,
	Plus,
	Trash2,
	Package,
	ExternalLink,
	TrendingUp,
	Minus,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface MLPriceAlert {
	id: string;
	item_id: string;
	item_title: string | null;
	my_price: number | null;
	target_price: number | null;
	last_checked_price: number | null;
	last_checked_at: string | null;
	alert_active: boolean;
}

interface MLCompetitor {
	id: string;
	title: string;
	price: number;
	currency_id: string;
	permalink: string;
	thumbnail: string;
	shipping: { free_shipping?: boolean };
}

interface CompareResult {
	item: { id: string; title: string; price: number; currency_id: string; permalink: string };
	competitors: MLCompetitor[];
	minCompetitorPrice: number | null;
}

const CLP = (n: number) =>
	n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function MLPreciosPage() {
	const [alerts, setAlerts] = useState<MLPriceAlert[]>([]);
	const [loadingAlerts, setLoadingAlerts] = useState(true);
	const [alertsError, setAlertsError] = useState<string | null>(null);

	const [compareItemId, setCompareItemId] = useState('');
	const [comparing, setComparing] = useState(false);
	const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
	const [compareError, setCompareError] = useState<string | null>(null);

	const [addingAlert, setAddingAlert] = useState(false);
	const [targetPrice, setTargetPrice] = useState('');
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const loadAlerts = useCallback(async () => {
		setLoadingAlerts(true);
		setAlertsError(null);
		try {
			const { data } = await fetch('/api/admin/ml/prices?_type=list')
				.then((r) => r.json()) as { data?: MLPriceAlert[]; error?: string };
			setAlerts(data ?? []);
		} catch {
			// Table may not exist yet — show empty state.
			setAlerts([]);
		} finally {
			setLoadingAlerts(false);
		}
	}, []);

	useEffect(() => { void loadAlerts(); }, [loadAlerts]);

	async function doCompare() {
		const itemId = compareItemId.trim().toUpperCase();
		if (!itemId) return;
		setComparing(true);
		setCompareError(null);
		setCompareResult(null);
		try {
			const res = await fetch(`/api/admin/ml/prices?item_id=${encodeURIComponent(itemId)}&limit=8`);
			const json = await res.json() as { ok?: boolean; error?: string } & CompareResult;
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setCompareResult(json);
		} catch (err) {
			setCompareError(err instanceof Error ? err.message : 'Error al comparar precios.');
		} finally {
			setComparing(false);
		}
	}

	async function addAlert() {
		if (!compareResult) return;
		setAddingAlert(true);
		try {
			const tp = targetPrice.trim() ? parseFloat(targetPrice.replace(/\./g, '').replace(',', '.')) : undefined;
			const res = await fetch('/api/admin/ml/prices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ item_id: compareResult.item.id, target_price: tp }),
			});
			const json = await res.json() as { ok?: boolean; alert?: MLPriceAlert; error?: string };
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			if (json.alert) setAlerts((prev) => [json.alert!, ...prev.filter((a) => a.item_id !== compareResult.item.id)]);
			setTargetPrice('');
		} catch (err) {
			setAlertsError(err instanceof Error ? err.message : 'Error al agregar alerta.');
		} finally {
			setAddingAlert(false);
		}
	}

	async function deleteAlert(alert: MLPriceAlert) {
		setDeletingId(alert.id);
		try {
			const res = await fetch(`/api/admin/ml/prices?item_id=${encodeURIComponent(alert.item_id)}`, {
				method: 'DELETE',
			});
			const json = await res.json() as { ok?: boolean; error?: string };
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
		} catch (err) {
			setAlertsError(err instanceof Error ? err.message : 'Error al eliminar alerta.');
		} finally {
			setDeletingId(null);
		}
	}

	function priceDelta(mine: number | null, competitor: number | null) {
		if (mine === null || competitor === null) return null;
		return ((mine - competitor) / competitor) * 100;
	}

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="MercadoLibre · Competencia"
				title="Monitor de precios"
				description="Compara tus precios con la competencia y recibe alertas cuando bajen."
			/>

			{/* Compare tool */}
			<section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
				<p className="mb-4 text-sm font-semibold text-zinc-200">Comparar con competencia</p>
				<div className="flex gap-3">
					<input
						type="text"
						value={compareItemId}
						onChange={(e) => setCompareItemId(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && void doCompare()}
						placeholder="ID de artículo ML (ej: MLC123456789)"
						disabled={comparing}
						className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-yellow-400/60 disabled:opacity-60"
					/>
					<button
						onClick={() => void doCompare()}
						disabled={comparing || !compareItemId.trim()}
						className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-semibold text-black hover:bg-yellow-300 disabled:opacity-60"
					>
						{comparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
						Comparar
					</button>
				</div>

				{compareError && (
					<div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
						<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
						{compareError}
					</div>
				)}

				{compareResult && (
					<div className="mt-5">
						{/* My item */}
						<div className="mb-4 flex items-center justify-between rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
							<div>
								<p className="text-xs font-bold uppercase tracking-widest text-yellow-500">Tu artículo</p>
								<p className="mt-1 font-medium text-white">{compareResult.item.title}</p>
								<p className="text-xs text-zinc-500">{compareResult.item.id}</p>
							</div>
							<div className="text-right">
								<p className="text-xl font-bold text-yellow-400">
									{compareResult.item.currency_id === 'CLP' ? CLP(compareResult.item.price) : `${compareResult.item.currency_id} ${compareResult.item.price}`}
								</p>
								{compareResult.minCompetitorPrice !== null && (
									<p className={`mt-1 text-xs font-semibold ${
										compareResult.item.price <= compareResult.minCompetitorPrice
											? 'text-green-400' : 'text-red-400'
									}`}>
										{compareResult.item.price <= compareResult.minCompetitorPrice ? '✓ Más barato' : `+${CLP(compareResult.item.price - compareResult.minCompetitorPrice)} vs. mínimo`}
									</p>
								)}
							</div>
						</div>

						{/* Competitors */}
						<div className="space-y-2">
							{compareResult.competitors.slice(0, 8).map((c) => {
								const delta = priceDelta(compareResult.item.price, c.price);
								return (
									<div key={c.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
										{c.thumbnail && (
											<img src={c.thumbnail.replace(/^http:/, 'https:')} alt={c.title} className="h-10 w-10 flex-shrink-0 rounded-lg object-contain bg-zinc-800" />
										)}
										<div className="flex-1 min-w-0">
											<p className="truncate text-sm text-zinc-200">{c.title}</p>
											{c.shipping?.free_shipping && (
												<span className="text-[10px] text-green-400">Envío gratis</span>
											)}
										</div>
										<div className="text-right flex-shrink-0">
											<p className="font-semibold text-white">
												{c.currency_id === 'CLP' ? CLP(c.price) : `${c.currency_id} ${c.price}`}
											</p>
											{delta !== null && (
												<p className={`text-xs ${delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
													{delta > 0 ? <TrendingUp className="inline h-3 w-3" /> : delta < 0 ? <TrendingDown className="inline h-3 w-3" /> : <Minus className="inline h-3 w-3" />}
													{' '}{Math.abs(delta).toFixed(1)}%
												</p>
											)}
										</div>
										<a href={c.permalink} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-700 p-1.5 text-zinc-500 hover:text-white" aria-label="Ver en ML">
											<ExternalLink className="h-3 w-3" />
										</a>
									</div>
								);
							})}
						</div>

						{/* Add to watchlist */}
						<div className="mt-4 flex gap-3">
							<input
								type="text"
								value={targetPrice}
								onChange={(e) => setTargetPrice(e.target.value)}
								placeholder="Precio alerta (opcional)"
								className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-yellow-400/60"
							/>
							<button
								onClick={() => void addAlert()}
								disabled={addingAlert}
								className="flex items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2.5 text-sm text-yellow-300 hover:bg-yellow-400/20 disabled:opacity-60"
							>
								{addingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
								Vigilar precio
							</button>
						</div>
					</div>
				)}
			</section>

			{/* Watch list */}
			<section>
				<div className="mb-4 flex items-center justify-between">
					<p className="text-sm font-semibold text-zinc-200">
						Artículos vigilados ({alerts.length})
					</p>
					<button
						onClick={() => void loadAlerts()}
						disabled={loadingAlerts}
						className="rounded-lg border border-zinc-700 p-1.5 text-zinc-500 hover:text-white disabled:opacity-40"
						aria-label="Actualizar lista"
					>
						<RefreshCw className={`h-4 w-4 ${loadingAlerts ? 'animate-spin' : ''}`} />
					</button>
				</div>

				{alertsError && (
					<div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
						<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
						{alertsError}
					</div>
				)}

				{!loadingAlerts && alerts.length === 0 && (
					<div className="flex flex-col items-center gap-3 py-10 text-zinc-500">
						<Package className="h-8 w-8" />
						<p className="text-sm">Aún no vigilas ningún artículo.</p>
					</div>
				)}

				{alerts.length > 0 && (
					<div className="space-y-2">
						{alerts.map((alert) => (
							<div key={alert.id} className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
								<div className="flex-1 min-w-0">
									<p className="truncate text-sm font-medium text-white">{alert.item_title ?? alert.item_id}</p>
									<p className="text-xs text-zinc-500">{alert.item_id}</p>
								</div>
								<div className="flex-shrink-0 text-right">
									<p className="text-sm font-semibold text-yellow-400">
										{alert.my_price !== null ? CLP(alert.my_price) : '—'}
									</p>
									{alert.target_price !== null && (
										<p className="text-xs text-zinc-400">Alerta: {CLP(alert.target_price)}</p>
									)}
								</div>
								<button
									onClick={() => void deleteAlert(alert)}
									disabled={deletingId === alert.id}
									className="rounded-lg border border-zinc-700 p-1.5 text-zinc-500 hover:text-red-400 disabled:opacity-40"
									aria-label="Eliminar alerta"
								>
									{deletingId === alert.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
								</button>
							</div>
						))}
					</div>
				)}
			</section>
		</AdminPage>
	);
}
