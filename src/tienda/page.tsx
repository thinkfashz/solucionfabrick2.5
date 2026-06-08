'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { navigateWithTransition } from '@/lib/routeTransition';
import { useCatalogProducts, FALLBACK_CATALOG_PRODUCTS } from '@/hooks/useCatalogProducts';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/initials';
import { useTheme } from '@/context/ThemeContext';
import {
	ShoppingBag,
	ShieldCheck,
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
	ArrowRight,
	Phone,
	SlidersHorizontal,
	Search,
	Sun,
	Moon,
	Palette,
	Droplets,
	Wrench,
	Lightbulb,
	Smartphone,
	ShowerHead,
	Lock,
} from 'lucide-react';
import FabrickLogo3DLazy from '@/components/FabrickLogo3DLazy';
import BannerCarousel from '@/components/BannerCarousel';
import { useCartContext } from '@/context/CartContext';
import UiverseProductCard from '@/components/store/UiverseProductCard';
import UiverseSearchModal from '@/components/UiverseSearchModal';

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

const PRODUCTS: Product[] = FALLBACK_CATALOG_PRODUCTS as Product[];

const MENU_OPTIONS = [
	{ icon: Home, label: 'Inicio', description: 'Volver a la página principal', href: '/' },
	{ icon: LayoutGrid, label: 'Ver Catálogo', description: 'Explorar todos nuestros productos', href: '/tienda/catalogo' },
	{ icon: Award, label: 'Garantías', description: 'Conoce nuestra política de garantías', href: '/garantias' },
	{ icon: User, label: 'Mi Cuenta', description: 'Perfil y panel de pedidos', href: '/mi-cuenta' },
	{ icon: Settings, label: 'Ajustes', description: 'Configuración de tu cuenta', href: '/ajustes' },
];

/**
 * Versión "tienda" del logo de marca: misma cercha 3D (`FabrickLogo3DLazy`,
 * `showText={false}`) + wordmark HTML "SOLUCIONES FABRICK" que usa
 * `NavbarBrandLogo` en el navbar principal (ver `src/components/Navbar.tsx`),
 * para que el logo sea idéntico en toda la tienda y el checkout en lugar del
 * SVG plano que tenía esta página antes. A diferencia del navbar principal
 * (siempre sobre fondo oscuro), la tienda soporta tema claro/oscuro, así que
 * el wordmark adapta su color según `tone`.
 *
 * `size` controla el tamaño de la cercha y la tipografía del wordmark para
 * encajar en cada contexto (botón compacto del navbar, badge del hero,
 * encabezado del panel de producto, drawer del menú móvil).
 */
function StoreFabrickLogo({
	size = 'md',
	tone = 'dark',
	centered = false,
	active = false,
	className = '',
	onClick,
}: {
	size?: 'sm' | 'md' | 'lg';
	tone?: 'light' | 'dark';
	centered?: boolean;
	active?: boolean;
	className?: string;
	onClick?: () => void;
}) {
	const truss =
		size === 'sm' ? 'h-8 w-[40px]' : size === 'lg' ? 'h-16 w-[80px]' : 'h-11 w-[56px]';
	const wordmark =
		size === 'sm'
			? 'text-[9px] tracking-[0.1em]'
			: size === 'lg'
				? 'text-[15px] tracking-[0.16em] sm:text-[17px]'
				: 'text-[11px] tracking-[0.12em]';
	const wordmarkColor = tone === 'dark' ? 'text-white' : 'text-neutral-900';
	const glow = active ? 'drop-shadow-[0_0_12px_rgba(255,199,0,0.5)]' : '';

	return (
		<div
			onClick={onClick}
			className={`group flex select-none items-center gap-2 ${onClick ? 'cursor-pointer' : ''} ${centered ? 'flex-col text-center' : ''} ${className}`}
		>
			<div className={`relative flex-shrink-0 ${truss} ${glow} transition-all duration-300`}>
				<FabrickLogo3DLazy
					height="100%"
					interactive={false}
					showHint={false}
					showText={false}
					cameraZ={14}
				/>
			</div>
			<span className={`font-black uppercase leading-none ${wordmark} ${wordmarkColor}`}>
				SOLUCIONES <span className="text-[var(--accent)]">FABRICK</span>
			</span>
		</div>
	);
}
function SilverGoldButton({ children, onClick, className = '' }: { children: React.ReactNode; onClick?: React.MouseEventHandler<HTMLButtonElement>; className?: string }) {
	return (
		<button
			onClick={onClick}
			className={`group relative py-3 px-8 md:py-4 md:px-12 rounded-full font-black uppercase text-[8px] md:text-[10px] tracking-[0.4em] overflow-hidden transition-all duration-700 hover:scale-[1.05] active:scale-95 shadow-2xl border border-yellow-400/40 bg-[linear-gradient(135deg,#f3f4f6_0%,#d1d5db_50%,#9ca3af_100%)] text-black ${className}`}
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
	const { theme, toggleTheme, setTheme } = useTheme();
	const isDark = theme === 'dark' || theme === 'gold';
	const { products: catalogProducts, connected: realtimeConnected, fetchComplete } = useCatalogProducts();
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [cart, setCart] = useState<Product[]>([]);
	const [gsapReady, setGsapReady] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState('all');
	const [onlyDiscounted, setOnlyDiscounted] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchOpen, setSearchOpen] = useState(false);

	const cartIconRef = useRef<HTMLDivElement>(null);
	const gsapRef = useRef<null | typeof import('gsap').default>(null);
	// Tracks in-flight "add to cart" particle animations so we can kill the GSAP
	// tweens and remove the orphaned DOM nodes if the component unmounts mid-flight.
	const activeParticlesRef = useRef<Array<{ el: HTMLDivElement; tween: gsap.core.Tween }>>([]);

	const liveProducts = useMemo<Product[]>(() => {
		// After DB fetch completes, show the live result (possibly empty)
		if (fetchComplete) return catalogProducts as Product[];
		// While loading, show fallback products
		return catalogProducts.length ? (catalogProducts as Product[]) : PRODUCTS;
	}, [catalogProducts, fetchComplete]);

	const getFinalPrice = (product: Product) => {
		const pct = (product as { discountPercentage?: number }).discountPercentage ?? 0;
		return pct > 0 ? Math.round(product.price * (1 - pct / 100)) : product.price;
	};

	const categories = useMemo(() => {
		const set = new Set(liveProducts.map((p) => p.category).filter(Boolean));
		return ['all', ...Array.from(set)];
	}, [liveProducts]);

	const filteredProducts = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		return liveProducts.filter((product) => {
			if (q && !product.name.toLowerCase().includes(q) && !product.category.toLowerCase().includes(q)) return false;
			if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
			if (onlyDiscounted && !((product as { discountPercentage?: number }).discountPercentage ?? 0)) return false;
			return true;
		});
	}, [liveProducts, selectedCategory, onlyDiscounted, searchQuery]);

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
	const { addToCart: addToGlobalCart } = useCartContext();

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
		if (item.href) { navigateWithTransition(item.href, router); return; }
	};

	const handleSignOut = async () => {
		setIsMenuOpen(false);
		await signOut();
		router.push('/');
	};

	const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>, product: Product) => {
		setCart((prev) => [...prev, product]);
		// Sync to global CartContext so Navbar badge updates
		addToGlobalCart({
			id: product.id,
			name: product.name,
			price: product.price,
			image_url: product.img,
		} as Parameters<typeof addToGlobalCart>[0]);
		if (!cartIconRef.current || !gsapRef.current) return;

		const rect = e.currentTarget.getBoundingClientRect();
		const cartRect = cartIconRef.current.getBoundingClientRect();
		const particle = document.createElement('div');
		particle.className = 'fixed z-[600] w-14 h-14 bg-yellow-400 rounded-2xl shadow-[0_0_40px_#FACC15] pointer-events-none overflow-hidden';
		particle.style.left = `${rect.left}px`;
		particle.style.top = `${rect.top}px`;
		particle.innerHTML = `<img src="${product.img}" class="w-full h-full object-cover opacity-60" />`;
		document.body.appendChild(particle);

		const tween = gsapRef.current.to(particle, {
			duration: 1.2,
			x: cartRect.left - rect.left + 5,
			y: cartRect.top - rect.top + 5,
			scale: 0.1,
			rotation: 720,
			opacity: 0,
			ease: 'power4.inOut',
			onComplete: () => {
				// Drop from the tracking list once it finishes naturally
				activeParticlesRef.current = activeParticlesRef.current.filter((entry) => entry.el !== particle);
				particle.remove();
				if (!gsapRef.current || !cartIconRef.current) return;
				gsapRef.current.fromTo(cartIconRef.current, { scale: 1 }, { scale: 1.25, duration: 0.25, yoyo: true, repeat: 1 });
			},
		});

		// Track this particle/tween so we can kill it and remove the node on unmount
		activeParticlesRef.current.push({ el: particle, tween });
	};

	// Cleanup any in-flight "add to cart" particle animations on unmount so we
	// never leave orphaned DOM nodes or running GSAP tweens behind.
	useEffect(() => {
		return () => {
			activeParticlesRef.current.forEach(({ el, tween }) => {
				tween.kill();
				el.remove();
			});
			activeParticlesRef.current = [];
		};
	}, []);

	const handleSelectProduct = (product: Product) => {
		// Navigate to the full detail page so the user sees all information
		// (image, specs, stock, description, price breakdown) instead of the
		// in-page overlay which was confusing. Uses the same cinematic
		// transition overlay as the rest of the site for a consistent feel.
		navigateWithTransition(`/tienda/${product.id}`, router);
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
		<div className={`min-h-[100dvh] font-sans overflow-x-hidden relative transition-colors duration-300 ${isDark ? 'bg-zinc-950 text-white' : 'bg-white text-black'}`}>
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
				.product-3d-wrap {
					perspective: 1200px;
				}
				.product-3d-card {
					transform-style: preserve-3d;
					transition: transform 550ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 550ms cubic-bezier(0.22, 1, 0.36, 1);
				}
				.product-3d-wrap:hover .product-3d-card {
					transform: rotateX(4deg) rotateY(-6deg) translateY(-6px);
					box-shadow: 0 38px 90px rgba(0,0,0,0.78), 0 0 0 1px rgba(250,204,21,0.2) inset;
				}
				/* Hero animations */
				@keyframes heroFloat { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
				@keyframes heroGlow { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
				@keyframes slideInUp { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: translateY(0); } }
				@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
				@keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
				@keyframes themeToggleSpin { from { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(0.8); } to { transform: rotate(360deg) scale(1); } }
				.theme-toggle-btn { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
				.theme-toggle-btn:hover { transform: scale(1.1) rotate(12deg); }
				.theme-toggle-btn:active { transform: scale(0.9) rotate(-12deg); }
				.hero-animate { animation: slideInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) both; }
				.hero-animate-delay-1 { animation: slideInUp 0.9s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both; }
				.hero-animate-delay-2 { animation: slideInUp 0.9s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both; }
				.hero-animate-delay-3 { animation: slideInUp 0.9s 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
				.hero-badge { animation: fadeInScale 0.6s 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
				.shimmer-text {
					background: linear-gradient(90deg, #111 0%, #555 40%, #FFC700 50%, #555 60%, #111 100%);
					background-size: 200% auto;
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
					animation: shimmer 3s linear infinite;
				}
				.shimmer-text-dark {
					background: linear-gradient(90deg, #fff 0%, #aaa 40%, #FFC700 50%, #aaa 60%, #fff 100%);
					background-size: 200% auto;
					-webkit-background-clip: text;
					-webkit-text-fill-color: transparent;
					background-clip: text;
					animation: shimmer 3s linear infinite;
				}
				/* Advertisers / brand logos */
				@keyframes brandMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
				.brand-marquee { animation: brandMarquee 28s linear infinite; }
				.brand-marquee:hover { animation-play-state: paused; }
				/* Featured card glow */
				.feat-card { transition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s cubic-bezier(0.22,1,0.36,1); }
				.feat-card:hover { transform: translateY(-6px) scale(1.015); box-shadow: 0 24px 60px rgba(250,204,21,0.15), 0 4px 16px rgba(0,0,0,0.2); }
				.depth-glass {
					backdrop-filter: blur(10px);
					background: linear-gradient(150deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 100%);
				}
				.filter-pill-active {
					box-shadow: 0 0 24px rgba(250,204,21,0.23);
				}
				@keyframes mobileRevealUp {
					from { opacity: 0; transform: translateY(14px); }
					to { opacity: 1; transform: translateY(0); }
				}
				@media (max-width: 767px) {
					.mobile-stagger,
					.mobile-card-stagger {
						opacity: 0;
						animation: mobileRevealUp 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
					}
				}
			`}</style>

			{/* ── NAVBAR THEME-AWARE ── */}
			<nav className={`fixed top-0 left-0 w-full z-[100] backdrop-blur-xl border-b py-0 px-0 transition-all duration-300 ${isDark ? 'bg-zinc-950/95 border-white/10' : 'bg-white/95 border-neutral-200'}`}>
				<div className="max-w-[1400px] mx-auto px-4 md:px-8 h-[60px] flex items-center justify-between gap-4">
					{/* Logo */}
					<button onClick={() => router.push('/')} className={`flex-shrink-0 rounded-full border px-3 py-2 transition-all hover:border-yellow-400/60 hover:shadow-[0_14px_34px_rgba(250,204,21,0.18)] ${isDark ? 'border-white/10 bg-zinc-900/80' : 'border-neutral-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]'}`}>
						<div className="flex items-center gap-3">
							<StoreFabrickLogo size="sm" tone={isDark ? 'dark' : 'light'} className="pointer-events-none" />
							<span className={`hidden lg:inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.24em] ${isDark ? 'bg-white/10 text-white/50' : 'bg-neutral-100 text-neutral-500'}`}>
								Store
							</span>
						</div>
					</button>

					{/* Center nav links - desktop */}
					<div className="hidden md:flex items-center gap-6">
						<button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className={`text-sm font-medium transition-colors ${isDark ? 'text-white/70 hover:text-white' : 'text-neutral-700 hover:text-black'}`}>Catálogo</button>
						<button onClick={() => setSelectedCategory('Seguridad')} className={`text-sm font-medium transition-colors ${isDark ? 'text-white/70 hover:text-white' : 'text-neutral-700 hover:text-black'}`}>Seguridad</button>
						<button onClick={() => setSelectedCategory('Iluminación')} className={`text-sm font-medium transition-colors ${isDark ? 'text-white/70 hover:text-white' : 'text-neutral-700 hover:text-black'}`}>Iluminación</button>
						<button onClick={() => setOnlyDiscounted((v) => !v)} className={`text-sm font-medium transition-colors ${onlyDiscounted ? 'text-red-500' : isDark ? 'text-white/70 hover:text-white' : 'text-neutral-700 hover:text-black'}`}>Ofertas</button>
					</div>

					{/* Right actions */}
					<div className="flex items-center gap-1">
						<span title={realtimeConnected ? 'Catálogo en vivo' : 'Cargando'} className={`hidden sm:block w-1.5 h-1.5 rounded-full mr-2 ${realtimeConnected ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
						<button
							onClick={() => setSearchOpen(true)}
							className={`p-2 transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-neutral-700 hover:text-black'}`}
							aria-label="Buscar productos"
						>
							<Search size={20} />
						</button>
						{/* Theme toggle */}
						<button
							onClick={toggleTheme}
							className={`theme-toggle-btn p-2 rounded-full transition-all ${isDark ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-neutral-600 hover:bg-neutral-100'}`}
							aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
							title={isDark ? 'Modo claro' : 'Modo oscuro'}
						>
							{isDark ? <Sun size={18} /> : <Moon size={18} />}
						</button>
						{user ? (
							<button onClick={() => router.push('/mi-cuenta')} className={`p-2 transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-neutral-700 hover:text-black'}`} title="Mi Cuenta">
								<div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'bg-yellow-400 text-black' : 'bg-neutral-900 text-white'}`}>{getInitials(user.name || user.email)}</div>
							</button>
						) : (
							<button onClick={() => router.push('/auth')} className={`hidden sm:flex p-2 transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-neutral-700 hover:text-black'}`} aria-label="Ingresar">
								<User size={20} />
							</button>
						)}
						<div ref={cartIconRef} className={`relative cursor-pointer p-2 transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-neutral-700 hover:text-black'}`} onClick={() => setIsCartOpen(true)}>
							<ShoppingBag size={20} />
							{cart.length > 0 && (
								<span className={`absolute -top-0.5 right-0 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${isDark ? 'bg-yellow-400 text-black' : 'bg-black text-white'}`}>{cart.length}</span>
							)}
						</div>
						<button onClick={() => setIsMenuOpen(true)} className={`p-2 transition-colors md:hidden ${isDark ? 'text-white/60 hover:text-white' : 'text-neutral-700 hover:text-black'}`} aria-label="Menú">
							<Menu size={20} />
						</button>
					</div>
				</div>
			</nav>

			{/* spacer for fixed navbar */}
			<div className="pt-[60px]" />

			{/* ── CATALOGUE ── */}
			{!selectedProduct && (
				<div className={`nike-store ${isDark ? 'bg-zinc-950 text-white' : 'bg-white text-black'}`}>
					<style>{`
						.nike-store { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
						.nike-headline { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900; letter-spacing: -0.02em; line-height: 0.95; text-transform: none; }
						.nike-card { transition: opacity 220ms ease; }
						.nike-card:hover .nike-card-img { transform: scale(1.04); }
						.nike-card-img { transition: transform 600ms cubic-bezier(0.22,1,0.36,1); }
						.nike-card-quickadd { opacity: 0; transform: translateY(6px); transition: opacity 220ms ease, transform 220ms ease; }
						.nike-card:hover .nike-card-quickadd { opacity: 1; transform: translateY(0); }
						/* Touch devices have no hover state — keep the quick-add CTA reachable with a thumb */
						@media (hover: none) {
							.nike-card-quickadd { opacity: 1; transform: translateY(0); }
						}
						.nike-pill { transition: background 180ms ease, color 180ms ease, border-color 180ms ease; }
						.nike-link { position: relative; }
						.nike-link::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; transform: scaleX(0); transform-origin: left; transition: transform 240ms ease; }
						.nike-link:hover::after { transform: scaleX(1); }
						.nike-scroll::-webkit-scrollbar { display: none; }
						.nike-scroll { -ms-overflow-style: none; scrollbar-width: none; scroll-snap-type: x mandatory; }
						.nike-snap { scroll-snap-align: start; }
						.nike-hero-grad { background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.85) 100%); }
						@keyframes nikeMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
						.nike-marquee { animation: nikeMarquee 32s linear infinite; }
						/* Hero cinematic overlay */
						.hero-overlay-dark { background: linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.2) 100%); }
						.hero-overlay-light { background: linear-gradient(135deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%); }
						/* Animated orbs */
						@keyframes orbFloat1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.05); } 66% { transform: translate(-20px,15px) scale(0.97); } }
						@keyframes orbFloat2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-25px,20px) scale(1.08); } 66% { transform: translate(15px,-15px) scale(0.95); } }
						.orb1 { animation: orbFloat1 12s ease-in-out infinite; }
						.orb2 { animation: orbFloat2 16s ease-in-out infinite; }
					`}</style>

					{/* Announcement bar */}
					<div className="border-b overflow-hidden px-4 py-2.5 flex items-center justify-center gap-3 text-[13px]"
						style={{ borderColor: 'rgba(255,248,237,0.1)', background: 'linear-gradient(90deg,rgba(255,210,41,0.09),rgba(255,255,255,0.022),rgba(255,210,41,0.09))', color: '#dfd5c7', minHeight: '38px', whiteSpace: 'nowrap' }}>
						<span style={{ color: '#ffd229' }}>✦</span>
						<span><b style={{ color: '#ffd229', fontWeight: 900 }}>Instalación certificada</b> · Envío gratis sobre $79.990 · Asesoría por WhatsApp</span>
						<div className="hidden md:flex items-center gap-5 ml-auto text-[11px]">
							<button onClick={() => router.push('/garantias')} style={{ color: '#b9afa2' }} className="hover:text-yellow-400 transition-colors">Ayuda</button>
							<button onClick={() => router.push('/mi-cuenta')} style={{ color: '#b9afa2' }} className="hover:text-yellow-400 transition-colors">Mi cuenta</button>
							<button onClick={() => router.push('/contacto')} style={{ color: '#b9afa2' }} className="hover:text-yellow-400 transition-colors">Contacto</button>
						</div>
					</div>

					{/* Breadcrumb */}
					<nav className={`max-w-[1400px] mx-auto px-4 md:px-8 pt-5 pb-2 text-[12px] ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>
						<ol className="flex items-center gap-1.5">
							<li><button onClick={() => router.push('/')} className={`nike-link hover:text-yellow-500 transition-colors ${isDark ? 'after:bg-yellow-400' : 'after:bg-black'}`}>Inicio</button></li>
							<li>/</li>
							<li className={`font-medium ${isDark ? 'text-white' : 'text-black'}`}>Tienda</li>
						</ol>
					</nav>

					{/* ── HERO BENTO LAYOUT ── */}
					<section className="max-w-[1400px] mx-auto px-4 md:px-8 mt-3">
						<div className="grid grid-cols-1 lg:grid-cols-[1.08fr_0.92fr] gap-4 items-stretch">
							{/* hero-main */}
							<article className="relative min-h-[580px] overflow-hidden rounded-[40px] border border-yellow-400/20 shadow-[0_30px_90px_rgba(0,0,0,0.5)] isolate"
								style={{ background: 'linear-gradient(115deg,rgba(8,7,6,0.95) 0%,rgba(8,7,6,0.75) 42%,rgba(8,7,6,0.25) 100%), url("https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=80") center/cover no-repeat' }}>
								<div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 18% 18%,rgba(255,210,41,0.15),transparent 22rem), linear-gradient(0deg,rgba(5,5,4,0.95),transparent 45%)' }} />
								<div className="relative z-10 h-full flex flex-col justify-between gap-8 p-8 md:p-11">
									<div>
										<span className="inline-flex items-center gap-2.5 text-yellow-400 text-[11px] font-black uppercase tracking-[0.34em]">
											<span className="w-8 h-px bg-gradient-to-r from-yellow-400 to-transparent" />
											Tienda profesional
										</span>
										<h1 className="mt-4 font-playfair text-[clamp(44px,7vw,86px)] font-black leading-[0.9] tracking-tight text-white max-w-[640px] text-balance">
											Compra materiales premium y agenda <span className="text-yellow-400">instalación</span>.
										</h1>
										<p className="mt-5 text-[#e7ddd0] text-[17px] leading-[1.7] max-w-[540px]">
											Materiales curados, instalados por nuestro equipo certificado. Despacho a la Región del Maule con asesoría directa.
										</p>
										<div className="mt-7 flex flex-wrap gap-3">
											<button
												onClick={() => navigateWithTransition('/tienda/catalogo', router)}
												className="min-h-[52px] px-7 rounded-full inline-flex items-center gap-2.5 text-[13px] font-black uppercase tracking-[0.08em] text-black transition-all duration-300 hover:shadow-[0_20px_62px_rgba(255,210,41,0.32)] hover:-translate-y-0.5"
												style={{ background: 'linear-gradient(180deg,#ffe260,#ffc800)' }}
											>
												Explorar catálogo <ArrowRight size={15} />
											</button>
											<button
												onClick={() => router.push('/contacto')}
												className="min-h-[52px] px-7 rounded-full inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-white border border-white/20 backdrop-blur-sm hover:-translate-y-0.5 hover:border-yellow-400/40 transition-all duration-300"
												style={{ background: 'rgba(255,255,255,0.075)' }}
											>
												Asesoría gratis
											</button>
										</div>
									</div>
									<div className="grid grid-cols-3 gap-3 max-w-[600px]">
										{([
											{ n: '4.9★', label: 'Calificación promedio' },
											{ n: '24–48h', label: 'Despacho en stock' },
											{ n: '100%', label: 'Asesoría antes de comprar' },
										] as const).map(({ n, label }) => (
											<div key={label} className="rounded-[18px] border border-white/12 backdrop-blur-sm p-3.5" style={{ background: 'rgba(10,9,8,0.55)' }}>
												<b className="block text-[22px] font-black text-white leading-none tracking-[-0.03em]">{n}</b>
												<span className="text-[#b9afa2] text-[11px] mt-1 block">{label}</span>
											</div>
										))}
									</div>
								</div>
							</article>

							{/* hero-side */}
							<aside className="hidden lg:grid grid-rows-2 gap-4">
								{/* Category card */}
								<article className="rounded-[38px] border border-white/10 p-7 overflow-hidden relative"
									style={{ background: 'radial-gradient(circle at 88% 10%,rgba(255,210,41,0.14),transparent 16rem), linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)), #0d0c0b', boxShadow: '0 18px 70px rgba(0,0,0,0.25)' }}>
									<span className="inline-flex items-center gap-2.5 text-yellow-400 text-[11px] font-black uppercase tracking-[0.34em]">
										<span className="w-8 h-px bg-gradient-to-r from-yellow-400 to-transparent" />Categorías
									</span>
									<h2 className="mt-3 font-playfair text-[clamp(26px,3.2vw,38px)] font-black text-white leading-[0.97] text-balance tracking-tight">
										Catálogo ordenado para vender más.
									</h2>
									<p className="mt-2.5 text-[#b9afa2] text-sm leading-relaxed">Explora por categoría o busca directamente en el catálogo en tiempo real.</p>
									<div className="mt-5 grid grid-cols-3 gap-2.5">
										{([
											{ label: 'Pisos', onClick: () => { setSelectedCategory('Pisos'); } },
											{ label: 'Seguridad', onClick: () => { setSelectedCategory('Seguridad'); } },
											{ label: 'Iluminación', onClick: () => { setSelectedCategory('Iluminación'); } },
										] as const).map(({ label, onClick }) => (
											<button key={label} onClick={onClick}
												className="min-h-[100px] rounded-[20px] border border-white/10 flex flex-col justify-end gap-2 p-3 text-left hover:border-yellow-400/35 hover:bg-yellow-400/5 transition-all duration-200 relative overflow-hidden"
												style={{ background: '#0d0c0b' }}>
												<div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 80% -20%, rgba(255,210,41,0.18), transparent 55%)' }} />
												<b className="relative text-white text-[12px] font-black uppercase tracking-[0.04em]">{label}</b>
											</button>
										))}
									</div>
								</article>

								{/* Service/project card */}
								<article className="rounded-[38px] overflow-hidden border border-white/8 relative flex flex-col justify-end p-7"
									style={{ background: 'linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.84)), url("https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=1200&q=80") center/cover no-repeat', boxShadow: '0 30px 90px rgba(0,0,0,0.48)', minHeight: '260px' }}>
									<span className="inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-black mb-4" style={{ background: '#ffd229' }}>
										Agenda + instalación
									</span>
									<h3 className="font-playfair text-[clamp(30px,3.8vw,52px)] font-black text-white leading-[0.96] tracking-tight text-balance">
										Del producto a la obra terminada.
									</h3>
									<p className="mt-3 text-[#e5ddd0] text-sm leading-relaxed max-w-[400px]">
										Cada producto puede conectar con compra directa, cotización o agenda de instalación en tu zona.
									</p>
									<div className="mt-5">
										<button
											onClick={() => router.push('/contacto')}
											className="min-h-[50px] px-6 rounded-full inline-flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.08em] text-black hover:-translate-y-0.5 transition-all duration-300"
											style={{ background: 'linear-gradient(180deg,#ffe260,#ffc800)' }}
										>
											Agendar evaluación <ArrowRight size={13} />
										</button>
									</div>
								</article>
							</aside>
						</div>
					</section>

					{/* Marquee strip - promo */}
					<section className={`overflow-hidden border-y mt-10 ${isDark ? 'border-white/10 bg-zinc-900' : 'border-neutral-200 bg-white'}`}>
						<div className="flex gap-12 py-3 nike-marquee whitespace-nowrap">
							{Array.from({ length: 2 }).map((_, mi) => (
								<div key={mi} className="flex gap-12 shrink-0">
									{['★ Despacho a todo Chile','★ Instalación certificada','★ Garantía extendida','★ Pago en cuotas','★ Asesoría gratuita','★ Catálogo en tiempo real'].map((t) => (
										<span key={t} className={`text-[12px] uppercase tracking-[0.3em] ${isDark ? 'text-zinc-400' : 'text-neutral-600'}`}>{t}</span>
									))}
								</div>
							))}
						</div>
					</section>

					{/* ── ANUNCIANTES / MARCAS PARTNER ── */}
					<section className={`overflow-hidden border-b py-10 ${isDark ? 'bg-zinc-900/60 border-white/8' : 'bg-neutral-50 border-neutral-200'}`}>
						<div className="max-w-[1400px] mx-auto px-4 md:px-8 mb-7 text-center">
							<p className="text-[9px] uppercase tracking-[0.5em] text-yellow-400/70 font-bold mb-2">Anuncia con nosotros</p>
							<h3 className={`font-playfair text-xl md:text-2xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
								Marcas líderes que ya confían en Fabrick
							</h3>
							<p className={`mt-2 max-w-xl mx-auto text-xs leading-relaxed ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>
								Tu logotipo junto a los fabricantes que ya forman parte del catálogo que instalamos en obra. Espacios publicitarios disponibles — <a href="/contacto" className="text-yellow-500 font-semibold hover:underline">conversemos</a>.
							</p>
						</div>
						<div className="overflow-hidden">
							<div className="flex brand-marquee whitespace-nowrap gap-0">
								{Array.from({ length: 2 }).map((_, bi) => (
									<div key={bi} className="flex shrink-0 items-center gap-5 px-6">
										{[
											{ name: 'BOSCH', Icon: Zap },
											{ name: 'GROHE', Icon: Droplets },
											{ name: 'SIEMENS', Icon: Wrench },
											{ name: 'PHILIPS', Icon: Lightbulb },
											{ name: 'SAMSUNG', Icon: Smartphone },
											{ name: 'MOEN', Icon: ShowerHead },
											{ name: 'SCHNEIDER', Icon: Settings },
											{ name: 'LUTRON', Icon: SlidersHorizontal },
											{ name: 'YALE', Icon: Lock },
											{ name: 'LG', Icon: Home },
										].map((brand) => {
											const BrandIcon = brand.Icon;
											return (
												<div
													key={`${bi}-${brand.name}`}
													className={`group/brand flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all duration-300 cursor-default select-none ${isDark ? 'border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent hover:border-yellow-400/40 hover:from-yellow-400/[0.08]' : 'border-neutral-200 bg-white hover:border-yellow-300 hover:shadow-md'}`}
												>
													<span className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${isDark ? 'border-white/15 bg-white/5 text-zinc-400 group-hover/brand:border-yellow-400/50 group-hover/brand:text-yellow-400' : 'border-neutral-200 bg-neutral-50 text-neutral-400 group-hover/brand:border-yellow-400 group-hover/brand:text-yellow-500'}`}>
														<BrandIcon className="h-4 w-4" strokeWidth={1.75} />
													</span>
													<span className={`font-playfair text-base md:text-lg font-bold tracking-[0.12em] transition-colors ${isDark ? 'text-zinc-300 group-hover/brand:text-white' : 'text-neutral-600 group-hover/brand:text-neutral-900'}`}>
														{brand.name}
													</span>
												</div>
											);
										})}
									</div>
								))}
							</div>
						</div>
					</section>

					{/* Featured horizontal carousel - "Lo último" */}
					{filteredProducts.length > 0 && (
						<section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-12">
							<div className="flex items-end justify-between mb-5">
								<div>
									<p className={`text-[10px] uppercase tracking-[0.3em] mb-1 font-semibold ${isDark ? 'text-yellow-400/70' : 'text-yellow-600/80'}`}>Destacados</p>
									<h2 className="nike-headline text-xl md:text-2xl">Lo último. Lo mejor.</h2>
								</div>
								<div className="flex items-center gap-3">
									<span className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : isDark ? 'bg-zinc-600' : 'bg-neutral-400'}`} />
									<span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-neutral-600'}`}>{realtimeConnected ? 'Catálogo en vivo' : 'Cargando…'}</span>
								</div>
							</div>
							<div className="nike-scroll flex gap-4 overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8 pb-4">
								{filteredProducts.slice(0, 8).map((p) => {
									const pct = (p as { discountPercentage?: number }).discountPercentage ?? 0;
									const finalPrice = getFinalPrice(p);
									return (
										<button
											key={`feat-${p.id}`}
											onClick={() => handleSelectProduct(p)}
											className="nike-snap shrink-0 w-[240px] md:w-[300px] text-left group feat-card"
										>
											<div className={`relative overflow-hidden rounded-xl aspect-square ${isDark ? 'bg-zinc-800' : 'bg-neutral-100'}`}>
												<img src={p.img} alt={p.name} className="w-full h-full object-cover nike-card-img transition-transform duration-700 group-hover:scale-105" />
												{pct > 0 && (
													<span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider shadow-lg">-{pct}%</span>
												)}
												{/* Quick-add overlay */}
												<div className={`nike-card-quickadd absolute bottom-3 left-3 right-3 rounded-lg overflow-hidden`}>
													<div className={`py-2.5 text-xs font-semibold text-center ${isDark ? 'bg-yellow-400 text-black' : 'bg-black text-white'}`}>Añadir al carrito</div>
												</div>
											</div>
											<div className="mt-3">
												<p className={`text-[10px] uppercase tracking-wider font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>✦ Nuevo</p>
												<p className={`text-sm font-medium mt-0.5 line-clamp-1 ${isDark ? 'text-white' : 'text-black'}`}>{p.name}</p>
												<p className={`text-xs line-clamp-1 ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{p.category}</p>
												<div className="mt-2 flex items-baseline gap-2">
													<span className={`text-sm font-semibold ${isDark ? 'text-yellow-400' : 'text-black'}`}>${finalPrice.toLocaleString('es-CL')}</span>
													{pct > 0 && <span className={`text-xs line-through ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>${p.price.toLocaleString('es-CL')}</span>}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</section>
					)}

					{/* "Más vendidos" horizontal carousel */}
					{liveProducts.length > 0 && (
						<section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-12 pb-2">
							<div className="flex items-end justify-between mb-5">
								<div>
									<p className={`text-[10px] uppercase tracking-[0.3em] mb-1 font-semibold ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>Favoritos del catálogo</p>
									<h2 className="nike-headline text-xl md:text-2xl">Más vendidos.</h2>
								</div>
								<button onClick={() => navigateWithTransition('/tienda/catalogo', router)} className={`text-sm font-medium underline underline-offset-4 hover:no-underline hidden md:block hover:text-yellow-500 transition-colors ${isDark ? 'text-zinc-400' : 'text-neutral-600'}`}>Ver todos →</button>
							</div>
							<div className="nike-scroll flex gap-4 overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8 pb-4">
								{[...liveProducts].sort((a, b) => ((b as { rating?: number }).rating ?? 4.4) - ((a as { rating?: number }).rating ?? 4.4)).slice(0, 8).map((p) => {
									const pct = (p as { discountPercentage?: number }).discountPercentage ?? 0;
									const finalPrice = getFinalPrice(p);
									const rating = (p as { rating?: number }).rating;
									return (
										<button key={`best-${p.id}`} onClick={() => handleSelectProduct(p)} className="nike-snap shrink-0 w-[200px] md:w-[260px] text-left group feat-card">
											<div className={`relative overflow-hidden rounded-xl aspect-[3/4] ${isDark ? 'bg-zinc-800' : 'bg-neutral-100'}`}>
												<img src={p.img} alt={p.name} className="w-full h-full object-cover nike-card-img transition-transform duration-700 group-hover:scale-105" />
												{pct > 0 && <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase shadow-lg">-{pct}%</span>}
												<div className="nike-card-quickadd absolute bottom-3 left-3 right-3">
													<button onClick={(e) => { e.stopPropagation(); handleAddToCart(e, p); }} className={`w-full rounded-full py-2.5 text-xs font-semibold transition-all duration-200 shadow-lg ${isDark ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-white text-black hover:bg-black hover:text-white'}`}>
														Añadir al carrito
													</button>
												</div>
											</div>
											<div className="mt-3">
												{rating && (
													<div className="flex items-center gap-1 mb-1">
														{[...Array(5)].map((_, si) => <Star key={si} size={10} className={si < Math.round(rating) ? (isDark ? 'text-yellow-400 fill-yellow-400' : 'text-black fill-black') : (isDark ? 'text-zinc-700 fill-zinc-700' : 'text-neutral-300 fill-neutral-300')} />)}
														<span className={`text-[10px] ml-0.5 ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{rating.toFixed(1)}</span>
													</div>
												)}
												<p className={`text-sm font-medium line-clamp-1 ${isDark ? 'text-white' : 'text-black'}`}>{p.name}</p>
												<p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{p.category}</p>
												<div className="mt-1.5 flex items-baseline gap-2">
													<span className={`text-sm font-semibold ${isDark ? 'text-yellow-400' : 'text-black'}`}>${finalPrice.toLocaleString('es-CL')}</span>
													{pct > 0 && <span className={`text-xs line-through ${isDark ? 'text-zinc-600' : 'text-neutral-400'}`}>${p.price.toLocaleString('es-CL')}</span>}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</section>
					)}

					{/* Acceso directo al catálogo completo */}
					<section id="nike-grid" className="max-w-[1400px] mx-auto px-4 md:px-8 pt-14 pb-4">
						<div className={`relative overflow-hidden rounded-[2rem] border ${isDark ? 'border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 via-zinc-900/85 to-black' : 'border-yellow-400/30 bg-gradient-to-br from-yellow-50 via-white to-neutral-50'}`}>
							<div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-yellow-400/15 blur-3xl pointer-events-none" />
							<div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
							<div className="relative z-10 grid md:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center p-6 md:p-10">
								<div>
									<p className="text-[10px] uppercase tracking-[0.4em] text-yellow-500 font-bold mb-3">Catálogo completo</p>
									<h2 className={`font-playfair text-2xl md:text-4xl font-bold leading-tight ${isDark ? 'text-white' : 'text-neutral-900'}`}>
										Explora los {liveProducts.length} productos<br className="hidden md:block" /> que instalamos en obra.
									</h2>
									<p className={`mt-3 max-w-lg text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-neutral-600'}`}>
										Búsqueda en tiempo real, filtros por categoría, precio y ofertas — ahora en su propia página, pensada para encontrar justo lo que tu proyecto necesita.
									</p>
									<div className="mt-6 flex flex-wrap gap-3">
										<button
											onClick={() => navigateWithTransition('/tienda/catalogo', router)}
											className="inline-flex items-center gap-2 rounded-full bg-yellow-400 text-black font-black uppercase text-[11px] tracking-[0.25em] px-7 py-3.5 hover:bg-yellow-300 transition-all hover:scale-105 shadow-[0_0_30px_rgba(250,204,21,0.3)]"
										>
											<LayoutGrid size={14} /> Ver catálogo completo
										</button>
										<button
											onClick={() => setSearchOpen(true)}
											className={`inline-flex items-center gap-2 rounded-full border font-bold uppercase text-[11px] tracking-[0.25em] px-7 py-3.5 transition-all ${isDark ? 'border-white/20 text-white hover:border-yellow-400/50 hover:text-yellow-300' : 'border-neutral-300 text-neutral-800 hover:border-black'}`}
										>
											<Search size={14} /> Buscar producto
										</button>
									</div>
								</div>
								<div className="grid grid-cols-3 gap-2.5">
									{liveProducts.slice(0, 6).map((p, i) => (
										<button
											key={`mini-${p.id}`}
											onClick={() => handleSelectProduct(p)}
											className={`relative overflow-hidden rounded-xl aspect-square group ${isDark ? 'bg-zinc-800' : 'bg-neutral-100'} ${i >= 4 ? 'hidden sm:block' : ''}`}
										>
											<img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
											<div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
										</button>
									))}
								</div>
							</div>
						</div>
					</section>

					{/* Trust strip */}
					<section className={`max-w-[1400px] mx-auto px-4 md:px-8 mt-2 mb-16 grid grid-cols-2 md:grid-cols-4 gap-6 border-t pt-10 ${isDark ? 'border-white/10' : 'border-neutral-200'}`}>
						{[
							{ icon: Award, title: 'Garantía real', desc: 'Cobertura extendida en todas las instalaciones.' },
							{ icon: Clock, title: 'Despacho rápido', desc: 'Entregas en 24-48h en stock disponible.' },
							{ icon: Sparkles, title: 'Curatoría premium', desc: 'Solo productos validados por nuestros expertos.' },
							{ icon: Phone, title: 'Asesoría dedicada', desc: 'Habla con un especialista antes de comprar.' },
						].map(({ icon: Icon, title, desc }) => (
							<div key={title} className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-neutral-50'}`}>
								<Icon size={20} className={`mt-0.5 flex-shrink-0 ${isDark ? 'text-yellow-400' : 'text-black'}`} />
								<div>
									<p className="text-sm font-bold">{title}</p>
									<p className={`text-xs mt-1 ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>{desc}</p>
								</div>
							</div>
						))}
					</section>

					{/* Hidden legacy intro retained for SEO crawlers */}
					<div className="sr-only">
						<h2>Catálogo Fabrick - materiales premium instalados</h2>
					</div>
				</div>
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
							aria-label="Cerrar detalle del producto"
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
									<StoreFabrickLogo size="md" tone="dark" active className="mb-4" />
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
										<p className="text-4xl md:text-5xl font-black text-white">${selectedProduct.price.toLocaleString('es-CL')}</p>
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
							<StoreFabrickLogo size="md" tone="dark" />
							<button
								onClick={() => setIsMenuOpen(false)}
								className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 text-zinc-500 hover:border-white/25 hover:text-white transition-all"
						aria-label="Cerrar menú"
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
								<a href="https://instagram.com" target="_blank" rel="noreferrer noopener" aria-label="Instagram" className="text-zinc-600 hover:text-pink-400 transition-colors">
									<Instagram size={18} />
								</a>
								<a href="https://facebook.com" target="_blank" rel="noreferrer noopener" aria-label="Facebook" className="text-zinc-600 hover:text-blue-400 transition-colors">
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

			{/* ── CART DRAWER (NIKE-STYLE, slides from right) ── */}
			{isCartOpen && (
				<div className="fixed inset-0 z-[220] flex justify-end">
					<div className="absolute inset-0 bg-black/40" onClick={() => setIsCartOpen(false)} />
					<div className="relative w-full max-w-[420px] bg-white h-full flex flex-col shadow-2xl animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
						{/* Header */}
						<div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
							<div>
								<h3 className="text-base font-bold text-black">Tu carrito</h3>
								{cart.length > 0 && <p className="text-xs text-neutral-500">{cart.length} producto{cart.length !== 1 ? 's' : ''}</p>}
							</div>
							<button onClick={() => setIsCartOpen(false)} className="p-2 text-neutral-500 hover:text-black transition-colors"
							aria-label="Cerrar carrito">
								<X size={20} />
							</button>
						</div>

						{/* Items */}
						<div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 nike-scroll">
							{cart.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center gap-4 text-center py-20">
									<ShoppingBag size={48} className="text-neutral-300" />
									<p className="font-medium text-neutral-700">Tu carrito está vacío</p>
									<p className="text-sm text-neutral-500">Agrega productos para comenzar</p>
									<button onClick={() => setIsCartOpen(false)} className="mt-2 bg-black text-white rounded-full px-6 py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors">Ver productos</button>
								</div>
							) : (
								cart.map((item, idx) => (
									<div key={`${item.id}-${idx}`} className="flex items-center gap-4 py-3 border-b border-neutral-100 last:border-0">
										<div className="w-16 h-16 bg-neutral-100 rounded overflow-hidden flex-shrink-0">
											<img src={item.img} className="w-full h-full object-cover" alt={item.name} />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-black line-clamp-2 leading-tight">{item.name}</p>
											<p className="text-xs text-neutral-500 mt-0.5">{item.category}</p>
											<p className="text-sm font-semibold text-black mt-1">${item.price.toLocaleString('es-CL')}</p>
										</div>
										<button onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))} className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors flex-shrink-0" aria-label="Eliminar del carrito">
											<Trash2 size={16} />
										</button>
									</div>
								))
							)}
						</div>

						{/* Footer */}
						{cart.length > 0 && (
							<div className="px-6 py-5 border-t border-neutral-200 space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-neutral-700">Subtotal</span>
									<span className="text-base font-bold text-black">${cartTotal.toLocaleString('es-CL')}</span>
								</div>
								<p className="text-xs text-neutral-500">Impuestos y envío calculados al pagar</p>
								<button onClick={() => { setIsCartOpen(false); goToCheckout(); }} className="w-full bg-black text-white rounded-full py-3.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
									Pagar — ${cartTotal.toLocaleString('es-CL')}
								</button>
								<button onClick={() => setIsCartOpen(false)} className="w-full border border-neutral-300 rounded-full py-3 text-sm font-medium text-neutral-700 hover:border-black hover:text-black transition-colors">
									Seguir comprando
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{/* ── FOOTER (NIKE-STYLE) ── */}
			<footer className="bg-[#111] text-white relative z-10">
				<div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-14 pb-8 grid grid-cols-2 md:grid-cols-4 gap-8 border-b border-white/10">
					{/* Brand */}
					<div className="col-span-2 md:col-span-1 space-y-4">
						<svg viewBox="0 0 200 40" className="h-8 w-auto" role="img" aria-label="Fabrick">
							<defs>
								<linearGradient id="ft-gold" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#FFE566" />
									<stop offset="100%" stopColor="#FFC700" />
								</linearGradient>
							</defs>
							<path d="M 1,35 L 16,3 L 31,35 L 25,35 L 16,10 L 7,35 Z" fill="url(#ft-gold)" />
							<rect x="19" y="8" width="6" height="16" rx="1" fill="#FFC700" />
							<text x="40" y="28" fontFamily="Helvetica Neue,Helvetica,Arial,sans-serif" fontSize="22" fontWeight="900" letterSpacing="1" fill="#fff">FABRICK</text>
						</svg>
						<p className="text-sm text-neutral-400 leading-relaxed max-w-[200px]">Materiales premium instalados por expertos en tu obra.</p>
						<div className="flex gap-4">
							<a href="https://instagram.com" target="_blank" rel="noreferrer noopener" aria-label="Instagram" className="text-neutral-500 hover:text-white transition-colors"><Instagram size={18} /></a>
							<a href="https://facebook.com" target="_blank" rel="noreferrer noopener" aria-label="Facebook" className="text-neutral-500 hover:text-white transition-colors"><Facebook size={18} /></a>
						</div>
					</div>
					<div>
						<p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4 font-medium">Tienda</p>
						<ul className="space-y-3">
							{[['Catálogo completo', '/tienda/catalogo'], ['Seguridad', null], ['Iluminación', null], ['Ofertas activas', null]].map(([label, href]) => (
								<li key={label as string}>
									<button onClick={() => href ? navigateWithTransition(href, router) : null} className="text-sm text-neutral-400 hover:text-white transition-colors">{label}</button>
								</li>
							))}
						</ul>
					</div>
					<div>
						<p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4 font-medium">Ayuda</p>
						<ul className="space-y-3">
							{[['Garantías', '/garantias'], ['Contacto', '/contacto'], ['Preguntas frecuentes', '/contacto']].map(([label, href]) => (
								<li key={label}><button onClick={() => router.push(href)} className="text-sm text-neutral-400 hover:text-white transition-colors">{label}</button></li>
							))}
						</ul>
					</div>
					<div>
						<p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 mb-4 font-medium">Mi Cuenta</p>
						<ul className="space-y-3">
							{[['Ingresar', '/auth'], ['Mis pedidos', '/mi-cuenta'], ['Configuración', '/ajustes']].map(([label, href]) => (
								<li key={label}><button onClick={() => router.push(href)} className="text-sm text-neutral-400 hover:text-white transition-colors">{label}</button></li>
							))}
						</ul>
					</div>
				</div>
				<div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-neutral-600">
					<p>© 2026 Soluciones Fabrick SpA. Todos los derechos reservados.</p>
					<div className="flex items-center gap-3">
						<span>Ingeniería para tu vida</span>
						<span className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
					</div>
				</div>
			</footer>

			{/* ── SEARCH MODAL ── */}
			<UiverseSearchModal
				open={searchOpen}
				value={searchQuery}
				onChange={(v) => setSearchQuery(v)}
				onClose={() => setSearchOpen(false)}
				onFilterClick={() => { setSearchOpen(false); navigateWithTransition('/tienda/catalogo', router); }}
				resultCount={searchQuery.trim() ? filteredProducts.length : undefined}
			/>

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