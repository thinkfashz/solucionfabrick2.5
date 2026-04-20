'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/initials';
import {
	ShoppingBag,
	Menu,
	X,
	Zap,
	Instagram,
	Facebook,
	User,
	Settings,
	Home,
	LayoutGrid,
	Trash2,
	Sparkles,
	Award,
	Clock,
	Ruler,
	AlertCircle,
	LogOut,
	ChevronRight,
	Star,
	Package,
	ArrowRight,
	Phone,
} from 'lucide-react';
import BannerCarousel from '@/components/BannerCarousel';

const CART_CACHE_KEY = 'fabrick.tienda.cart.v1';

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
	{ icon: Home, label: 'Inicio', description: 'Volver a la página principal', href: '/' },
	{ icon: LayoutGrid, label: 'Ver Catálogo', description: 'Explorar todos nuestros productos', href: null },
	{ icon: Award, label: 'Garantías', description: 'Conoce nuestra política de garantías', href: '/garantias' },
	{ icon: User, label: 'Mi Cuenta', description: 'Perfil y panel de pedidos', href: '/mi-cuenta' },
	{ icon: Settings, label: 'Ajustes', description: 'Configuración de tu cuenta', href: '/ajustes' },
];

function FabrickLogo({ className = '', centered = false, active = false, onClick }: { className?: string; centered?: boolean; active?: boolean; onClick?: () => void }) {
return (
<div onClick={onClick} className={`select-none cursor-pointer ${className}`}>
  <svg
    viewBox="0 0 214 52"
    className={`${centered ? 'h-14' : 'h-10'} w-auto transition-all duration-300 ${active ? 'drop-shadow-[0_0_12px_rgba(255,199,0,0.5)]' : 'opacity-95 hover:opacity-100'}`}
    role="img"
    aria-label="Soluciones Fabrick"
  >
    <defs>
      <linearGradient id="tfl-gold" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFE566" />
        <stop offset="100%" stopColor="#FFC700" />
      </linearGradient>
      <linearGradient id="tfl-depth" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#B37E00" />
        <stop offset="100%" stopColor="#D9A100" />
      </linearGradient>
    </defs>
    <path d="M 2,46 L 21,4 L 40,46 L 33,46 L 21,13 L 9,46 Z" fill="url(#tfl-gold)" />
    <path d="M 9,46 L 21,13 L 21,19 L 14,46 Z" fill="url(#tfl-depth)" opacity="0.75" />
    <rect x="25" y="11" width="8" height="20" rx="1.5" fill="#FFC700" />
    <line x1="52" y1="9" x2="52" y2="44" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
    <text x="61" y="26" fontFamily="Montserrat, Poppins, Arial, sans-serif" fontSize="9.5" fontWeight="500" letterSpacing="3" fill="rgba(255,255,255,0.5)">SOLUCIONES</text>
    <text x="60" y="47" fontFamily="Montserrat, Poppins, Arial, sans-serif" fontSize="25" fontWeight="900" letterSpacing="1.5" fill="#FFFFFF">FABRICK</text>
  </svg>
</div>
);
}
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
	const { user, signOut } = useAuth();
	const { products: catalogProducts, loading: productsLoading, connected: realtimeConnected } = useCatalogProducts();
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [cart, setCart] = useState<Product[]>([]);
	const [gsapReady, setGsapReady] = useState(false);

	const cartIconRef = useRef<HTMLDivElement>(null);
	const gsapRef = useRef<null | typeof import('gsap').default>(null);

	const liveProducts = useMemo<Product[]>(() => {
		return catalogProducts.length ? (catalogProducts as Product[]) : PRODUCTS;
	}, [catalogProducts]);

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

	const handleMenuAction = (item: typeof MENU_OPTIONS[number]) => {
		setIsMenuOpen(false);
		if (item.label === 'Inicio') { router.push('/'); return; }
		if (item.label === 'Ver Catálogo') {
			setSelectedProduct(null);
			setTimeout(() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' }), 100);
			return;
		}
		if (item.href) { router.push(item.href); return; }
	};

	const handleSignOut = async () => {
		setIsMenuOpen(false);
		await signOut();
		router.push('/');
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
		// Navigate to the full detail page so the user sees all information
		// (image, specs, stock, description, price breakdown) instead of the
		// in-page overlay which was confusing.
		router.push(`/producto/${product.id}`);
	};

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

	return (
		<div className="bg-black text-white min-h-[100dvh] font-sans selection:bg-yellow-400 selection:text-black overflow-x-hidden relative cinematic-enter">
			<style>{`
				.scrollbar-hide::-webkit-scrollbar { display: none; }
				.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
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
					background: rgba(10, 10, 10, 0.45);
					backdrop-filter: blur(40px);
					border: 1px solid rgba(255, 255, 255, 0.05);
				}
				.menu-drawer-enter {
					animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
				}
				@keyframes slideInRight {
					from { transform: translateX(100%); opacity: 0; }
					to { transform: translateX(0); opacity: 1; }
				}
				.menu-item-hover {
					transition: background 0.2s, border-color 0.2s, transform 0.2s;
				}
				.menu-item-hover:hover {
					background: rgba(250, 204, 21, 0.06);
					border-color: rgba(250, 204, 21, 0.2);
					transform: translateX(4px);
				}
				.product-badge-shine {
					background: linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(250,204,21,0.05) 100%);
				}
			`}</style>

			{/* ── NAVBAR ── */}
			<nav className="fixed top-0 left-0 w-full z-[100] bg-black/20 backdrop-blur-xl border-b border-white/5 py-4 px-5 md:px-10 flex justify-between items-center transition-all duration-500">
				<FabrickLogo onClick={() => (selectedProduct ? setShowExitConfirm(true) : router.push('/'))} />

				<div className="flex items-center gap-3">
					{/* Real-time dot */}
					<span
						title={realtimeConnected ? 'Catálogo en tiempo real' : 'Reconectando...'}
						className={`hidden sm:block w-2 h-2 rounded-full transition-colors ${realtimeConnected ? 'bg-emerald-400 shadow-[0_0_6px_#4ade80]' : 'bg-zinc-600'}`}
					/>

					{/* User avatar / login */}
					{user ? (
						<button
							onClick={() => router.push('/mi-cuenta')}
							className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-all"
							title="Mi Cuenta"
						>
							<div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-black text-[9px] font-black">
								{getInitials(user.name || user.email)}
							</div>
							<span className="hidden md:block text-[10px] font-semibold text-white/70 uppercase tracking-wider max-w-[80px] truncate">
								{user.name?.split(' ')[0] || 'Cuenta'}
							</span>
						</button>
					) : (
						<button
							onClick={() => router.push('/auth')}
							className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-semibold text-white/50 uppercase tracking-wider hover:border-yellow-400/30 hover:text-white/80 transition-all"
						>
							<User size={12} /> Ingresar
						</button>
					)}

					{/* Cart */}
					<div
						ref={cartIconRef}
						className="relative cursor-pointer transition-all duration-300 p-2"
						onClick={() => setIsCartOpen(true)}
					>
						{cart.length > 0 && (
							<div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[8px] font-black shadow-[0_0_10px_#FACC15]">
								{cart.length}
							</div>
						)}
						<ShoppingBag size={22} className="text-white/70 hover:text-white transition-colors" />
					</div>

					{/* Hamburger */}
					<button
						onClick={() => setIsMenuOpen(true)}
						className="p-2 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
						aria-label="Abrir menú"
					>
						<Menu size={22} />
					</button>
				</div>
			</nav>

			{/* Promotional banner carousel - now also acts as hero */}
			<div className="pt-[64px]">
				<BannerCarousel />
			</div>

			{/* ── CATALOGUE ── */}
			{!selectedProduct && (
				<>
					{/* Intro strip (replaces big Boutique/Alto Estándar hero) */}
					<section className="relative px-6 md:px-10 pt-10 pb-6 max-w-6xl mx-auto">
						<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
							<div>
								<p className="text-[9px] uppercase tracking-[0.5em] text-yellow-400/70 mb-3">Tienda Fabrick</p>
								<h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.95] text-white">
									Materiales conectados<br />
									<span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">a la obra real</span>
								</h1>
								<p className="mt-4 text-zinc-400 text-sm max-w-xl leading-relaxed">
									Precios, stock y promociones sincronizados en vivo. Pulsa cualquier producto para abrir su ficha técnica completa.
								</p>
							</div>
							<div className="flex flex-col sm:flex-row gap-3">
								<button
									onClick={() => window.scrollTo({ top: window.innerHeight * 0.85, behavior: 'smooth' })}
									className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black font-black uppercase text-[10px] tracking-[0.3em] hover:bg-yellow-300 transition-all hover:scale-105 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
								>
									<Package size={13} /> Ver colección
								</button>
								<button
									onClick={() => router.push('/contacto')}
									className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 text-white/70 font-semibold uppercase text-[10px] tracking-[0.3em] hover:border-yellow-400/40 hover:text-white transition-all"
								>
									<Phone size={13} /> Contactar
								</button>
							</div>
						</div>
					</section>

					{/* Products catalogue */}
					<main className="max-w-6xl mx-auto px-5 md:px-8 pb-48 relative z-10">

						{/* Section header */}
						<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-16 pt-16 border-t border-white/5">
							<div>
								<p className="text-[9px] uppercase tracking-[0.4em] text-yellow-400/70 mb-2">Nuestro catálogo</p>
								<h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
									{productsLoading ? 'Cargando...' : `${liveProducts.length} Productos`}
								</h2>
							</div>
							<div className="flex items-center gap-2">
								<span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400 shadow-[0_0_6px_#4ade80]' : 'bg-zinc-600'}`} />
								<span className={`text-[10px] uppercase tracking-widest ${realtimeConnected ? 'text-emerald-400' : 'text-zinc-600'}`}>
									{realtimeConnected ? 'Sincronizado en vivo' : 'Reconectando...'}
								</span>
							</div>
						</div>

						{/* Products */}
						<div className="space-y-28 md:space-y-40">
							{liveProducts.map((p, idx) => (
								<div key={p.id} className={`scroll-reveal group flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-10 md:gap-20`}>
									{/* Image */}
									<div
										className="w-full md:w-1/2 aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.7)] relative cursor-pointer"
										onClick={() => handleSelectProduct(p)}
									>
										<img
											src={p.img}
											className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2s] ease-out"
											alt={p.name}
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
										{/* Category badge */}
										<span className="absolute top-5 left-5 px-3 py-1.5 rounded-full text-[9px] uppercase tracking-widest font-bold product-badge-shine border border-yellow-400/20 text-yellow-400">
											{p.category}
										</span>
										{(p as { discountPercentage?: number }).discountPercentage ? (
											<span className="absolute top-5 right-5 flex items-center gap-1 px-3 py-1 rounded-full bg-red-500/95 text-white text-[9px] font-black uppercase tracking-wider shadow-[0_0_22px_rgba(239,68,68,0.55)]">
												<span className="motion-safe:animate-pulse">●</span> Última Oferta · -{(p as { discountPercentage?: number }).discountPercentage}%
											</span>
										) : null}
										{/* Quick action overlay */}
										<div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-500 p-5">
											<div className="flex gap-2">
												<button
													onClick={(e) => { e.stopPropagation(); handleSelectProduct(p); }}
													className="flex-1 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-white/20 transition-all flex items-center justify-center gap-2"
												>
													<ArrowRight size={13} /> Ver Detalle
												</button>
												<button
													onClick={(e) => { e.stopPropagation(); handleAddToCart(e, p); }}
													className="flex-1 py-3 rounded-full bg-yellow-400/90 text-black text-[10px] font-black uppercase tracking-wider hover:bg-yellow-400 transition-all"
												>
													Añadir
												</button>
											</div>
										</div>
									</div>

									{/* Info */}
									<div className="w-full md:w-1/2 space-y-6 text-center md:text-left">
										<div>
											<p className="text-[9px] uppercase tracking-[0.4em] text-yellow-400/70 mb-3">{p.category}</p>
											<h3 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.9] text-white group-hover:text-yellow-50 transition-colors">
												{p.name}
											</h3>
										</div>

										<p className="text-zinc-400 text-sm md:text-base font-light leading-relaxed italic max-w-sm">
											&ldquo;{p.tagline}&rdquo;
										</p>

										{(p as { rating?: number }).rating ? (
											<div className="flex items-center gap-1 justify-center md:justify-start">
												{[...Array(5)].map((_, si) => (
													<Star
														key={si}
														size={12}
														className={si < Math.round((p as { rating?: number }).rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700 fill-zinc-700'}
													/>
												))}
												<span className="text-zinc-500 text-xs ml-1">{((p as { rating?: number }).rating ?? 0).toFixed(1)}</span>
											</div>
										) : null}

										<div className="pt-2">
											<p className="text-[9px] uppercase tracking-widest text-zinc-600 mb-1">
												{(p as { discountPercentage?: number }).discountPercentage ? 'Precio promocional' : 'Inversión'}
											</p>
											{(() => {
												const pct = (p as { discountPercentage?: number }).discountPercentage ?? 0;
												const finalPrice = pct > 0 ? Math.round(p.price * (1 - pct / 100)) : p.price;
												return (
													<div className="flex items-baseline gap-3 justify-center md:justify-start flex-wrap">
														<span className="font-mono text-3xl md:text-4xl font-bold text-white">${finalPrice.toLocaleString()}</span>
														{pct > 0 ? (
															<>
																<span className="text-base text-zinc-500 line-through">${p.price.toLocaleString()}</span>
																<span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-wider">
																	Ahorras ${Math.round(p.price - finalPrice).toLocaleString()}
																</span>
															</>
														) : null}
													</div>
												);
											})()}
										</div>

										<div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-2">
											<SilverGoldButton onClick={() => goToCheckout(p)}>
												Comprar Ahora
											</SilverGoldButton>
											<button
												onClick={(e) => handleAddToCart(e, p)}
												className="px-6 py-3 rounded-full border border-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest hover:border-yellow-400/30 hover:text-white/90 transition-all"
											>
												Añadir al Carrito
											</button>
										</div>
									</div>
								</div>
							))}
						</div>
					</main>
				</>
			)}

			{/* ── PRODUCT DETAIL VIEW ── */}
			{selectedProduct && (
				<div className="fixed inset-0 z-[150] bg-black overflow-y-auto scrollbar-hide cinematic-panel-enter">
					<div className="w-full min-h-[150vh] relative">
						<section className="h-[95dvh] w-full sticky top-0 overflow-hidden z-0">
							<img src={selectedProduct.img} className="w-full h-full object-cover" alt={selectedProduct.name} />
							<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
							<button
								onClick={() => setSelectedProduct(null)}
								className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors p-3 z-50 bg-black/30 backdrop-blur-sm rounded-full border border-white/10"
							>
								<X size={20} />
							</button>
							<div className="absolute bottom-12 left-8 z-10">
								<span className="text-[9px] uppercase tracking-[0.4em] text-yellow-400/80 block mb-2">{selectedProduct.category}</span>
								<h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white">{selectedProduct.name}</h2>
							</div>
						</section>

						<div className="relative z-10 bg-black pt-20 pb-40 shadow-[0_-120px_150px_rgba(0,0,0,1)] px-6 md:px-10 border-t border-white/5">
							<div className="max-w-4xl mx-auto space-y-16">
								<div className="space-y-6">
									<FabrickLogo active className="mb-4" />
									<p className="text-zinc-400 text-lg md:text-xl font-light leading-relaxed max-w-2xl">{selectedProduct.description}</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
									{selectedProduct.features.map((f) => (
										<div key={f} className="flex items-center gap-5 p-6 bg-zinc-950 rounded-2xl border border-white/5 shadow-inner hover:border-yellow-400/20 transition-colors">
											<div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center flex-shrink-0">
												<Zap className="text-yellow-400" size={18} />
											</div>
											<span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-300">{f}</span>
										</div>
									))}
								</div>

								<div className="flex flex-col md:flex-row items-center justify-between py-10 border-y border-white/8 gap-8 text-center md:text-left">
									<div className="flex gap-10 text-zinc-500 font-mono text-[10px] uppercase tracking-[0.3em]">
										<div className="space-y-2">
											<p className="text-zinc-600 font-black text-[9px]">Dimensión</p>
											<p className="text-white flex items-center justify-center md:justify-start gap-2">
												<Ruler size={14} /> {selectedProduct.dimensions}
											</p>
										</div>
										<div className="space-y-2">
											<p className="text-zinc-600 font-black text-[9px]">Entrega</p>
											<p className="text-white flex items-center justify-center md:justify-start gap-2">
												<Clock size={14} /> {selectedProduct.delivery}
											</p>
										</div>
									</div>
									<div>
										<p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2 font-black">Precio Final</p>
										<p className="text-4xl md:text-5xl font-black text-white">${selectedProduct.price.toLocaleString()}</p>
									</div>
								</div>

								<div className="flex flex-col sm:flex-row gap-4 justify-center pb-12">
									<SilverGoldButton className="w-full sm:w-auto py-5 sm:px-16" onClick={() => goToCheckout(selectedProduct)}>
										Confirmar mi Pedido
									</SilverGoldButton>
									<button
										onClick={(e) => { handleAddToCart(e, selectedProduct); setSelectedProduct(null); }}
										className="w-full sm:w-auto py-5 sm:px-10 rounded-full border border-white/15 text-white/60 font-semibold text-[10px] uppercase tracking-widest hover:border-yellow-400/30 hover:text-white/80 transition-all"
									>
										Añadir al Carrito
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* ── HAMBURGER MENU DRAWER ── */}
			{isMenuOpen && (
				<div className="fixed inset-0 z-[210] flex justify-end">
					{/* Backdrop */}
					<div
						className="absolute inset-0 bg-black/70 backdrop-blur-md"
						onClick={() => setIsMenuOpen(false)}
					/>

					{/* Panel */}
					<div className="relative w-full max-w-[320px] bg-[#0a0a0c] border-l border-white/6 h-full flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] menu-drawer-enter overflow-hidden">
						{/* Gold top line */}
						<div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />

						{/* Header */}
						<div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
							<FabrickLogo />
							<button
								onClick={() => setIsMenuOpen(false)}
								className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-zinc-500 hover:border-white/25 hover:text-white transition-all"
							>
								<X size={15} />
							</button>
						</div>

						{/* User card */}
						{user ? (
							<div className="mx-4 mt-4 p-4 rounded-2xl border border-yellow-400/12 bg-yellow-400/5">
								<div className="flex items-center gap-3">
									<div className="w-10 h-10 rounded-2xl bg-yellow-400 flex items-center justify-center text-black font-black text-sm flex-shrink-0">
										{getInitials(user.name || user.email)}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-white text-sm font-semibold truncate">{user.name || 'Mi Cuenta'}</p>
										<p className="text-zinc-500 text-[10px] truncate">{user.email}</p>
									</div>
									<ChevronRight size={14} className="text-zinc-600 flex-shrink-0" />
								</div>
								<button
									onClick={() => { setIsMenuOpen(false); router.push('/mi-cuenta'); }}
									className="mt-3 w-full py-2 rounded-xl border border-yellow-400/20 text-yellow-400 text-[10px] font-bold uppercase tracking-wider hover:bg-yellow-400/10 transition-all"
								>
									Ver panel de pedidos
								</button>
							</div>
						) : (
							<div className="mx-4 mt-4 p-4 rounded-2xl border border-white/6 bg-white/3">
								<p className="text-zinc-400 text-xs mb-3">Inicia sesión para ver tu historial de pedidos</p>
								<button
									onClick={() => { setIsMenuOpen(false); router.push('/auth'); }}
									className="w-full py-2.5 rounded-xl bg-yellow-400 text-black font-black text-[10px] uppercase tracking-wider hover:bg-yellow-300 transition-all"
								>
									Ingresar / Registrarse
								</button>
							</div>
						)}

						{/* Navigation */}
						<nav className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
							<p className="text-[8px] uppercase tracking-[0.4em] text-zinc-600 mb-3 px-2">Navegación</p>

							<div className="space-y-1">
								{MENU_OPTIONS.map((item, i) => (
									<button
										key={item.label}
										onClick={() => handleMenuAction(item)}
										className="menu-item-hover menu-item-reveal w-full flex items-center gap-4 p-3.5 rounded-xl border border-transparent text-left group"
										style={{ animationDelay: `${120 + i * 55}ms` }}
									>
										<div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-400/12 transition-colors">
											<item.icon size={16} className="text-zinc-400 group-hover:text-yellow-400 transition-colors" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-white text-sm font-semibold leading-none mb-1">{item.label}</p>
											<p className="text-zinc-500 text-[10px] leading-none truncate">{item.description}</p>
										</div>
										<ChevronRight size={13} className="text-zinc-700 group-hover:text-yellow-400/60 transition-colors flex-shrink-0" />
									</button>
								))}
							</div>

							{/* Divider */}
							<div className="my-4 h-px bg-white/5 mx-2" />

							{/* Cart shortcut */}
							<button
								onClick={() => { setIsMenuOpen(false); setIsCartOpen(true); }}
								className="menu-item-hover w-full flex items-center gap-4 p-3.5 rounded-xl border border-transparent text-left group"
							>
								<div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 relative group-hover:bg-yellow-400/12 transition-colors">
									<ShoppingBag size={16} className="text-zinc-400 group-hover:text-yellow-400 transition-colors" />
									{cart.length > 0 && (
										<span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full text-black text-[8px] font-black flex items-center justify-center">
											{cart.length}
										</span>
									)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-white text-sm font-semibold leading-none mb-1">Mi Carrito</p>
									<p className="text-zinc-500 text-[10px] leading-none">
										{cart.length === 0 ? 'Carrito vacío' : `${cart.length} producto${cart.length !== 1 ? 's' : ''} — $${cartTotal.toLocaleString()}`}
									</p>
								</div>
								<ChevronRight size={13} className="text-zinc-700 group-hover:text-yellow-400/60 transition-colors flex-shrink-0" />
							</button>

							{/* Sign out (if logged in) */}
							{user && (
								<>
									<div className="my-4 h-px bg-white/5 mx-2" />
									<button
										onClick={() => void handleSignOut()}
										className="w-full flex items-center gap-4 p-3.5 rounded-xl border border-transparent hover:border-red-500/20 hover:bg-red-500/5 text-left group transition-all"
									>
										<div className="w-9 h-9 rounded-xl bg-red-500/8 flex items-center justify-center flex-shrink-0">
											<LogOut size={15} className="text-red-400/70 group-hover:text-red-400 transition-colors" />
										</div>
										<div className="flex-1">
											<p className="text-red-400/80 text-sm font-semibold group-hover:text-red-400 transition-colors">Cerrar Sesión</p>
											<p className="text-zinc-600 text-[10px]">Salir de tu cuenta</p>
										</div>
									</button>
								</>
							)}
						</nav>

						{/* Footer of menu */}
						<div className="px-6 pb-6 pt-4 border-t border-white/5">
							<div className="flex justify-center gap-5 mb-4">
								<a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-pink-400 transition-colors">
									<Instagram size={18} />
								</a>
								<a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-zinc-600 hover:text-blue-400 transition-colors">
									<Facebook size={18} />
								</a>
							</div>
							<p className="text-[8px] text-zinc-700 uppercase tracking-[0.6em] text-center">
								© 2026 Soluciones Fabrick
							</p>
						</div>

						{/* Bottom gold line */}
						<div className="h-px w-full bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
					</div>
				</div>
			)}

			{/* ── CART DRAWER ── */}
			{isCartOpen && (
				<div className="fixed inset-0 z-[220] flex items-center justify-center p-0 md:p-10 overflow-hidden">
					<div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
					<div className="relative w-full h-full max-w-4xl max-h-[88vh] bg-[#0a0a0c] md:rounded-[3rem] border border-white/6 shadow-2xl flex flex-col overflow-hidden cinematic-panel-enter">
						<div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/4 via-transparent to-yellow-400/4 opacity-60 pointer-events-none" />
						<svg className="absolute inset-0 w-full h-full pointer-events-none md:rounded-[3rem]">
							<rect width="100%" height="100%" fill="none" stroke="rgba(250,204,21,0.04)" strokeWidth="1" rx="48" />
							<rect width="100%" height="100%" fill="none" stroke="#FACC15" strokeWidth="1.5" strokeDasharray="10 1000" className="cart-border-run" rx="48" />
						</svg>

						{/* Cart header */}
						<div className="p-7 md:p-10 border-b border-white/5 flex items-center justify-between relative z-10 bg-black/50 backdrop-blur-md">
							<div>
								<p className="text-[9px] uppercase tracking-[0.4em] text-yellow-400/70">Tu Selección</p>
								<h3 className="text-xl font-black uppercase tracking-tight text-white">
									Mi Carrito {cart.length > 0 && <span className="text-yellow-400">({cart.length})</span>}
								</h3>
							</div>
							<button onClick={() => setIsCartOpen(false)} className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/25 transition-all">
								<X size={16} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 scrollbar-hide relative z-10">
							{cart.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center gap-5 opacity-30">
									<ShoppingBag size={60} />
									<p className="text-base font-black uppercase tracking-[0.5em]">Carrito Vacío</p>
									<p className="text-xs text-zinc-500">Explora nuestra boutique</p>
								</div>
							) : (
								cart.map((item, idx) => (
									<div key={`${item.id}-${idx}`} className="flex items-center gap-5 bg-white/3 p-5 rounded-2xl border border-white/5 hover:border-yellow-400/15 transition-all">
										<div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
											<img src={item.img} className="w-full h-full object-cover" alt={item.name} />
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
											<p className="text-yellow-400 text-sm font-mono mt-0.5">${item.price.toLocaleString()}</p>
											<p className="text-zinc-600 text-[10px] uppercase tracking-wider mt-1">{item.category}</p>
										</div>
										<button
											onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
											className="text-zinc-600 hover:text-red-400 p-2 transition-colors rounded-lg hover:bg-red-500/10"
										>
											<Trash2 size={16} />
										</button>
									</div>
								))
							)}
						</div>

						{cart.length > 0 && (
							<div className="p-7 md:p-10 bg-black/70 border-t border-white/5 flex flex-col gap-5 relative z-10">
								<div className="flex items-center justify-between">
									<span className="text-zinc-400 text-sm uppercase tracking-widest font-medium">Total</span>
									<span className="text-white text-2xl font-black">${cartTotal.toLocaleString()}</span>
								</div>
								<SilverGoldButton className="w-full py-5 text-[10px]" onClick={() => { setIsCartOpen(false); goToCheckout(); }}>
									Proceder al Pago
								</SilverGoldButton>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ── FOOTER ── */}
			<footer className="bg-black border-t border-white/5 relative z-10">
				{/* Top footer */}
				<div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-3 gap-10">
					{/* Brand */}
					<div className="sm:col-span-1 flex flex-col items-start gap-5">
						<FabrickLogo />
						<p className="text-zinc-500 text-xs leading-relaxed max-w-[200px]">
							Boutique de componentes premium para proyectos residenciales de alto estándar.
						</p>
						<div className="flex gap-4">
							<a href="https://instagram.com" target="_blank" rel="noreferrer" className="text-zinc-700 hover:text-pink-400 transition-all hover:scale-110">
								<Instagram size={18} />
							</a>
							<a href="https://facebook.com" target="_blank" rel="noreferrer" className="text-zinc-700 hover:text-blue-400 transition-all hover:scale-110">
								<Facebook size={18} />
							</a>
						</div>
					</div>

					{/* Links */}
					<div>
						<p className="text-[9px] uppercase tracking-[0.4em] text-zinc-600 mb-4">Tienda</p>
						<ul className="space-y-2.5">
							{[
								{ label: 'Catálogo', onClick: () => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' }) },
								{ label: 'Garantías', onClick: () => router.push('/garantias') },
								{ label: 'Contacto', onClick: () => router.push('/contacto') },
							].map((l) => (
								<li key={l.label}>
									<button onClick={l.onClick} className="text-zinc-500 text-sm hover:text-yellow-400 transition-colors">
										{l.label}
									</button>
								</li>
							))}
						</ul>
					</div>

					<div>
						<p className="text-[9px] uppercase tracking-[0.4em] text-zinc-600 mb-4">Mi Cuenta</p>
						<ul className="space-y-2.5">
							{[
								{ label: 'Iniciar Sesión', onClick: () => router.push('/auth') },
								{ label: 'Panel de Pedidos', onClick: () => router.push('/mi-cuenta') },
								{ label: 'Ajustes', onClick: () => router.push('/ajustes') },
							].map((l) => (
								<li key={l.label}>
									<button onClick={l.onClick} className="text-zinc-500 text-sm hover:text-yellow-400 transition-colors">
										{l.label}
									</button>
								</li>
							))}
						</ul>
					</div>
				</div>

				{/* Bottom bar */}
				<div className="border-t border-white/5 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
					<p className="text-[9px] text-zinc-700 uppercase tracking-[0.5em]">
						© 2026 Soluciones Fabrick SpA · Todos los derechos reservados
					</p>
					<div className="flex items-center gap-4">
						<span className="text-[9px] text-zinc-700 uppercase tracking-wider">Ingeniería para tu Vida</span>
						<div className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
					</div>
				</div>
			</footer>

			{/* ── EXIT CONFIRM ── */}
			{showExitConfirm && (
				<div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
					<div className="bg-zinc-950 border border-white/10 p-10 rounded-[2rem] max-w-sm w-full text-center space-y-6 shadow-2xl cinematic-panel-enter">
						<AlertCircle className="w-12 h-12 text-yellow-400 mx-auto animate-pulse" />
						<div className="space-y-2">
							<h3 className="text-lg font-black uppercase tracking-widest text-white">¿Regresar al Inicio?</h3>
							<p className="text-zinc-500 text-xs leading-relaxed">Tu carrito permanecerá guardado.</p>
						</div>
						<div className="flex flex-col gap-3">
							<button
								onClick={() => {
									setSelectedProduct(null);
									setShowExitConfirm(false);
									router.push('/');
								}}
								className="w-full py-4 bg-yellow-400 text-black font-black uppercase text-[10px] tracking-widest rounded-full hover:bg-yellow-300 transition-all"
							>
								Confirmar
							</button>
							<button
								onClick={() => setShowExitConfirm(false)}
								className="w-full py-4 bg-white/5 text-zinc-400 font-semibold uppercase text-[10px] tracking-widest rounded-full border border-white/8 hover:bg-white/8 transition-all"
							>
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}