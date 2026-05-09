'use client';

import { useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
	ShoppingCart,
	MessageCircle,
	Tag,
	Search,
	Store,
	TrendingDown,
	CheckCircle2,
	AlertTriangle,
	Loader2,
	ExternalLink,
	RefreshCw,
	LinkIcon,
	type LucideProps,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

interface MLUser {
	id: number;
	nickname: string;
	seller_reputation?: {
		level_id?: string;
		transactions?: { completed: number; canceled: number; total: number };
	};
}

interface StatusCard {
	href: string;
	icon: ComponentType<LucideProps>;
	label: string;
	description: string;
	color: string;
}

const SECTIONS: StatusCard[] = [
	{
		href: '/admin/ml/buscar',
		icon: Search,
		label: 'Buscador de catálogo',
		description: 'Busca productos en ML Chile e importa directamente a tu tienda.',
		color: 'text-blue-400',
	},
	{
		href: '/admin/ml/publicaciones',
		icon: Store,
		label: 'Mis publicaciones',
		description: 'Edita precios, stock y estado de tus listings en ML.',
		color: 'text-yellow-400',
	},
	{
		href: '/admin/ml/pedidos',
		icon: ShoppingCart,
		label: 'Pedidos ML',
		description: 'Sincroniza tus ventas de ML al sistema de pedidos interno.',
		color: 'text-green-400',
	},
	{
		href: '/admin/ml/preguntas',
		icon: MessageCircle,
		label: 'Preguntas de compradores',
		description: 'Responde preguntas pendientes directamente desde el admin.',
		color: 'text-orange-400',
	},
	{
		href: '/admin/ml/precios',
		icon: TrendingDown,
		label: 'Monitor de precios',
		description: 'Vigila competidores y recibe alertas cuando bajen el precio.',
		color: 'text-red-400',
	},
];

export default function MLDashboardPage() {
	const [user, setUser] = useState<MLUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const searchParams = useSearchParams();
	const oauthError = searchParams?.get('ml_error') ?? null;
	const justConnected = searchParams?.get('connected') === '1';

	const loadUser = async () => {
		setLoading(true);
		setError(null);
		try {
			// Use the items endpoint to validate token + get seller info.
			const res = await fetch('/api/admin/ml/items?limit=1');
			const json = await res.json() as { ok?: boolean; seller?: MLUser; error?: string };
			if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
			setUser(json.seller ?? null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Error al conectar con ML.');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { void loadUser(); }, []);

	return (
		<AdminPage>
			<AdminPageHeader
				eyebrow="Integraciones · MercadoLibre"
				title="Centro ML"
				description="Gestiona tus publicaciones, pedidos, preguntas y precios desde un solo lugar."
			/>

			{/* OAuth flow feedback (from /api/admin/ml/oauth/callback redirects) */}
			{oauthError && (
				<div className="mb-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
					<AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
					<div>
						<p className="font-semibold">No se pudo completar la conexión con Mercado Libre.</p>
						<p className="mt-1 font-mono text-xs text-red-200/80">{oauthError}</p>
					</div>
				</div>
			)}
			{justConnected && !error && (
				<div className="mb-4 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-300">
					<CheckCircle2 className="h-4 w-4" />
					<span>Cuenta de Mercado Libre vinculada correctamente.</span>
				</div>
			)}

			{/* Connection status */}
			<div className="mb-8 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
				{loading ? (
					<Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
				) : error ? (
					<AlertTriangle className="h-4 w-4 text-red-400" />
				) : (
					<CheckCircle2 className="h-4 w-4 text-green-400" />
				)}
				<div className="flex-1 text-sm">
					{loading && <span className="text-zinc-400">Verificando conexión con ML…</span>}
					{error && (
						<span className="text-red-300">
							Error de conexión: <span className="font-mono text-xs">{error}</span>
						</span>
					)}
					{!loading && !error && user && (
						<span className="text-zinc-200">
							Conectado como{' '}
							<a
								href={`https://www.mercadolibre.cl/perfil/${user.nickname}`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 font-semibold text-yellow-400 hover:underline"
							>
								{user.nickname}
								<ExternalLink className="h-3 w-3" />
							</a>
							{user.seller_reputation?.level_id && (
								<span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
									{user.seller_reputation.level_id}
								</span>
							)}
						</span>
					)}
				</div>
				{/* The "Conectar" button starts the OAuth flow. We show it always so
				    the operator can re-link a different seller account, and prominently
				    when there's no working token. */}
				<a
					href="/api/admin/ml/oauth/start"
					className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
						error
							? 'bg-yellow-400 text-zinc-950 hover:bg-yellow-300'
							: 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:text-white'
					}`}
				>
					<LinkIcon className="h-3.5 w-3.5" />
					{error ? 'Conectar con Mercado Libre' : 'Reconectar'}
				</a>
				<button
					onClick={() => void loadUser()}
					disabled={loading}
					className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
					aria-label="Reverificar"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
				</button>
			</div>

			{/* Section cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{SECTIONS.map((s) => {
					const Icon = s.icon;
					return (
						<Link
							key={s.href}
							href={s.href}
							className="group flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
						>
							<span className={`mt-0.5 ${s.color}`}>
								<Icon className="h-5 w-5" />
							</span>
							<div>
								<p className="font-semibold text-white group-hover:text-yellow-300 transition">
									{s.label}
								</p>
								<p className="mt-1 text-sm text-zinc-400">{s.description}</p>
							</div>
						</Link>
					);
				})}
			</div>

			{/* Quick tip */}
			<div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-300">
				<Tag className="mb-1 inline h-4 w-4 mr-1" />
				<strong>Tip:</strong> Para importar un producto puntual desde ML (sin tener cuenta de vendedor),
				usa{' '}
				<Link href="/admin/productos/importar" className="underline hover:text-blue-200">
					Importar por URL
				</Link>{' '}
				en el módulo de Productos.
			</div>
		</AdminPage>
	);
}
