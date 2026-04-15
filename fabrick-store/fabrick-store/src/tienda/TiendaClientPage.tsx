'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import {
	ShoppingCart,
	Bell,
	X,
	Heart,
	ShoppingBag,
	ArrowLeft,
	Zap,
	Ruler,
	Clock,
	Trash2,
	CheckCircle,
	Sparkles,
	Instagram,
	Facebook,
	Home,
	LayoutGrid,
	Award,
	User,
	Settings,
	AlertCircle,
	Star,
	Package,
} from 'lucide-react';

const CART_KEY = 'fabrick.tienda.cart.v2';
const FAV_KEY = 'fabrick.tienda.fav.v1';

type Product = {
	id: string;
	name: string;
	price: number;
	category: string;
	tagline: string;
	description: string;
	features: string[];
	dimensions: string;
	delivery: string;
	img: string;
	rating?: number;
};

const STATIC_PRODUCTS: Product[] = [
	{
		id: 'FBK-01',
		name: 'Cerradura Biométrica Titanio',
		price: 189900,
		category: 'Seguridad',
		tagline: 'Tu familia, siempre segura',
		description:
			'Diseñada para brindar tranquilidad absoluta. Un sistema de reconocimiento intuitivo que protege lo que más quieres con la resistencia del titanio.',
		features: ['Sensor de alta precisión', 'Apertura de emergencia', 'Gestión desde tu móvil'],
		dimensions: '35 × 7 × 4 cm',
		delivery: 'Entrega inmediata',
		img: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop',
		rating: 4.9,
	},
	{
		id: 'FBK-02',
		name: 'Luz LED Arquitectónica',
		price: 85500,
		category: 'Iluminación',
		tagline: 'El alma de tu espacio',
		description:
			'Crea ambientes acogedores con nuestra iluminación adaptativa. Una luz que se ajusta a tu ritmo de vida y resalta la belleza de tu hogar.',
		features: ['Luz cálida relajante', 'Control por WiFi', 'Bajo consumo energético'],
		dimensions: '120 × 2 × 2 cm',
		delivery: 'Envío en 24 h',
		img: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop',
		rating: 4.8,
	},
	{
		id: 'FBK-03',
		name: 'Grifería Monomando Ónix',
		price: 145000,
		category: 'Grifería',
		tagline: 'Detalles que enamoran',
		description:
			'La combinación perfecta entre suavidad y durabilidad. Un diseño pensado para el uso diario que mantiene su elegancia intacta por años.',
		features: ['Tacto sedoso', 'Fácil limpieza', 'Garantía extendida'],
		dimensions: '32 × 22 cm',
		delivery: 'Entrega inmediata',
		img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
		rating: 4.7,
	},
	{
		id: 'FBK-04',
		name: 'Panel Acústico Roble',
		price: 42900,
		category: 'Revestimiento',
		tagline: 'Tu refugio de paz',
		description:
			'Disfruta del silencio y la calidez de la madera real. Un revestimiento que transforma cualquier habitación en un espacio de descanso total.',
		features: ['Aislamiento acústico premium', 'Madera natural certificada', 'Instalación sencilla'],
		dimensions: '240 × 60 cm',
		delivery: 'Envío en 48 h',
		img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
		rating: 4.6,
	},
	{
		id: 'FBK-05',
		name: 'Ventana Termopanel Pro',
		price: 320000,
		category: 'Ventanas',
		tagline: 'Confort sin compromisos',
		description:
			'Doble acristalamiento de alta eficiencia térmica y acústica. Diseño elegante que complementa cualquier estilo arquitectónico.',
		features: ['Doble vidrio hermético', 'Perfil de aluminio anodizado', 'Certificación energética A'],
		dimensions: '100 × 120 cm',
		delivery: 'Fabricación en 5 días',
		img: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=800&auto=format&fit=crop',
		rating: 4.9,
	},
	{
		id: 'FBK-06',
		name: 'Piso Porcelanato Mármol',
		price: 38500,
		category: 'Pisos',
		tagline: 'Elegancia bajo tus pies',
		description:
			'Porcelanato de primera calidad con acabado mármol natural. Resistente, fácil de mantener y de una belleza atemporal.',
		features: ['Alta resistencia a rayones', 'Efecto mármol auténtico', 'Apto para calefacción radiante'],
		dimensions: '60 × 60 cm / m²',
		delivery: 'Stock disponible',
		img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=800&auto=format&fit=crop',
		rating: 4.8,
	},
];

type Notification = { id: string; message: string; time: string; read: boolean; icon: 'cart' | 'fav' | 'info' };

// ── Pill Button ────────────────────────────────────────────────
function PillButton({
	children,
	onClick,
	variant = 'gold',
	className = '',
	disabled = false,
}: {
	children: React.ReactNode;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	variant?: 'gold' | 'outline' | 'ghost' | 'danger' | 'white';
	className?: string;
	disabled?: boolean;
}) {
	const variants: Record<string, string> = {
		gold: 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black hover:from-yellow-300 hover:to-yellow-400 shadow-[0_4px_20px_rgba(250,204,21,0.35)] hover:shadow-[0_6px_30px_rgba(250,204,21,0.55)]',
		outline: 'bg-transparent border-2 border-yellow-400/60 text-yellow-400 font-bold hover:bg-yellow-400/10 hover:border-yellow-400',
		ghost: 'bg-white/5 border border-white/10 text-white/80 font-medium hover:bg-white/10 hover:text-white',
		danger: 'bg-transparent border border-red-500/40 text-red-400 font-medium hover:bg-red-500/10',
		white: 'bg-white text-black font-black hover:bg-yellow-50 shadow-md',
	};

	return (
		<button
			onClick={onClick}
			disabled={disabled}
			className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[11px] uppercase tracking-[0.3em] transition-all duration-300 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
		>
			{children}
		</button>
	);
}

// ── FabrickLogo ────────────────────────────────────────────────
function FabrickLogo({ className = '', size = 'sm', onClick }: { className?: string; size?: 'sm' | 'md'; onClick?: () => void }) {
	const h = size === 'md' ? 'h-14' : 'h-10';
	return (
		<div onClick={onClick} className={`select-none cursor-pointer ${className}`}>
			<img src="/logo-soluciones-fabrick.svg" alt="Soluciones Fabrick" className={`${h} w-auto object-contain`} />
		</div>
	);
}

// ── Star Rating ────────────────────────────────────────────────
function StarRating({ value }: { value: number }) {
	return (
		<div className="flex items-center gap-1">
			{[1, 2, 3, 4, 5].map((s) => (
				<Star
					key={s}
					size={11}
					className={s <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700 fill-zinc-700'}
				/>
			))}
			<span className="text-[10px] text-zinc-500 ml-1 font-mono">{value.toFixed(1)}</span>
		</div>
	);
}

// ── Product Card ────────────────────────────────────────────────
function ProductCard({
	product,
	isFav,
	onFavToggle,
	onOpen,
	onAddToCart,
}: {
	product: Product;
	isFav: boolean;
	onFavToggle: (p: Product) => void;
	onOpen: (p: Product) => void;
	onAddToCart: (p: Product) => void;
}) {
	return (
		<div className="group flex flex-col bg-zinc-950 border border-white/6 rounded-3xl overflow-hidden shadow-xl hover:border-yellow-400/30 hover:shadow-[0_0_40px_rgba(250,204,21,0.1)] transition-all duration-500">
			{/* Image */}
			<div
				className="relative aspect-[4/3] overflow-hidden cursor-pointer"
				onClick={() => onOpen(product)}
			>
				<img
					src={product.img}
					alt={product.name}
					className="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

				{/* Category badge */}
				<span className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 text-yellow-400 text-[9px] uppercase tracking-[0.3em] font-bold px-3 py-1.5 rounded-full">
					{product.category}
				</span>

				{/* Fav button */}
				<button
					onClick={(e) => { e.stopPropagation(); onFavToggle(product); }}
					className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-300 ${
						isFav
							? 'bg-red-500/20 border-red-400/40 text-red-400'
							: 'bg-black/50 border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-400/30'
					}`}
				>
					<Heart size={14} className={isFav ? 'fill-red-400' : ''} />
				</button>

				{/* Quick add overlay */}
				<div className="absolute bottom-4 left-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-400">
					<button
						onClick={(e) => { e.stopPropagation(); onOpen(product); }}
						className="flex-1 bg-black/80 backdrop-blur-md border border-white/10 text-white text-[10px] uppercase tracking-[0.25em] font-semibold py-2.5 rounded-2xl hover:bg-white/10 transition-colors"
					>
						Ver detalle
					</button>
					<button
						onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
						className="flex-1 bg-yellow-400 text-black text-[10px] uppercase tracking-[0.25em] font-black py-2.5 rounded-2xl hover:bg-yellow-300 transition-colors"
					>
						Añadir
					</button>
				</div>
			</div>

			{/* Info */}
			<div className="p-5 flex flex-col gap-3 flex-1">
				<div>
					<p className="text-[9px] text-zinc-500 uppercase tracking-[0.3em] mb-1">{product.tagline}</p>
					<h3 className="text-white font-bold text-sm leading-snug">{product.name}</h3>
				</div>
				{product.rating && <StarRating value={product.rating} />}
				<div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
					<span className="font-mono font-bold text-white text-base">${product.price.toLocaleString('es-CL')}</span>
					<PillButton variant="outline" onClick={() => onOpen(product)} className="!px-4 !py-2 !text-[9px]">
						Detalle
					</PillButton>
				</div>
			</div>
		</div>
	);
}

// ── Product Detail Modal ────────────────────────────────────────
function ProductModal({
	product,
	isFav,
	isInCart,
	onClose,
	onAddToCart,
	onFavToggle,
}: {
	product: Product;
	isFav: boolean;
	isInCart: boolean;
	onClose: () => void;
	onAddToCart: (p: Product) => void;
	onFavToggle: (p: Product) => void;
}) {
	return (
		<div className="fixed inset-0 z-[200] flex items-stretch md:items-center justify-center p-0 md:p-8 overflow-hidden cinematic-overlay">
			<div className="relative w-full h-full md:max-w-4xl md:max-h-[90dvh] bg-zinc-950 md:rounded-[2.5rem] border border-white/8 shadow-2xl flex flex-col overflow-hidden cinematic-panel-enter">
				{/* Close */}
				<button
					onClick={onClose}
					className="absolute top-5 right-5 z-20 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
				>
					<X size={18} />
				</button>

				<div className="flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
					{/* Image */}
					<div className="relative md:w-2/5 h-72 md:h-full flex-shrink-0">
						<img src={product.img} alt={product.name} className="w-full h-full object-cover" />
						<div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent" />
					</div>

					{/* Content */}
					<div className="flex-1 flex flex-col p-8 md:p-10 overflow-y-auto gap-6">
						{/* Header */}
						<div>
							<span className="text-yellow-400 text-[9px] uppercase tracking-[0.5em] font-bold">{product.category}</span>
							<h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white mt-2 leading-none">{product.name}</h2>
							<p className="text-zinc-400 italic text-sm mt-2">"{product.tagline}"</p>
							{product.rating && <div className="mt-3"><StarRating value={product.rating} /></div>}
						</div>

						{/* Description */}
						<p className="text-zinc-300 text-sm leading-relaxed">{product.description}</p>

						{/* Features */}
						<div className="grid grid-cols-1 gap-3">
							{product.features.map((f) => (
								<div key={f} className="flex items-center gap-3 text-[11px] text-zinc-300 uppercase tracking-[0.2em]">
									<Zap size={13} className="text-yellow-400 flex-shrink-0" />
									{f}
								</div>
							))}
						</div>

						{/* Specs */}
						<div className="flex gap-8 py-4 border-y border-white/8 text-[10px] uppercase tracking-[0.3em] text-zinc-500">
							<div className="flex items-center gap-2">
								<Ruler size={13} className="text-yellow-400/60" />
								<span>{product.dimensions}</span>
							</div>
							<div className="flex items-center gap-2">
								<Clock size={13} className="text-yellow-400/60" />
								<span>{product.delivery}</span>
							</div>
						</div>

						{/* Price */}
						<p className="text-4xl font-black font-mono text-white">
							${product.price.toLocaleString('es-CL')}
						</p>

						{/* Actions */}
						<div className="flex flex-col gap-3 mt-auto">
							<PillButton
								variant="gold"
								onClick={() => { onAddToCart(product); }}
								className="w-full !py-4"
							>
								<ShoppingCart size={15} />
								{isInCart ? 'Agregar otro' : 'Añadir al carrito'}
							</PillButton>
							<div className="flex gap-3">
								<PillButton variant="outline" onClick={onClose} className="flex-1 !py-3">
									<ShoppingBag size={13} />
									Seguir comprando
								</PillButton>
								<PillButton
									variant={isFav ? 'danger' : 'ghost'}
									onClick={() => onFavToggle(product)}
									className="flex-1 !py-3"
								>
									<Heart size={13} className={isFav ? 'fill-red-400' : ''} />
									{isFav ? 'Guardado' : 'Favorito'}
								</PillButton>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Cart Drawer ────────────────────────────────────────────────
function CartDrawer({
	cart,
	onClose,
	onRemove,
	onCheckout,
}: {
	cart: Product[];
	onClose: () => void;
	onRemove: (idx: number) => void;
	onCheckout: (p?: Product) => void;
}) {
	const total = cart.reduce((s, p) => s + p.price, 0);

	return (
		<div className="fixed inset-0 z-[300] flex justify-end">
			<div className="absolute inset-0 cinematic-overlay" onClick={onClose} />
			<div className="relative w-full max-w-sm h-full bg-zinc-950 border-l border-white/8 flex flex-col shadow-2xl cinematic-panel-enter overflow-hidden">
				<div className="p-6 border-b border-white/8 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<ShoppingCart size={18} className="text-yellow-400" />
						<span className="font-black uppercase tracking-widest text-sm">Carrito ({cart.length})</span>
					</div>
					<button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
						<X size={20} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-4">
					{cart.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
							<ShoppingCart size={60} />
							<p className="text-sm uppercase tracking-[0.3em]">Carrito vacío</p>
						</div>
					) : (
						cart.map((item, idx) => (
							<div key={`${item.id}-${idx}`} className="flex items-center gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
								<img src={item.img} alt={item.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
								<div className="flex-1 min-w-0">
									<p className="font-bold text-xs text-white leading-snug truncate">{item.name}</p>
									<p className="text-yellow-400 font-mono text-sm mt-1">${item.price.toLocaleString('es-CL')}</p>
								</div>
								<button onClick={() => onRemove(idx)} className="text-zinc-700 hover:text-red-400 transition-colors p-1 flex-shrink-0">
									<Trash2 size={16} />
								</button>
							</div>
						))
					)}
				</div>

				{cart.length > 0 && (
					<div className="p-6 border-t border-white/8 space-y-4 bg-black/60">
						<div className="flex justify-between items-center">
							<span className="text-zinc-500 text-xs uppercase tracking-widest">Total</span>
							<span className="font-mono font-black text-xl text-white">${total.toLocaleString('es-CL')}</span>
						</div>
						<PillButton variant="gold" onClick={() => onCheckout()} className="w-full !py-4">
							<Package size={14} />
							Solicitar Pedido
						</PillButton>
					</div>
				)}
			</div>
		</div>
	);
}

// ── Notifications Panel ────────────────────────────────────────
function NotificationsPanel({ notifications, onClose, onMarkAllRead }: {
	notifications: Notification[];
	onClose: () => void;
	onMarkAllRead: () => void;
}) {
	const icons = { cart: ShoppingCart, fav: Heart, info: Sparkles };
	return (
		<div className="fixed inset-0 z-[300] flex justify-end">
			<div className="absolute inset-0" onClick={onClose} />
			<div className="relative w-full max-w-xs h-full bg-zinc-950 border-l border-white/8 flex flex-col shadow-2xl cinematic-panel-enter overflow-hidden">
				<div className="p-6 border-b border-white/8 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Bell size={16} className="text-yellow-400" />
						<span className="font-black uppercase tracking-widest text-sm">Notificaciones</span>
					</div>
					<button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
						<X size={20} />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto p-4 space-y-3">
					{notifications.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center gap-3 opacity-20">
							<Bell size={48} />
							<p className="text-xs uppercase tracking-[0.3em]">Sin notificaciones</p>
						</div>
					) : (
						notifications.map((n) => {
							const Icon = icons[n.icon];
							return (
								<div key={n.id} className={`flex items-start gap-3 p-4 rounded-2xl border transition-colors ${n.read ? 'bg-black/20 border-white/4 opacity-60' : 'bg-black/50 border-yellow-400/15'}`}>
									<div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.icon === 'cart' ? 'bg-yellow-400/15' : n.icon === 'fav' ? 'bg-red-400/15' : 'bg-blue-400/15'}`}>
										<Icon size={13} className={n.icon === 'cart' ? 'text-yellow-400' : n.icon === 'fav' ? 'text-red-400' : 'text-blue-400'} />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-xs text-white leading-snug">{n.message}</p>
										<p className="text-[9px] text-zinc-600 mt-1">{n.time}</p>
									</div>
								</div>
							);
						})
					)}
				</div>
				{notifications.some(n => !n.read) && (
					<div className="p-4 border-t border-white/8">
						<PillButton variant="ghost" onClick={onMarkAllRead} className="w-full !py-2.5">
							<CheckCircle size={13} />
							Marcar todo como leído
						</PillButton>
					</div>
				)}
			</div>
		</div>
	);
}

const MENU_OPTS = [
	{ icon: Home, label: 'Inicio' },
	{ icon: LayoutGrid, label: 'Ver Catálogo' },
	{ icon: Award, label: 'Garantías' },
	{ icon: User, label: 'Mi Cuenta' },
	{ icon: Settings, label: 'Ajustes' },
];

// ── Main Component ────────────────────────────────────────────
export default function TiendaClientPage() {
	const router = useRouter();
	const { products: dbProducts, loading: productsLoading, connected: realtimeConnected } = useRealtimeProducts();

	// State
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [cart, setCart] = useState<Product[]>([]);
	const [favorites, setFavorites] = useState<string[]>([]);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [isNotifOpen, setIsNotifOpen] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [activeMenuIndex, setActiveMenuIndex] = useState(0);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [toast, setToast] = useState<{ msg: string; visible: boolean }>({ msg: '', visible: false });
	const cartIconRef = useRef<HTMLDivElement>(null);
	const gsapRef = useRef<null | typeof import('gsap').default>(null);

	const showToast = useCallback((msg: string) => {
		setToast({ msg, visible: true });
		setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2400);
	}, []);

	const addNotification = useCallback((message: string, icon: Notification['icon']) => {
		const n: Notification = {
			id: `${Date.now()}-${Math.random()}`,
			message,
			time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
			read: false,
			icon,
		};
		setNotifications((prev) => [n, ...prev].slice(0, 20));
	}, []);

	// Persist cart & favorites
	useEffect(() => {
		try {
			const raw = localStorage.getItem(CART_KEY);
			if (raw) setCart(JSON.parse(raw) as Product[]);
		} catch { /* ignore */ }
		try {
			const raw = localStorage.getItem(FAV_KEY);
			if (raw) setFavorites(JSON.parse(raw) as string[]);
		} catch { /* ignore */ }
	}, []);

	useEffect(() => {
		try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* ignore */ }
	}, [cart]);

	useEffect(() => {
		try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch { /* ignore */ }
	}, [favorites]);

	// GSAP load
	useEffect(() => {
		let mounted = true;
		(async () => {
			const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
			gsap.registerPlugin(ScrollTrigger);
			if (mounted) gsapRef.current = gsap;
		})();
		return () => { mounted = false; };
	}, []);

	// Live products
	const liveProducts: Product[] = useMemo(() => {
		if (!dbProducts.length) return STATIC_PRODUCTS;
		return dbProducts.map((p) => ({
			id: p.id,
			name: p.name,
			price: p.price,
			category: p.category_id || 'General',
			tagline: p.delivery_days ? `Entrega en ${p.delivery_days}` : 'Calidad profesional',
			description: p.description || 'Producto de alta calidad Fabrick.',
			features: ['Calidad garantizada', p.stock != null ? `Stock: ${p.stock}` : 'Disponible', p.featured ? 'Producto destacado' : 'Premium'],
			dimensions: 'Ver ficha técnica',
			delivery: p.delivery_days || 'A coordinar',
			img: p.image_url || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop',
			rating: p.rating ?? 4.5,
		}));
	}, [dbProducts]);

	const cartCount = cart.length;
	const unreadCount = notifications.filter((n) => !n.read).length;
	const isInCart = (p: Product) => cart.some((c) => c.id === p.id);
	const isFav = (p: Product) => favorites.includes(p.id);

	const handleAddToCart = useCallback((product: Product) => {
		setCart((prev) => [...prev, product]);
		showToast(`"${product.name}" añadido al carrito`);
		addNotification(`Añadiste "${product.name}" al carrito.`, 'cart');
	}, [showToast, addNotification]);

	const handleFavToggle = useCallback((product: Product) => {
		setFavorites((prev) => {
			const has = prev.includes(product.id);
			const next = has ? prev.filter((id) => id !== product.id) : [...prev, product.id];
			if (!has) {
				showToast(`"${product.name}" guardado en favoritos`);
				addNotification(`Guardaste "${product.name}" en favoritos.`, 'fav');
			}
			return next;
		});
	}, [showToast, addNotification]);

	const goToCheckout = useCallback((product?: Product) => {
		const target = product ?? cart[0];
		if (!target) { router.push('/checkout'); return; }
		const params = new URLSearchParams({ productId: target.id, name: target.name, price: String(target.price), category: target.category, img: target.img });
		router.push(`/checkout?${params.toString()}`);
	}, [cart, router]);

	const handleMenuAction = useCallback((label: string) => {
		setIsMenuOpen(false);
		if (label === 'Inicio') router.push('/');
		if (label === 'Ver Catálogo') { setSelectedProduct(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }
		if (label === 'Garantías') router.push('/soluciones');
		if (label === 'Mi Cuenta') router.push('/mi-cuenta');
		if (label === 'Ajustes') router.push('/ajustes');
	}, [router]);

	return (
		<div className="bg-black text-white min-h-[100dvh] font-sans selection:bg-yellow-400 selection:text-black overflow-x-hidden relative">
			<style>{`
				.scrollbar-hide::-webkit-scrollbar { display: none; }
				.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
			`}</style>

			{/* ── Toast ── */}
			<div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9000] transition-all duration-500 ${toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
				<div className="flex items-center gap-3 bg-zinc-900 border border-yellow-400/30 text-white text-xs px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md">
					<CheckCircle size={14} className="text-yellow-400 flex-shrink-0" />
					{toast.msg}
				</div>
			</div>

			{/* ── Navbar ── */}
			<nav className="fixed top-0 left-0 w-full z-[100] bg-black/10 backdrop-blur-2xl border-b border-white/5 py-4 px-5 md:px-10 flex justify-between items-center">
				<FabrickLogo onClick={() => selectedProduct ? setShowExitConfirm(true) : router.push('/')} />

				<div className="flex items-center gap-3">
					{/* Realtime indicator */}
					<span className={`hidden md:inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] ${realtimeConnected ? 'text-emerald-400' : 'text-zinc-600'}`}>
						<span className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'}`} />
						{realtimeConnected ? 'En vivo' : 'Conectando'}
					</span>

					{/* Favorites count */}
					{favorites.length > 0 && (
						<div className="relative cursor-pointer p-2" onClick={() => setIsMenuOpen(true)}>
							<Heart size={20} className="text-red-400/70" />
							<span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[8px] font-black">
								{favorites.length}
							</span>
						</div>
					)}

					{/* Notifications */}
					<button
						className="relative p-2 text-zinc-500 hover:text-white transition-colors"
						onClick={() => setIsNotifOpen(true)}
					>
						<Bell size={20} />
						{unreadCount > 0 && (
							<span className="absolute top-0.5 right-0.5 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[8px] font-black shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-bounce">
								{unreadCount}
							</span>
						)}
					</button>

					{/* Cart */}
					<div ref={cartIconRef} className="relative cursor-pointer p-2" onClick={() => setIsCartOpen(true)}>
						<ShoppingCart size={22} className="text-white/70" />
						<span className={`absolute top-0 right-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black shadow-[0_0_12px_rgba(250,204,21,0.5)] transition-all ${cartCount > 0 ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-zinc-400'}`}>
							{cartCount}
						</span>
					</div>

					{/* Menu */}
					<button onClick={() => setIsMenuOpen(true)} className="p-2 text-zinc-500 hover:text-white transition-colors">
						<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
							<line x1="4" y1="7" x2="20" y2="7"/>
							<line x1="4" y1="12" x2="20" y2="12"/>
							<line x1="4" y1="17" x2="20" y2="17"/>
						</svg>
					</button>
				</div>
			</nav>

			{/* ── Hero section ── */}
			<section className="relative h-[100dvh] flex flex-col items-center justify-center text-center px-6 overflow-hidden">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.07)_0%,transparent_60%)] pointer-events-none" />
				<img
					src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop"
					className="absolute inset-0 w-full h-full object-cover opacity-15 grayscale-[0.3]"
					alt=""
				/>
				<div className="relative z-10 max-w-4xl mx-auto space-y-8">
					<div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-yellow-400/20 bg-black/50 backdrop-blur-md">
						<Sparkles size={12} className="text-yellow-400 animate-pulse" />
						<span className="text-yellow-400 font-black tracking-[0.5em] text-[9px] uppercase">Boutique Fabrick</span>
					</div>
					<h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] text-white">
						Materiales<br />
						<span className="text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.5)' }}>
							de Élite.
						</span>
					</h1>
					<p className="text-zinc-400 text-sm md:text-lg font-light max-w-xl mx-auto leading-relaxed tracking-wide">
						Cada producto pensado para elevar tu hogar — ingeniería precisa, materiales nobles y calidad real.
					</p>
					<PillButton
						variant="gold"
						onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
						className="!px-10 !py-4 !text-sm"
					>
						Explorar Catálogo
					</PillButton>
				</div>
			</section>

			{/* ── Products grid ── */}
			<main className="max-w-7xl mx-auto px-5 md:px-10 pb-40 relative z-10">
				{/* Status bar */}
				<div className="flex items-center justify-between py-6 border-b border-white/5 mb-10">
					<p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
						{productsLoading ? 'Cargando...' : `${liveProducts.length} productos`}
					</p>
					<div className="flex items-center gap-2">
						{favorites.length > 0 && (
							<span className="text-[9px] text-red-400 uppercase tracking-widest">
								{favorites.length} favorito{favorites.length !== 1 ? 's' : ''}
							</span>
						)}
					</div>
				</div>

				{/* Grid */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
					{liveProducts.map((p) => (
						<ProductCard
							key={p.id}
							product={p}
							isFav={isFav(p)}
							onFavToggle={handleFavToggle}
							onOpen={setSelectedProduct}
							onAddToCart={handleAddToCart}
						/>
					))}
				</div>
			</main>

			{/* ── Product Detail Modal ── */}
			{selectedProduct && (
				<ProductModal
					product={selectedProduct}
					isFav={isFav(selectedProduct)}
					isInCart={isInCart(selectedProduct)}
					onClose={() => setSelectedProduct(null)}
					onAddToCart={(p) => { handleAddToCart(p); }}
					onFavToggle={handleFavToggle}
				/>
			)}

			{/* ── Cart Drawer ── */}
			{isCartOpen && (
				<CartDrawer
					cart={cart}
					onClose={() => setIsCartOpen(false)}
					onRemove={(idx) => setCart((prev) => prev.filter((_, i) => i !== idx))}
					onCheckout={goToCheckout}
				/>
			)}

			{/* ── Notifications Panel ── */}
			{isNotifOpen && (
				<NotificationsPanel
					notifications={notifications}
					onClose={() => setIsNotifOpen(false)}
					onMarkAllRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
				/>
			)}

			{/* ── Side Menu ── */}
			{isMenuOpen && (
				<div className="fixed inset-0 z-[250] flex justify-end">
					<div className="absolute inset-0 cinematic-overlay" onClick={() => setIsMenuOpen(false)} />
					<div className="relative w-full max-w-[280px] bg-zinc-950 border-l border-white/5 h-full p-8 flex flex-col shadow-2xl cinematic-panel-enter">
						<FabrickLogo size="md" className="mb-12 self-center" />
						<nav className="flex-1 flex flex-col gap-1">
							{MENU_OPTS.map((item, i) => (
								<button
									key={item.label}
									onMouseEnter={() => setActiveMenuIndex(i)}
									onClick={() => handleMenuAction(item.label)}
									className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 text-left ${
										activeMenuIndex === i
											? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
											: 'text-zinc-500 hover:text-white hover:bg-white/5'
									}`}
								>
									<item.icon size={16} />
									<span className="text-xs font-bold uppercase tracking-[0.3em]">{item.label}</span>
								</button>
							))}
						</nav>
						<button onClick={() => setIsMenuOpen(false)} className="mt-6 text-zinc-700 hover:text-white uppercase text-[8px] font-black tracking-[0.8em] py-3 transition-colors self-center">
							Cerrar
						</button>
					</div>
				</div>
			)}

			{/* ── Exit Confirm ── */}
			{showExitConfirm && (
				<div className="fixed inset-0 z-[500] cinematic-overlay flex items-center justify-center p-6">
					<div className="bg-zinc-950 border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full text-center space-y-6 shadow-2xl cinematic-panel-enter">
						<AlertCircle className="w-14 h-14 text-yellow-400 mx-auto animate-pulse" />
						<div className="space-y-1">
							<h3 className="text-lg font-black uppercase tracking-widest text-white">¿Regresar al Inicio?</h3>
							<p className="text-zinc-600 text-[9px] uppercase tracking-widest">Tu carrito se mantendrá guardado.</p>
						</div>
						<div className="flex flex-col gap-3">
							<PillButton
								variant="gold"
								onClick={() => { setSelectedProduct(null); setShowExitConfirm(false); router.push('/'); }}
								className="w-full !py-4"
							>
								Confirmar
							</PillButton>
							<PillButton variant="ghost" onClick={() => setShowExitConfirm(false)} className="w-full !py-3">
								Cancelar
							</PillButton>
						</div>
					</div>
				</div>
			)}

			{/* ── Footer ── */}
			<footer className="py-20 border-t border-white/5 flex flex-col items-center gap-8 bg-black relative z-10">
				<FabrickLogo size="md" />
				<div className="flex gap-8 items-center">
					<Instagram size={18} className="text-zinc-700 hover:text-yellow-400 transition-all cursor-pointer hover:scale-125" />
					<Facebook size={18} className="text-zinc-700 hover:text-yellow-400 transition-all cursor-pointer hover:scale-125" />
				</div>
				<p className="text-[7px] text-zinc-800 uppercase tracking-[1em]">© 2026 Soluciones Fabrick · Ingeniería para tu Vida</p>
			</footer>
		</div>
	);
}
