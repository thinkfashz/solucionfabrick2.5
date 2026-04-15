'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import FabrickLogo from '@/components/FabrickLogo';
import {
	ShoppingBag,
	Menu,
	X,
	Zap,
	Instagram,
	Facebook,
	User,
	Settings,
	Home as HomeIcon,
	LayoutGrid,
	Trash2,
	Sparkles,
	Clock,
	Ruler,
	AlertCircle,
	Bell,
	MessageCircle,
	MapPin,
	Search,
	Star,
	Heart,
} from 'lucide-react';

const CART_CACHE_KEY = 'fabrick.tienda.cart.v1';
const FAVORITES_KEY = 'fabrick.tienda.favorites.v1';

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
};

const PRODUCTS: Product[] = [
	{
		id: 'FBK-01',
		name: 'Cerradura Biométrica Titanio',
		price: 189900,
		category: 'Seguridad',
		tagline: 'Tu familia, siempre segura',
		description:
			'Diseñada para brindar tranquilidad absoluta. Un sistema de reconocimiento intuitivo que protege lo que más quieres con la resistencia del titanio.',
		features: ['Sensor de alta precisión', 'Apertura de emergencia', 'Gestión desde tu móvil'],
		dimensions: '35 x 7 x 4 cm',
		delivery: 'Entrega inmediata',
		img: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=800&auto=format&fit=crop',
	},
	{
		id: 'FBK-02',
		name: 'Luz LED Arquitectónica',
		price: 85500,
		category: 'Iluminación',
		tagline: 'El alma de tu espacio',
		description:
			'Crea ambientes acogedores con nuestra iluminación adaptativa. Una luz que se ajusta a tu ritmo de vida y resalta la belleza de tu hogar.',
		features: ['Luz cálida relajante', 'Control por WiFi', 'Bajo consumo'],
		dimensions: '120 x 2 x 2 cm',
		delivery: 'Envío en 24h',
		img: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5e8a?q=80&w=800&auto=format&fit=crop',
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
		dimensions: '32 x 22 cm',
		delivery: 'Entrega inmediata',
		img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop',
	},
	{
		id: 'FBK-04',
		name: 'Panel Acústico Roble',
		price: 42900,
		category: 'Revestimiento',
		tagline: 'Tu refugio de paz',
		description:
			'Disfruta del silencio y la calidez de la madera real. Un revestimiento que transforma cualquier habitación en un espacio de descanso total.',
		features: ['Aislamiento acústico', 'Madera natural', 'Fácil instalación'],
		dimensions: '240 x 60 cm',
		delivery: 'Envío en 48h',
		img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?q=80&w=800&auto=format&fit=crop',
	},
];

const MENU_OPTIONS = [
	{ icon: HomeIcon, label: 'Inicio' },
	{ icon: LayoutGrid, label: 'Ver Catálogo' },
	{ icon: Heart, label: 'Favoritos' },
	{ icon: User, label: 'Mi Cuenta' },
	{ icon: Settings, label: 'Ajustes' },
];

const CATEGORIES = ['Todos', 'Seguridad', 'Iluminación', 'Grifería', 'Revestimiento', 'Premium', 'Destacados'];

function SilverGoldButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: React.MouseEventHandler<HTMLButtonElement>; className?: string }) {
	return (
		<button
			onClick={onClick}
			className={`group relative py-3 px-8 md:py-4 md:px-12 rounded-full font-black uppercase text-[8px] md:text-[10px] tracking-[0.4em] overflow-hidden transition-all duration-700 hover:scale-[1.05] active:scale-95 shadow-2xl border border-yellow-400/40 ${className}`}
			style={{ background: 'linear-gradient(135deg, #f3f4f6 0%, #d1d5db 50%, #9ca3af 100%)', color: '#000' }}
		>
			<div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-200/40 to-yellow-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
			<span className="relative z-10 mix-blend-multiply">{children}</span>
			<div className="absolute top-0 -left-full w-1/2 h-full bg-white/40 skew-x-[-25deg] group-hover:left-[150%] transition-all duration-1000 ease-in-out" />
		</button>
	);
}

export default function TiendaClientPage() {
	const router = useRouter();
	const { products: dbProducts, loading: productsLoading, connected: realtimeConnected } = useRealtimeProducts();
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [cart, setCart] = useState<Product[]>([]);
	const [favorites, setFavorites] = useState<Product[]>([]);
	const [gsapReady, setGsapReady] = useState(false);
	const [headerVisible, setHeaderVisible] = useState(true);
	const [navVisible, setNavVisible] = useState(true);

	const cartIconRef = useRef<HTMLDivElement>(null);
	const gsapRef = useRef<null | typeof import('gsap').default>(null);
	const lastScrollYRef = useRef(0);

	const liveProducts: Product[] = useMemo(() => {
		if (!dbProducts.length) return PRODUCTS;
		return dbProducts.map((p) => ({
			id: p.id,
			name: p.name,
			price: p.price,
			category: p.category_id || 'General',
			tagline: p.delivery_days ? `Entrega ${p.delivery_days}` : 'Calidad profesional para tu proyecto',
			description: p.description || 'Producto sincronizado desde Fabrick Store.',
			features: ['Calidad garantizada', p.stock != null ? `Stock: ${p.stock}` : 'Stock sujeto a confirmación', p.featured ? 'Producto destacado' : 'Disponible'],
			dimensions: 'Especificación en ficha técnica',
			delivery: p.delivery_days || 'A coordinar',
			img: p.image_url || 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop',
		}));
	}, [dbProducts]);

	useEffect(() => {
		let mounted = true;
		async function loadGsap() {
			const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
			gsap.registerPlugin(ScrollTrigger);
			if (mounted) {
				gsapRef.current = gsap;
				setGsapReady(true);
			}
		}
		void loadGsap();
		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		if (!gsapReady || !gsapRef.current) return;
		const gsap = gsapRef.current;
		gsap.utils.toArray<HTMLElement>('.scroll-reveal').forEach((el) => {
			gsap.fromTo(
				el,
				{ opacity: 0, y: 80, scale: 0.98 },
				{
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 1.5,
					scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
				},
			);
		});
	}, [gsapReady, selectedProduct]);

	const cartTotal = useMemo(() => cart.reduce((acc, item) => acc + item.price, 0), [cart]);

	const goToCheckout = (product?: Product) => {
		const target = product ?? cart[0];
		if (!target) {
			router.push('/checkout');
			return;
		}
		const params = new URLSearchParams({
			productId: target.id,
			name: target.name,
			price: String(target.price),
			category: target.category,
			img: target.img,
		});
		router.push(`/checkout?${params.toString()}`);
	};

	const handleMenuAction = (label: string) => {
		setIsMenuOpen(false);
		if (label === 'Inicio') router.push('/');
		if (label === 'Ver Catálogo') {
			setSelectedProduct(null);
			window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
		}
		if (label === 'Favoritos') setIsFavoritesOpen(true);
		if (label === 'Mi Cuenta') router.push('/mi-cuenta');
		if (label === 'Ajustes') router.push('/ajustes');
	};

	const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>, product: Product) => {
		setCart((prev) => [...prev, product]);
		if (!cartIconRef.current || !gsapRef.current) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const cartRect = cartIconRef.current.getBoundingClientRect();
		const particle = document.createElement('div');
		particle.className = 'fixed z-[600] w-14 h-14 bg-yellow-400 rounded-2xl shadow-[0_0_40px_#FACC15] pointer-events-none overflow-hidden';
		particle.style.left = `${rect.left}px`;
		particle.style.top = `${rect.top}px`;
		particle.innerHTML = `<img src="${product.img}" class="w-full h-full object-cover opacity-60" />`;
		document.body.appendChild(particle);

		gsapRef.current.to(particle, {
			duration: 1.2,
			x: cartRect.left - rect.left + 5,
			y: cartRect.top - rect.top + 5,
			scale: 0.1,
			rotation: 720,
			opacity: 0,
			ease: 'power4.inOut',
			onComplete: () => {
				particle.remove();
				if (!gsapRef.current || !cartIconRef.current) return;
				gsapRef.current.fromTo(cartIconRef.current, { scale: 1 }, { scale: 1.25, duration: 0.25, yoyo: true, repeat: 1 });
			},
		});
	};

	const handleSelectProduct = (product: Product) => {
		setSelectedProduct(product);
	};

	const toggleFavorite = (product: Product) => {
		setFavorites((prev) =>
			prev.some((f) => f.id === product.id)
				? prev.filter((f) => f.id !== product.id)
				: [...prev, product],
		);
	};

	const isFavorite = (id: string) => favorites.some((f) => f.id === id);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(CART_CACHE_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as Product[];
			if (Array.isArray(parsed)) setCart(parsed);
		} catch {
			// Ignorar errores de parseo/storage
		}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(CART_CACHE_KEY, JSON.stringify(cart));
		} catch {
			// Ignorar errores de quota/storage
		}
	}, [cart]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(FAVORITES_KEY);
			if (!raw) return;
			const parsed = JSON.parse(raw) as Product[];
			if (Array.isArray(parsed)) setFavorites(parsed);
		} catch {
			// Ignorar errores de parseo/storage
		}
	}, []);

	useEffect(() => {
		try {
			localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
		} catch {
			// Ignorar errores de quota/storage
		}
	}, [favorites]);

	useEffect(() => {
		const handleScroll = () => {
			const current = window.scrollY;
			const last = lastScrollYRef.current;
			if (current > last + 4) {
				setHeaderVisible(false);
				setNavVisible(false);
			} else if (current < last - 4) {
				setHeaderVisible(true);
				setNavVisible(true);
			}
			lastScrollYRef.current = current;
		};
		window.addEventListener('scroll', handleScroll, { passive: true });
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const [activeCategory, setActiveCategory] = useState('Todos');
	const [activeBottomTab, setActiveBottomTab] = useState(0);
	const [searchQuery, setSearchQuery] = useState('');

	const filteredProducts = useMemo(() => {
		let list = liveProducts;
		if (activeCategory !== 'Todos') list = list.filter((p) => p.category === activeCategory);
		if (searchQuery.trim()) list = list.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.toLowerCase()));
		return list;
	}, [liveProducts, activeCategory, searchQuery]);

	return (
		<div className="bg-black text-white min-h-[100dvh] font-sans selection:bg-yellow-400 selection:text-black overflow-x-hidden relative">
			<style>{`
				.scrollbar-hide::-webkit-scrollbar { display: none; }
				.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
				.wheel-selector {
					position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
					width: 130%; height: 60px; border-top: 1px solid rgba(250, 204, 21, 0.3);
					border-bottom: 1px solid rgba(250, 204, 21, 0.3); pointer-events: none;
					background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.05), transparent);
				}
				.cart-border-run { animation: border-flow 12s linear infinite; }
				@keyframes border-flow { 0% { stroke-dashoffset: 2000; } 100% { stroke-dashoffset: 0; } }
				.aura-glow-bg {
					background: radial-gradient(circle at 50% 50%, rgba(250, 204, 21, 0.08) 0%, transparent 80%);
					animation: aura-move 15s infinite alternate;
				}
				@keyframes aura-move {
					0% { transform: scale(1) translate(-5%, -5%); }
					100% { transform: scale(1.2) translate(5%, 5%); }
				}
				.welcome-box {
					background: rgba(10, 10, 10, 0.4);
					backdrop-filter: blur(40px);
					border: 1px solid rgba(255, 255, 255, 0.03);
				}
				/* Watercolor button animation */
				@keyframes wc-morph {
					0%   { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
					20%  { border-radius: 45% 55% 40% 60% / 60% 40% 55% 45%; }
					40%  { border-radius: 55% 45% 60% 40% / 45% 55% 50% 50%; }
					60%  { border-radius: 40% 60% 45% 55% / 55% 45% 60% 40%; }
					80%  { border-radius: 50% 50% 55% 45% / 40% 60% 45% 55%; }
					100% { border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%; }
				}
				.btn-watercolor {
					animation: wc-morph 6s ease-in-out infinite;
					border-radius: 60% 40% 55% 45% / 50% 60% 40% 50%;
				}
				.btn-watercolor:hover {
					animation: wc-morph 2s ease-in-out infinite;
				}
				/* Card yellow glow on hover */
				.product-card:hover {
					box-shadow: 0 0 40px rgba(250,204,21,0.15), 0 20px 60px rgba(0,0,0,0.7);
				}
				/* Desaturate image, full color on hover */
				.card-img { filter: saturate(0.4); transition: filter 0.6s ease; }
				.product-card:hover .card-img { filter: saturate(1); }
				/* Bottom nav glassmorphism */
				.bottom-nav {
					background: rgba(0,0,0,0.7);
					backdrop-filter: blur(24px);
					border-top: 1px solid rgba(255,255,255,0.06);
				}
				/* Bottom sheet slide-up */
				@keyframes sheet-up {
					from { transform: translateY(100%); opacity: 0; }
					to   { transform: translateY(0);    opacity: 1; }
				}
				.sheet-up { animation: sheet-up 0.38s cubic-bezier(0.32,0.72,0,1) forwards; }
				/* Right panel slide-in desktop */
				@keyframes panel-in {
					from { transform: translateX(100%); opacity: 0; }
					to   { transform: translateX(0);    opacity: 1; }
				}
				.panel-in { animation: panel-in 0.38s cubic-bezier(0.32,0.72,0,1) forwards; }
				/* Cart slide variants */
				@keyframes cart-slide-up {
					from { transform: translateY(100%); }
					to   { transform: translateY(0); }
				}
				@keyframes cart-slide-right {
					from { transform: translateX(100%); }
					to   { transform: translateX(0); }
				}
				.cart-mobile { animation: cart-slide-up 0.35s cubic-bezier(0.32,0.72,0,1) forwards; }
				.cart-desktop { animation: cart-slide-right 0.35s cubic-bezier(0.32,0.72,0,1) forwards; }
				/* Icon glow on hover */
				.icon-glow:hover { filter: drop-shadow(0 0 8px rgba(250,204,21,0.7)); color: #facc15; }
				/* Active bottom tab */
				.bottom-tab-active { color: #facc15; filter: drop-shadow(0 0 6px rgba(250,204,21,0.6)); }
				/* Sidebar category pill */
				.cat-pill-active { background: #facc15; color: #000; }
				.cat-pill { transition: all 0.2s; }
				.cat-pill:hover { background: rgba(250,204,21,0.15); }
				/* Favorites heart glow */
				@keyframes fav-glow {
					0% { box-shadow: 0 0 0 0 rgba(250,204,21,0.6); }
					50% { box-shadow: 0 0 0 10px rgba(250,204,21,0); }
					100% { box-shadow: 0 0 0 0 rgba(250,204,21,0); }
				}
				.fav-glow { animation: fav-glow 0.5s ease-out; }
				/* Menu item stagger slide-in */
				@keyframes menu-slide-in {
					from { opacity: 0; transform: translateX(30px); }
					to { opacity: 1; transform: translateX(0); }
				}
				.menu-item-animate {
					opacity: 0;
					animation: menu-slide-in 0.35s ease-out forwards;
				}
			`}</style>

			{/* ═══════════════════════════════════════════════════════ MOBILE TOP BAR */}
			<header className={`md:hidden fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-xl border-b border-white/5 transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
				<FabrickLogo onClick={() => (selectedProduct ? setShowExitConfirm(true) : router.push('/'))} />
				<div className="flex items-center gap-4">
					<button className="icon-glow text-white/60 transition-all duration-300">
						<Bell size={20} />
					</button>
					<button className="icon-glow text-white/60 transition-all duration-300">
						<MessageCircle size={20} />
					</button>
					<button className="icon-glow text-white/60 transition-all duration-300">
						<MapPin size={20} />
					</button>
					<div ref={cartIconRef} className="relative cursor-pointer p-1" onClick={() => setIsCartOpen(true)}>
						{cart.length > 0 && (
							<div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[8px] font-black shadow-[0_0_10px_#FACC15] z-10">
								{cart.length}
							</div>
						)}
						<ShoppingBag size={20} className="text-white/70" />
					</div>
				</div>
			</header>

			{/* ═══════════════════════════════════════════════════════ DESKTOP TOP NAV */}
			<nav className="hidden md:flex fixed top-0 left-0 w-full z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 py-4 px-8 items-center gap-6 transition-all duration-500">
				<FabrickLogo onClick={() => (selectedProduct ? setShowExitConfirm(true) : router.push('/'))} />
				{/* Search */}
				<div className="flex-1 max-w-md relative mx-4">
					<Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
					<input
						type="text"
						placeholder="Buscar productos..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-400/40 transition-colors"
					/>
				</div>
				<div className="flex items-center gap-5 ml-auto">
					<button className="icon-glow text-white/60 transition-all duration-300 p-1">
						<Bell size={20} />
					</button>
					<button className="icon-glow text-white/60 transition-all duration-300 p-1">
						<MessageCircle size={20} />
					</button>
					<div ref={cartIconRef} className="relative cursor-pointer p-1" onClick={() => setIsCartOpen(true)}>
						{cart.length > 0 && (
							<div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[8px] font-black shadow-[0_0_10px_#FACC15] z-10">
								{cart.length}
							</div>
						)}
						<ShoppingBag size={22} className="text-white/70" />
					</div>
					<button onClick={() => setIsMenuOpen(true)} className="p-1 text-white/60 hover:text-white transition-colors">
						<Menu size={22} />
					</button>
				</div>
			</nav>

			{/* ═══════════════════════════════════════════════════════ MAIN LAYOUT */}
			<div className="pt-[56px] md:pt-[64px] min-h-[100dvh] flex flex-col md:flex-row">

				{/* ── DESKTOP LEFT SIDEBAR ── */}
				<aside className="hidden md:flex flex-col w-56 shrink-0 fixed top-[64px] left-0 h-[calc(100vh-64px)] bg-zinc-950/80 backdrop-blur-sm border-r border-white/5 py-8 px-4 z-50 overflow-y-auto scrollbar-hide">
					<p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600 mb-4 px-2">Categorías</p>
					<div className="flex flex-col gap-1">
						{CATEGORIES.map((cat) => (
							<button
								key={cat}
								onClick={() => setActiveCategory(cat)}
								className={`cat-pill text-left px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeCategory === cat ? 'cat-pill-active' : 'text-zinc-400'}`}
							>
								{cat}
							</button>
						))}
					</div>
					<div className="mt-auto pt-8 border-t border-white/5">
						<p className={`text-[8px] uppercase tracking-widest font-bold ${realtimeConnected ? 'text-emerald-400' : 'text-zinc-600'}`}>
							{realtimeConnected ? '● En vivo' : '○ Reconectando'}
						</p>
						<p className="text-[8px] text-zinc-600 mt-1">{productsLoading ? 'Cargando...' : `${liveProducts.length} productos`}</p>
					</div>
				</aside>

				{/* ── CONTENT AREA ── */}
				<main className="flex-1 md:ml-56 pb-24 md:pb-12">

					{/* HERO BANNER */}
					<section className="relative h-[52vw] min-h-[240px] max-h-[480px] md:max-h-[400px] overflow-hidden">
						<img
							src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop"
							className="absolute inset-0 w-full h-full object-cover"
							alt="Boutique Fabrick"
						/>
						<div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
						<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
						<div className="aura-glow-bg absolute inset-0 z-0" />
						<div className="relative z-10 h-full flex flex-col justify-end px-5 md:px-10 pb-8 md:pb-10 max-w-lg">
							<div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-400/25 bg-black/40 mb-3 w-fit">
								<Sparkles size={11} className="text-yellow-400 animate-pulse" />
								<span className="text-yellow-400 font-black tracking-[0.4em] text-[8px] uppercase">Boutique Fabrick</span>
							</div>
							<h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] text-white mb-2">
								Materiales<br />
								<span className="text-yellow-400">Premium</span>
							</h1>
							<p className="text-zinc-400 text-xs md:text-sm font-light leading-relaxed max-w-xs mb-5">
								Ingeniería precisa, materiales nobles y la tranquilidad de comprar calidad real.
							</p>
							<button
								onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
								className="btn-watercolor w-fit bg-yellow-400 text-black font-black text-[10px] uppercase tracking-[0.3em] px-6 py-3 transition-all duration-300 hover:bg-yellow-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
							>
								Ver Catálogo
							</button>
						</div>
					</section>

					{/* MOBILE CATEGORY CHIPS */}
					<div className="md:hidden flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide sticky top-[56px] z-40 bg-black/80 backdrop-blur-sm">
						<p className={`text-[8px] uppercase tracking-widest font-bold self-center mr-1 shrink-0 ${realtimeConnected ? 'text-emerald-400' : 'text-zinc-600'}`}>
							{realtimeConnected ? '●' : '○'}
						</p>
						{CATEGORIES.map((cat) => (
							<button
								key={cat}
								onClick={() => setActiveCategory(cat)}
								className={`shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-200 ${
									activeCategory === cat
										? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.4)]'
										: 'bg-white/5 text-zinc-400 border-white/10'
								}`}
							>
								{cat}
							</button>
						))}
					</div>

					{/* PRODUCT GRID */}
					<div className="px-4 md:px-8 py-6">
						{filteredProducts.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-24 text-zinc-700 gap-4">
								<Search size={48} />
								<p className="font-black uppercase tracking-widest text-sm">Sin resultados</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
								{filteredProducts.map((p) => (
									<div
										key={p.id}
										className="product-card scroll-reveal group bg-zinc-950 border border-white/5 rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer flex flex-col"
										onClick={() => setSelectedProduct(p)}
									>
										{/* Category chip */}
										<div className="flex items-center justify-between px-4 pt-4 pb-2">
											<span className="text-[9px] font-black uppercase tracking-[0.4em] text-yellow-400/80 bg-yellow-400/10 px-2.5 py-1 rounded-full">
												{p.category}
											</span>
											<Star size={13} className="text-zinc-700 group-hover:text-yellow-400/60 transition-colors" />
										</div>
										{/* Image 16:9 */}
										<div className="relative mx-4 rounded-xl overflow-hidden aspect-video">
											<img src={p.img} className="card-img w-full h-full object-cover" alt={p.name} />
											<div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
											<button
												className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:border-yellow-400/50"
												onClick={(e) => { e.stopPropagation(); toggleFavorite(p); }}
											>
												<Heart size={14} className={isFavorite(p.id) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-500'} />
											</button>
										</div>
										{/* Info */}
										<div className="flex flex-col gap-2 px-4 pt-3 pb-4 flex-1">
											<h3 className="font-black uppercase tracking-tight text-sm text-white leading-tight">{p.name}</h3>
											<p className="text-zinc-500 text-[11px] italic leading-relaxed">"{p.tagline}"</p>
											<div className="flex items-center justify-between mt-auto pt-2">
												<p className="font-mono text-base font-bold text-white">${p.price.toLocaleString()}</p>
												<button
													className="btn-watercolor bg-yellow-400 text-black font-black text-[9px] uppercase tracking-[0.25em] px-4 py-2 transition-all duration-200 hover:bg-yellow-300 hover:scale-105 active:scale-95 shadow-[0_0_16px_rgba(250,204,21,0.2)]"
													onClick={(e) => {
														e.stopPropagation();
														handleAddToCart(e, p);
													}}
												>
													+ Carrito
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</main>
			</div>

			{/* ═══════════════════════════════════════════════════════ MOBILE BOTTOM NAV */}
			<nav className={`md:hidden bottom-nav fixed bottom-0 left-0 w-full z-[90] flex items-center justify-around px-2 py-2 transition-transform duration-300 ${navVisible ? 'translate-y-0' : 'translate-y-full'}`}>
				{[
					{ icon: HomeIcon, label: 'Inicio', action: () => router.push('/') },
					{ icon: LayoutGrid, label: 'Catálogo', action: () => { setActiveBottomTab(1); setSelectedProduct(null); } },
					{ icon: ShoppingBag, label: 'Carrito', action: () => { setActiveBottomTab(2); setIsCartOpen(true); } },
					{ icon: Heart, label: 'Favoritos', action: () => { setActiveBottomTab(3); setIsFavoritesOpen(true); } },
					{ icon: Settings, label: 'Ajustes', action: () => { setActiveBottomTab(4); setIsMenuOpen(true); } },
				].map((tab, i) => (
					<button
						key={tab.label}
						onClick={() => { setActiveBottomTab(i); tab.action(); }}
						className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 ${activeBottomTab === i ? 'bottom-tab-active' : 'text-zinc-600'}`}
					>
						{i === 2 && cart.length > 0 ? (
							<div className="relative">
								<tab.icon size={21} />
								<div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[7px] font-black">
									{cart.length}
								</div>
							</div>
						) : i === 3 && favorites.length > 0 ? (
							<div className="relative">
								<Heart size={21} className={activeBottomTab === 3 ? 'fill-yellow-400' : ''} />
								<div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[7px] font-black">
									{favorites.length}
								</div>
							</div>
						) : (
							<tab.icon size={21} />
						)}
						<span className="text-[8px] font-bold uppercase tracking-wide">{tab.label}</span>
					</button>
				))}
			</nav>

			{/* ═══════════════════════════════════════════════════════ PRODUCT DETAIL */}
			{/* Mobile: bottom sheet | Desktop: right panel */}
			{selectedProduct && (
				<>
					{/* Backdrop */}
					<div className="fixed inset-0 z-[140] bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />

					{/* Mobile bottom sheet */}
					<div className="md:hidden fixed bottom-0 left-0 w-full z-[150] sheet-up rounded-t-3xl bg-zinc-950 border-t border-white/10 max-h-[90dvh] overflow-y-auto scrollbar-hide">
						<div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-2 bg-zinc-950/95 backdrop-blur-sm border-b border-white/5">
							<div className="w-10 h-1 bg-white/20 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
							<span className="text-[9px] font-black uppercase tracking-[0.4em] text-yellow-400 mt-2">{selectedProduct.category}</span>
							<button onClick={() => setSelectedProduct(null)} className="text-zinc-500 hover:text-white transition-colors mt-2">
								<X size={20} />
							</button>
						</div>
						<div className="px-5 pb-32">
							<div className="aspect-video rounded-2xl overflow-hidden my-4">
								<img src={selectedProduct.img} className="w-full h-full object-cover" alt={selectedProduct.name} />
							</div>
							<h2 className="text-2xl font-black uppercase tracking-tight text-white leading-tight">{selectedProduct.name}</h2>
							<p className="text-zinc-400 text-sm italic mt-1 mb-3">"{selectedProduct.tagline}"</p>
							<p className="text-zinc-500 text-xs leading-relaxed mb-4">{selectedProduct.description}</p>
							<div className="grid grid-cols-2 gap-2 mb-4">
								{selectedProduct.features.map((f) => (
									<div key={f} className="flex items-center gap-2 p-3 bg-zinc-900 rounded-xl border border-white/5">
										<Zap size={13} className="text-yellow-400 shrink-0" />
										<span className="text-[9px] font-bold uppercase tracking-wide text-zinc-300 leading-tight">{f}</span>
									</div>
								))}
							</div>
							<div className="flex items-center justify-between py-4 border-y border-white/10 mb-5">
								<div className="flex gap-6 text-zinc-500 text-[9px] uppercase tracking-wider">
									<div>
										<p className="text-zinc-700 font-black mb-1">Dimensión</p>
										<p className="text-white flex items-center gap-1"><Ruler size={12} /> {selectedProduct.dimensions}</p>
									</div>
									<div>
										<p className="text-zinc-700 font-black mb-1">Entrega</p>
										<p className="text-white flex items-center gap-1"><Clock size={12} /> {selectedProduct.delivery}</p>
									</div>
								</div>
								<p className="text-2xl font-black text-white">${selectedProduct.price.toLocaleString()}</p>
							</div>
							<button
								className="btn-watercolor w-full bg-yellow-400 text-black font-black text-[11px] uppercase tracking-[0.3em] py-4 transition-all duration-300 hover:bg-yellow-300 active:scale-95 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
								onClick={() => goToCheckout(selectedProduct)}
							>
								Confirmar Pedido
							</button>
						</div>
					</div>

					{/* Desktop right panel */}
					<div className="hidden md:flex fixed top-[64px] right-0 h-[calc(100vh-64px)] w-[420px] z-[150] panel-in flex-col bg-zinc-950 border-l border-white/10 shadow-2xl overflow-y-auto scrollbar-hide">
						<div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0 z-10">
							<span className="text-[9px] font-black uppercase tracking-[0.4em] text-yellow-400">{selectedProduct.category}</span>
							<button onClick={() => setSelectedProduct(null)} className="text-zinc-500 hover:text-white transition-colors">
								<X size={20} />
							</button>
						</div>
						<div className="flex-1 px-6 py-5 space-y-5">
							<div className="aspect-video rounded-2xl overflow-hidden">
								<img src={selectedProduct.img} className="w-full h-full object-cover" alt={selectedProduct.name} />
							</div>
							<h2 className="text-3xl font-black uppercase tracking-tight text-white leading-tight">{selectedProduct.name}</h2>
							<p className="text-zinc-400 text-sm italic">"{selectedProduct.tagline}"</p>
							<p className="text-zinc-500 text-xs leading-relaxed">{selectedProduct.description}</p>
							<div className="grid grid-cols-2 gap-2">
								{selectedProduct.features.map((f) => (
									<div key={f} className="flex items-center gap-2 p-3 bg-zinc-900 rounded-xl border border-white/5">
										<Zap size={13} className="text-yellow-400 shrink-0" />
										<span className="text-[9px] font-bold uppercase tracking-wide text-zinc-300 leading-tight">{f}</span>
									</div>
								))}
							</div>
							<div className="flex items-center justify-between py-4 border-y border-white/10">
								<div className="flex gap-6 text-zinc-500 text-[9px] uppercase tracking-wider">
									<div>
										<p className="text-zinc-700 font-black mb-1">Dimensión</p>
										<p className="text-white flex items-center gap-1"><Ruler size={12} /> {selectedProduct.dimensions}</p>
									</div>
									<div>
										<p className="text-zinc-700 font-black mb-1">Entrega</p>
										<p className="text-white flex items-center gap-1"><Clock size={12} /> {selectedProduct.delivery}</p>
									</div>
								</div>
								<p className="text-2xl font-black text-white">${selectedProduct.price.toLocaleString()}</p>
							</div>
						</div>
						<div className="px-6 py-5 border-t border-white/5 bg-black/40 sticky bottom-0">
							<button
								className="btn-watercolor w-full bg-yellow-400 text-black font-black text-[11px] uppercase tracking-[0.3em] py-4 transition-all duration-300 hover:bg-yellow-300 active:scale-95 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
								onClick={() => goToCheckout(selectedProduct)}
							>
								Confirmar Pedido
							</button>
						</div>
					</div>
				</>
			)}

			{/* ═══════════════════════════════════════════════════════ MENU DRAWER */}
			{isMenuOpen && (
				<div className="fixed inset-0 z-[210] flex justify-end">
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
					<div className="relative w-full max-w-[300px] bg-zinc-950 border-l border-white/5 h-full flex flex-col shadow-2xl panel-in overflow-hidden">
						{/* Logo header */}
						<div className="flex items-center justify-center py-10 border-b border-white/5 bg-black/40">
							<FabrickLogo />
						</div>
						{/* Menu items */}
						<div className="flex-1 flex flex-col py-6 px-4 gap-1 overflow-y-auto scrollbar-hide">
							{[
								{ icon: HomeIcon, label: 'Inicio' },
								{ icon: LayoutGrid, label: 'Ver Catálogo' },
								{ icon: Heart, label: 'Favoritos' },
								{ icon: User, label: 'Mi Cuenta' },
								{ icon: Settings, label: 'Ajustes' },
							].map((item, i) => (
								<button
									key={item.label}
									onClick={() => handleMenuAction(item.label)}
									className="menu-item-animate group w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 hover:bg-yellow-400/5 border border-transparent hover:border-yellow-400/10 text-left"
									style={{ animationDelay: `${i * 60}ms` }}
								>
									<item.icon size={18} className="text-zinc-500 group-hover:text-yellow-400 transition-colors duration-200 shrink-0" />
									<span className="text-sm font-black uppercase tracking-[0.3em] text-zinc-400 group-hover:text-white transition-colors duration-200">
										{item.label}
									</span>
									{item.label === 'Favoritos' && favorites.length > 0 && (
										<span className="ml-auto text-[8px] font-black bg-yellow-400 text-black rounded-full w-5 h-5 flex items-center justify-center shrink-0">
											{favorites.length}
										</span>
									)}
								</button>
							))}
						</div>
						{/* Divider + bottom actions */}
						<div className="h-px bg-white/5 mx-4" />
						<div className="p-6 space-y-3">
							<button className="w-full py-3 bg-yellow-400/10 border border-yellow-400/20 rounded-full text-yellow-400 font-black text-[9px] uppercase tracking-[0.4em] hover:bg-yellow-400/20 transition-all duration-200">
								Iniciar Sesión
							</button>
							<button
								onClick={() => setIsMenuOpen(false)}
								className="w-full py-3 text-zinc-700 hover:text-white font-black uppercase text-[8px] tracking-[0.8em] transition-colors duration-200"
							>
								Cerrar ×
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════ CART DRAWER */}
			{isCartOpen && (
				<div className="fixed inset-0 z-[220] flex overflow-hidden">
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
					{/* Mobile: slide up from bottom */}
					<div className="md:hidden absolute bottom-0 left-0 w-full bg-zinc-950 border-t border-white/10 rounded-t-3xl shadow-2xl cart-mobile flex flex-col max-h-[85dvh]">
						<div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 bg-zinc-950/95 backdrop-blur-sm">
							<div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 bg-white/20 rounded-full" />
							<p className="font-black uppercase tracking-[0.4em] text-xs text-white mt-2">Tu Bolsa</p>
							<button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-white transition-colors mt-2"><X size={20} /></button>
						</div>
						<div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
							{cart.length === 0 ? (
								<div className="h-40 flex flex-col items-center justify-center opacity-20 gap-3">
									<ShoppingBag size={40} />
									<p className="text-sm font-black uppercase tracking-widest">Vacío</p>
								</div>
							) : cart.map((item, idx) => (
								<div key={`${item.id}-${idx}`} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/5 hover:border-yellow-400/20 transition-colors">
									<div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
										<img src={item.img} className="w-full h-full object-cover grayscale" alt={item.name} />
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="font-black uppercase text-xs text-white tracking-wide truncate">{item.name}</h4>
										<p className="text-yellow-400 font-mono text-sm mt-0.5">${item.price.toLocaleString()}</p>
									</div>
									<button onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))} className="text-zinc-600 hover:text-red-400 p-2 shrink-0">
										<Trash2 size={16} />
									</button>
								</div>
							))}
						</div>
						{cart.length > 0 && (
							<div className="p-4 bg-black/80 border-t border-white/5 space-y-3 sticky bottom-0">
								<div className="flex items-center justify-between">
									<p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Total</p>
									<p className="text-xl font-black text-white">${cartTotal.toLocaleString()}</p>
								</div>
								<button
									className="btn-watercolor w-full bg-yellow-400 text-black font-black text-[10px] uppercase tracking-[0.3em] py-3.5 transition-all duration-300 hover:bg-yellow-300 active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.25)]"
									onClick={() => goToCheckout()}
								>
									Confirmar Pedido
								</button>
								<SilverGoldButton className="w-full" onClick={() => setIsCartOpen(false)}>
									Seguir Comprando
								</SilverGoldButton>
							</div>
						)}
					</div>
					{/* Desktop: slide from right */}
					<div className="hidden md:flex absolute top-0 right-0 h-full w-[400px] bg-zinc-950 border-l border-white/10 shadow-2xl cart-desktop flex-col">
						<div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0">
							<p className="font-black uppercase tracking-[0.4em] text-sm text-white">Tu Bolsa</p>
							<button onClick={() => setIsCartOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
						</div>
						<div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-hide">
							{cart.length === 0 ? (
								<div className="h-40 flex flex-col items-center justify-center opacity-20 gap-3">
									<ShoppingBag size={48} />
									<p className="text-sm font-black uppercase tracking-widest">Vacío</p>
								</div>
							) : cart.map((item, idx) => (
								<div key={`${item.id}-${idx}`} className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-yellow-400/20 transition-colors">
									<div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0">
										<img src={item.img} className="w-full h-full object-cover grayscale" alt={item.name} />
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="font-black uppercase text-sm text-white tracking-wide truncate">{item.name}</h4>
										<p className="text-yellow-400 font-mono text-base mt-1">${item.price.toLocaleString()}</p>
									</div>
									<button onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))} className="text-zinc-600 hover:text-red-400 p-2 shrink-0">
										<Trash2 size={18} />
									</button>
								</div>
							))}
						</div>
						{cart.length > 0 && (
							<div className="p-6 bg-black/80 border-t border-white/5 space-y-4 sticky bottom-0">
								<div className="flex items-center justify-between">
									<p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Total Confirmado</p>
									<p className="text-2xl font-black text-white">${cartTotal.toLocaleString()}</p>
								</div>
								<button
									className="btn-watercolor w-full bg-yellow-400 text-black font-black text-[11px] uppercase tracking-[0.3em] py-4 transition-all duration-300 hover:bg-yellow-300 active:scale-95 shadow-[0_0_25px_rgba(250,204,21,0.3)]"
									onClick={() => goToCheckout()}
								>
									Confirmar Pedido
								</button>
								<SilverGoldButton className="w-full" onClick={() => { setIsCartOpen(false); }}>
									Seguir Comprando
								</SilverGoldButton>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════ FAVORITES DRAWER */}
			{isFavoritesOpen && (
				<div className="fixed inset-0 z-[220] flex overflow-hidden">
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsFavoritesOpen(false)} />
					{/* Mobile: slide up from bottom */}
					<div className="md:hidden absolute bottom-0 left-0 w-full bg-zinc-950 border-t border-white/10 rounded-t-3xl shadow-2xl cart-mobile flex flex-col max-h-[85dvh]">
						<div className="flex items-center justify-between px-5 py-4 border-b border-white/5 sticky top-0 bg-zinc-950/95 backdrop-blur-sm">
							<div className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 bg-white/20 rounded-full" />
							<p className="font-black uppercase tracking-[0.4em] text-xs text-white mt-2 flex items-center gap-2">
								<Heart size={14} className="text-yellow-400 fill-yellow-400" /> Favoritos
							</p>
							<button onClick={() => setIsFavoritesOpen(false)} className="text-zinc-500 hover:text-white transition-colors mt-2"><X size={20} /></button>
						</div>
						<div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
							{favorites.length === 0 ? (
								<div className="h-40 flex flex-col items-center justify-center opacity-20 gap-3">
									<Heart size={40} />
									<p className="text-sm font-black uppercase tracking-widest">Sin favoritos</p>
								</div>
							) : favorites.map((item, idx) => (
								<div key={`${item.id}-${idx}`} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/5 hover:border-yellow-400/20 transition-colors">
									<div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
										<img src={item.img} className="w-full h-full object-cover" alt={item.name} />
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="font-black uppercase text-xs text-white tracking-wide truncate">{item.name}</h4>
										<p className="text-yellow-400 font-mono text-sm mt-0.5">${item.price.toLocaleString()}</p>
									</div>
									<div className="flex flex-col gap-1 shrink-0 items-center">
										<button
											onClick={() => { setIsFavoritesOpen(false); goToCheckout(item); }}
											className="text-[8px] font-black uppercase tracking-wider bg-yellow-400 text-black px-3 py-1.5 rounded-full hover:bg-yellow-300 transition-colors"
										>
											Comprar
										</button>
										<button onClick={() => toggleFavorite(item)} className="text-zinc-600 hover:text-red-400 p-1">
											<Trash2 size={14} />
										</button>
									</div>
								</div>
							))}
						</div>
						{favorites.length > 0 && (
							<div className="p-4 bg-black/80 border-t border-white/5 space-y-3 sticky bottom-0">
								<button
									className="btn-watercolor w-full bg-yellow-400 text-black font-black text-[10px] uppercase tracking-[0.3em] py-3.5 transition-all duration-300 hover:bg-yellow-300 active:scale-95 shadow-[0_0_20px_rgba(250,204,21,0.25)]"
									onClick={() => { setIsFavoritesOpen(false); router.push('/checkout'); }}
								>
									Ir al Checkout
								</button>
								<SilverGoldButton className="w-full" onClick={() => setIsFavoritesOpen(false)}>
									Seguir Comprando
								</SilverGoldButton>
							</div>
						)}
					</div>
					{/* Desktop: slide from right */}
					<div className="hidden md:flex absolute top-0 right-0 h-full w-[400px] bg-zinc-950 border-l border-white/10 shadow-2xl cart-desktop flex-col">
						<div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/60 backdrop-blur-md sticky top-0">
							<p className="font-black uppercase tracking-[0.4em] text-sm text-white flex items-center gap-2">
								<Heart size={16} className="text-yellow-400 fill-yellow-400" /> Favoritos
							</p>
							<button onClick={() => setIsFavoritesOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
						</div>
						<div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-hide">
							{favorites.length === 0 ? (
								<div className="h-40 flex flex-col items-center justify-center opacity-20 gap-3">
									<Heart size={48} />
									<p className="text-sm font-black uppercase tracking-widest">Sin favoritos</p>
								</div>
							) : favorites.map((item, idx) => (
								<div key={`${item.id}-${idx}`} className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-yellow-400/20 transition-colors">
									<div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0">
										<img src={item.img} className="w-full h-full object-cover" alt={item.name} />
									</div>
									<div className="flex-1 min-w-0">
										<h4 className="font-black uppercase text-sm text-white tracking-wide truncate">{item.name}</h4>
										<p className="text-yellow-400 font-mono text-base mt-1">${item.price.toLocaleString()}</p>
									</div>
									<div className="flex flex-col gap-2 shrink-0 items-center">
										<button
											onClick={() => { setIsFavoritesOpen(false); goToCheckout(item); }}
											className="text-[8px] font-black uppercase tracking-wider bg-yellow-400 text-black px-3 py-1.5 rounded-full hover:bg-yellow-300 transition-colors"
										>
											Comprar
										</button>
										<button onClick={() => toggleFavorite(item)} className="text-zinc-600 hover:text-red-400 p-1.5">
											<Trash2 size={16} />
										</button>
									</div>
								</div>
							))}
						</div>
						{favorites.length > 0 && (
							<div className="p-6 bg-black/80 border-t border-white/5 space-y-4 sticky bottom-0">
								<button
									className="btn-watercolor w-full bg-yellow-400 text-black font-black text-[11px] uppercase tracking-[0.3em] py-4 transition-all duration-300 hover:bg-yellow-300 active:scale-95 shadow-[0_0_25px_rgba(250,204,21,0.3)]"
									onClick={() => { setIsFavoritesOpen(false); router.push('/checkout'); }}
								>
									Ir al Checkout
								</button>
								<SilverGoldButton className="w-full" onClick={() => setIsFavoritesOpen(false)}>
									Seguir Comprando
								</SilverGoldButton>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════ FOOTER */}
			<footer className="hidden md:flex py-16 border-t border-white/5 flex-col items-center gap-8 bg-black relative z-10 text-center md:ml-56">
				<FabrickLogo className="mx-auto" />
				<div className="flex gap-8 items-center">
					<Instagram size={18} className="text-zinc-800 hover:text-yellow-400 transition-all cursor-pointer transform hover:scale-125" />
					<Facebook size={18} className="text-zinc-800 hover:text-yellow-400 transition-all cursor-pointer transform hover:scale-125" />
				</div>
				<p className="text-[7px] text-zinc-800 uppercase tracking-[1em] font-medium">© 2026 Soluciones Fabrick • Ingeniería para tu Vida</p>
			</footer>

			{/* ═══════════════════════════════════════════════════════ EXIT CONFIRM MODAL */}
			{showExitConfirm && (
				<div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
					<div className="bg-zinc-950 border border-white/10 p-10 rounded-[2rem] max-w-sm w-full text-center space-y-6 shadow-2xl panel-in">
						<AlertCircle className="w-12 h-12 text-yellow-400 mx-auto animate-pulse" />
						<div className="space-y-2">
							<h3 className="text-lg font-black uppercase tracking-widest text-white">¿Regresar al Inicio?</h3>
							<p className="text-zinc-600 text-[10px] uppercase tracking-widest leading-relaxed">Tu selección actual se mantendrá en la bolsa.</p>
						</div>
						<div className="flex flex-col gap-3">
							<button
								onClick={() => { setSelectedProduct(null); setShowExitConfirm(false); router.push('/'); }}
								className="w-full py-4 bg-yellow-400 text-black font-black uppercase text-[10px] tracking-widest rounded-full"
							>
								Confirmar
							</button>
							<button
								onClick={() => setShowExitConfirm(false)}
								className="w-full py-4 bg-white/5 text-zinc-500 font-black uppercase text-[10px] tracking-widest rounded-full border border-white/5"
							>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Exit confirm modal ends above */}
		</div>
	);
}