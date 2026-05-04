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
	SlidersHorizontal,
	ArrowUpDown,
	Tag,
} from 'lucide-react';
import BannerCarousel from '@/components/BannerCarousel';
import { useCartContext } from '@/context/CartContext';

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
	const { products: catalogProducts, connected: realtimeConnected, fetchComplete } = useCatalogProducts();
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [cart, setCart] = useState<Product[]>([]);
	const [gsapReady, setGsapReady] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState('all');
	const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'mid' | 'high'>('all');
	const [sortMode, setSortMode] = useState<'featured' | 'price-asc' | 'price-desc' | 'name-asc'>('featured');
	const [onlyDiscounted, setOnlyDiscounted] = useState(false);
	const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

	const cartIconRef = useRef<HTMLDivElement>(null);
	const gsapRef = useRef<null | typeof import('gsap').default>(null);

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
		const base = liveProducts.filter((product) => {
			if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
			const finalPrice = getFinalPrice(product);
			if (priceFilter === 'low' && finalPrice > 80000) return false;
			if (priceFilter === 'mid' && (finalPrice <= 80000 || finalPrice > 150000)) return false;
			if (priceFilter === 'high' && finalPrice <= 150000) return false;
			if (onlyDiscounted && !((product as { discountPercentage?: number }).discountPercentage ?? 0)) return false;
			return true;
		});

		const sorted = [...base];
		sorted.sort((a, b) => {
			if (sortMode === 'price-asc') return getFinalPrice(a) - getFinalPrice(b);
			if (sortMode === 'price-desc') return getFinalPrice(b) - getFinalPrice(a);
			if (sortMode === 'name-asc') return a.name.localeCompare(b.name, 'es');
			const aScore = ((a as { rating?: number }).rating ?? 4.4) + (((a as { discountPercentage?: number }).discountPercentage ?? 0) / 20);
			const bScore = ((b as { rating?: number }).rating ?? 4.4) + (((b as { discountPercentage?: number }).discountPercentage ?? 0) / 20);
			return bScore - aScore;
		});
		return sorted;
	}, [liveProducts, selectedCategory, priceFilter, onlyDiscounted, sortMode]);

	const totalSavingsFiltered = useMemo(() => {
		return filteredProducts.reduce((acc, product) => {
			const original = product.price;
			const final = getFinalPrice(product);
			return acc + Math.max(0, original - final);
		}, 0);
	}, [filteredProducts]);

	const getDeliveryBadge = (product: Product) => {
		const raw = (product.delivery || '').toLowerCase();
		const days = Number(raw.replace(/\D/g, ''));
		if (raw.includes('inmediata') || raw.includes('24h')) {
			return { label: 'Envio express', className: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' };
		}
		if (Number.isFinite(days) && days > 0 && days <= 2) {
			return { label: `${days} dias`, className: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' };
		}
		if (Number.isFinite(days) && days <= 5) {
			return { label: `${days} dias`, className: 'border-yellow-400/30 bg-yellow-500/15 text-yellow-300' };
		}
		if (Number.isFinite(days) && days > 5) {
			return { label: `${days} dias`, className: 'border-red-400/30 bg-red-500/15 text-red-300' };
		}
		return { label: 'Plazo normal', className: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-300' };
	};

	const getStockBadge = (product: Product) => {
		const stock = Number((product as { stock?: number | string }).stock ?? NaN);
		if (!Number.isFinite(stock)) {
			return { label: 'Stock por confirmar', className: 'border-zinc-500/30 bg-zinc-500/15 text-zinc-300' };
		}
		if (stock <= 3) {
			return { label: `Stock critico: ${stock}`, className: 'border-red-400/35 bg-red-500/15 text-red-300' };
		}
		if (stock <= 10) {
			return { label: `Stock bajo: ${stock}`, className: 'border-yellow-400/30 bg-yellow-500/15 text-yellow-300' };
		}
		return { label: `Stock: ${stock}`, className: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' };
	};

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
		router.push(`/tienda/${product.id}`);
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
		<div className="bg-white text-black min-h-[100dvh] font-sans overflow-x-hidden relative">
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

			{/* ── NAVBAR (NIKE-STYLE WHITE) ── */}
			<nav className="fixed top-0 left-0 w-full z-[100] bg-white border-b border-neutral-200 py-0 px-0 transition-all duration-300">
				<div className="max-w-[1400px] mx-auto px-4 md:px-8 h-[60px] flex items-center justify-between gap-4">
					{/* Logo */}
					<button onClick={() => router.push('/')} className="flex-shrink-0">
						<svg viewBox="0 0 200 40" className="h-8 w-auto" role="img" aria-label="Soluciones Fabrick">
							<defs>
								<linearGradient id="nb-gold" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#FFE566" />
									<stop offset="100%" stopColor="#FFC700" />
								</linearGradient>
							</defs>
							<path d="M 1,35 L 16,3 L 31,35 L 25,35 L 16,10 L 7,35 Z" fill="url(#nb-gold)" />
							<rect x="19" y="8" width="6" height="16" rx="1" fill="#FFC700" />
							<text x="40" y="28" fontFamily="Helvetica Neue,Helvetica,Arial,sans-serif" fontSize="22" fontWeight="900" letterSpacing="1" fill="#111">FABRICK</text>
						</svg>
					</button>

					{/* Center nav links - desktop */}
					<div className="hidden md:flex items-center gap-6">
						<button onClick={() => document.getElementById('nike-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-sm font-medium text-neutral-700 hover:text-black transition-colors">Catálogo</button>
						<button onClick={() => setSelectedCategory('Seguridad')} className="text-sm font-medium text-neutral-700 hover:text-black transition-colors">Seguridad</button>
						<button onClick={() => setSelectedCategory('Iluminación')} className="text-sm font-medium text-neutral-700 hover:text-black transition-colors">Iluminación</button>
						<button onClick={() => setOnlyDiscounted((v) => !v)} className={`text-sm font-medium transition-colors ${onlyDiscounted ? 'text-red-600' : 'text-neutral-700 hover:text-black'}`}>Ofertas</button>
					</div>

					{/* Right actions */}
					<div className="flex items-center gap-1">
						<span title={realtimeConnected ? 'Catálogo en vivo' : 'Cargando'} className={`hidden sm:block w-1.5 h-1.5 rounded-full mr-2 ${realtimeConnected ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
						{user ? (
							<button onClick={() => router.push('/mi-cuenta')} className="p-2 text-neutral-700 hover:text-black transition-colors" title="Mi Cuenta">
								<div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold">{getInitials(user.name || user.email)}</div>
							</button>
						) : (
							<button onClick={() => router.push('/auth')} className="hidden sm:flex p-2 text-neutral-700 hover:text-black transition-colors" aria-label="Ingresar">
								<User size={20} />
							</button>
						)}
						<div ref={cartIconRef} className="relative cursor-pointer p-2 text-neutral-700 hover:text-black transition-colors" onClick={() => setIsCartOpen(true)}>
							<ShoppingBag size={20} />
							{cart.length > 0 && (
								<span className="absolute -top-0.5 right-0 w-4 h-4 bg-black rounded-full flex items-center justify-center text-white text-[8px] font-bold">{cart.length}</span>
							)}
						</div>
						<button onClick={() => setIsMenuOpen(true)} className="p-2 text-neutral-700 hover:text-black transition-colors md:hidden" aria-label="Menú">
							<Menu size={20} />
						</button>
					</div>
				</div>
			</nav>

			{/* spacer for fixed navbar */}
			<div className="pt-[60px]" />

			{/* ── CATALOGUE (NIKE-STYLE) ── */}
			{!selectedProduct && (
				<div className="bg-white text-black nike-store">
					<style>{`
						.nike-store { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
						.nike-headline { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 900; letter-spacing: -0.02em; line-height: 0.95; text-transform: none; }
						.nike-card { transition: opacity 220ms ease; }
						.nike-card:hover .nike-card-img { transform: scale(1.04); }
						.nike-card-img { transition: transform 600ms cubic-bezier(0.22,1,0.36,1); }
						.nike-card-quickadd { opacity: 0; transform: translateY(6px); transition: opacity 220ms ease, transform 220ms ease; }
						.nike-card:hover .nike-card-quickadd { opacity: 1; transform: translateY(0); }
						.nike-pill { transition: background 180ms ease, color 180ms ease, border-color 180ms ease; }
						.nike-link { position: relative; }
						.nike-link::after { content: ''; position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; background: #111; transform: scaleX(0); transform-origin: left; transition: transform 240ms ease; }
						.nike-link:hover::after { transform: scaleX(1); }
						.nike-scroll::-webkit-scrollbar { display: none; }
						.nike-scroll { -ms-overflow-style: none; scrollbar-width: none; scroll-snap-type: x mandatory; }
						.nike-snap { scroll-snap-align: start; }
						.nike-hero-grad { background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.7) 100%); }
						@keyframes nikeMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
						.nike-marquee { animation: nikeMarquee 32s linear infinite; }
					`}</style>

					{/* Top promo bar */}
					<div className="bg-neutral-100 text-neutral-700 text-[11px] border-b border-neutral-200">
						<div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2 flex items-center justify-between">
							<span>Envío estándar gratis sobre $79.990</span>
							<div className="hidden md:flex items-center gap-5">
								<button onClick={() => router.push('/garantias')} className="hover:text-black">Ayuda</button>
								<button onClick={() => router.push('/mi-cuenta')} className="hover:text-black">Mi cuenta</button>
								<button onClick={() => router.push('/contacto')} className="hover:text-black">Contacto</button>
							</div>
						</div>
					</div>

					{/* Breadcrumb */}
					<nav className="max-w-[1400px] mx-auto px-4 md:px-8 pt-5 pb-2 text-[12px] text-neutral-500">
						<ol className="flex items-center gap-1.5">
							<li><button onClick={() => router.push('/')} className="hover:text-black nike-link">Inicio</button></li>
							<li>/</li>
							<li className="text-black font-medium">Tienda</li>
						</ol>
					</nav>

					{/* Editorial hero */}
					<section className="max-w-[1400px] mx-auto px-4 md:px-8 mt-2">
						<div className="relative overflow-hidden rounded-[2px] bg-neutral-100 aspect-[16/8] md:aspect-[16/6]">
							<img
								src="https://images.unsplash.com/photo-1581094288338-2314dddb7ece?q=80&w=1800&auto=format&fit=crop"
								alt="Fabrick"
								className="w-full h-full object-cover"
							/>
							<div className="absolute inset-0 nike-hero-grad" />
							<div className="absolute inset-0 flex items-end md:items-center">
								<div className="px-6 md:px-14 pb-10 md:pb-0 max-w-2xl text-white">
									<p className="text-[11px] md:text-[12px] uppercase tracking-[0.18em] mb-3 opacity-90">Lo último de Fabrick</p>
									<h1 className="nike-headline text-4xl md:text-7xl">Construye lo que sigue.</h1>
									<p className="mt-4 text-sm md:text-base opacity-90 max-w-md">Materiales premium curados, instalados por expertos, con garantía real. Diseñados para tu próxima obra.</p>
									<div className="mt-6 flex gap-3">
										<button onClick={() => { const el = document.getElementById('nike-grid'); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="bg-white text-black rounded-full px-6 py-3 text-sm font-medium hover:bg-neutral-200 transition-colors">Comprar</button>
										<button onClick={() => router.push('/contacto')} className="border border-white/70 text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-white/10 transition-colors">Asesoría</button>
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* Marquee strip */}
					<section className="overflow-hidden border-y border-neutral-200 bg-white mt-10">
						<div className="flex gap-12 py-3 nike-marquee whitespace-nowrap">
							{Array.from({ length: 2 }).map((_, mi) => (
								<div key={mi} className="flex gap-12 shrink-0">
									<span className="text-[12px] uppercase tracking-[0.3em] text-neutral-700">★ Despacho a todo Chile</span>
									<span className="text-[12px] uppercase tracking-[0.3em] text-neutral-700">★ Instalación certificada</span>
									<span className="text-[12px] uppercase tracking-[0.3em] text-neutral-700">★ Garantía extendida</span>
									<span className="text-[12px] uppercase tracking-[0.3em] text-neutral-700">★ Pago en cuotas</span>
									<span className="text-[12px] uppercase tracking-[0.3em] text-neutral-700">★ Asesoría gratuita</span>
									<span className="text-[12px] uppercase tracking-[0.3em] text-neutral-700">★ Catálogo en tiempo real</span>
								</div>
							))}
						</div>
					</section>

					{/* Featured horizontal carousel - "Lo último" */}
					{filteredProducts.length > 0 && (
						<section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-12">
							<div className="flex items-end justify-between mb-5">
								<h2 className="nike-headline text-xl md:text-2xl">Lo último. Lo mejor.</h2>
								<div className="flex items-center gap-3">
									<span className={`w-1.5 h-1.5 rounded-full ${realtimeConnected ? 'bg-emerald-500' : 'bg-neutral-400'}`} />
									<span className="text-[11px] text-neutral-600">{realtimeConnected ? 'Catálogo en vivo' : 'Cargando…'}</span>
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
											className="nike-snap shrink-0 w-[260px] md:w-[320px] text-left group"
										>
											<div className="relative overflow-hidden bg-neutral-100 aspect-square">
												<img src={p.img} alt={p.name} className="w-full h-full object-cover nike-card-img" />
												{pct > 0 && (
													<span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">-{pct}%</span>
												)}
											</div>
											<div className="mt-3">
												<p className="text-[11px] uppercase tracking-wider text-red-600 font-bold">Just In</p>
												<p className="text-sm font-medium text-black mt-0.5 line-clamp-1">{p.name}</p>
												<p className="text-xs text-neutral-500 line-clamp-1">{p.category}</p>
												<div className="mt-2 flex items-baseline gap-2">
													<span className="text-sm font-medium text-black">${finalPrice.toLocaleString('es-CL')}</span>
													{pct > 0 && <span className="text-xs text-neutral-400 line-through">${p.price.toLocaleString('es-CL')}</span>}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</section>
					)}

					{/* “Más vendidos” horizontal carousel */}
					{liveProducts.length > 0 && (
						<section className="max-w-[1400px] mx-auto px-4 md:px-8 pt-12 pb-2">
							<div className="flex items-end justify-between mb-5">
								<div>
									<p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500 mb-1">Favoritos</p>
									<h2 className="nike-headline text-xl md:text-2xl">Más vendidos.</h2>
								</div>
								<button onClick={() => document.getElementById('nike-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="text-sm font-medium underline underline-offset-4 hover:no-underline hidden md:block">Ver todos</button>
							</div>
							<div className="nike-scroll flex gap-4 overflow-x-auto -mx-4 md:-mx-8 px-4 md:px-8 pb-4">
								{[...liveProducts].sort((a, b) => ((b as { rating?: number }).rating ?? 4.4) - ((a as { rating?: number }).rating ?? 4.4)).slice(0, 8).map((p) => {
									const pct = (p as { discountPercentage?: number }).discountPercentage ?? 0;
									const finalPrice = getFinalPrice(p);
									const rating = (p as { rating?: number }).rating;
									return (
										<button key={`best-${p.id}`} onClick={() => handleSelectProduct(p)} className="nike-snap shrink-0 w-[220px] md:w-[280px] text-left group">
											<div className="relative overflow-hidden bg-neutral-100 aspect-[3/4]">
												<img src={p.img} alt={p.name} className="w-full h-full object-cover nike-card-img" />
												{pct > 0 && <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 uppercase">-{pct}%</span>}
												<div className="nike-card-quickadd absolute bottom-3 left-3 right-3">
													<button onClick={(e) => { e.stopPropagation(); handleAddToCart(e, p); }} className="w-full bg-white text-black rounded-full py-2 text-xs font-medium hover:bg-black hover:text-white transition-colors">
														Añadir al carrito
													</button>
												</div>
											</div>
											<div className="mt-3">
												{rating && (
													<div className="flex items-center gap-1 mb-1">
														{[...Array(5)].map((_, si) => <Star key={si} size={10} className={si < Math.round(rating) ? 'text-black fill-black' : 'text-neutral-300 fill-neutral-300'} />)}
														<span className="text-[10px] text-neutral-500 ml-0.5">{rating.toFixed(1)}</span>
													</div>
												)}
												<p className="text-sm font-medium text-black line-clamp-1">{p.name}</p>
												<p className="text-xs text-neutral-500">{p.category}</p>
												<div className="mt-1.5 flex items-baseline gap-2">
													<span className="text-sm font-semibold text-black">${finalPrice.toLocaleString('es-CL')}</span>
													{pct > 0 && <span className="text-xs text-neutral-400 line-through">${p.price.toLocaleString('es-CL')}</span>}
												</div>
											</div>
										</button>
									);
								})}
							</div>
						</section>
					)}

					{/* Title + sticky filter bar */}
					<section id="nike-grid" className="max-w-[1400px] mx-auto px-4 md:px-8 pt-14">
						<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
							<div>
								<p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Catálogo</p>
								<h2 className="nike-headline text-3xl md:text-4xl mt-1">Productos ({filteredProducts.length})</h2>
							</div>
							<div className="flex items-center gap-3">
								<button onClick={() => setMobileFiltersOpen((v) => !v)} className="md:hidden inline-flex items-center gap-2 border border-neutral-300 rounded-full px-4 py-2 text-sm font-medium hover:bg-neutral-100">
									<SlidersHorizontal size={14} /> Filtros
								</button>
								<div className="hidden md:flex items-center gap-2">
									<ArrowUpDown size={14} className="text-neutral-500" />
									<select
										aria-label="Ordenar por"
										value={sortMode}
										onChange={(e) => setSortMode(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'name-asc')}
										className="bg-transparent border-none text-sm font-medium text-black focus:outline-none cursor-pointer"
									>
										<option value="featured">Destacados</option>
										<option value="price-asc">Precio: menor a mayor</option>
										<option value="price-desc">Precio: mayor a menor</option>
										<option value="name-asc">Nombre: A-Z</option>
									</select>
								</div>
							</div>
						</div>
					</section>

					{/* Category chip strip - sticky */}
					<div className="sticky top-[64px] z-30 bg-white/95 backdrop-blur border-y border-neutral-200">
						<div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3 flex items-center gap-2 overflow-x-auto nike-scroll">
							{categories.map((category) => (
								<button
									key={`chip-${category}`}
									onClick={() => setSelectedCategory(category)}
									className={`nike-pill shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${selectedCategory === category ? 'bg-black text-white border-black' : 'bg-white text-black border-neutral-300 hover:border-black'}`}
								>
									{category === 'all' ? 'Todos' : category}
								</button>
							))}
							<div className="ml-auto flex items-center gap-2 shrink-0">
								<button
									onClick={() => setOnlyDiscounted((v) => !v)}
									className={`nike-pill rounded-full border px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5 ${onlyDiscounted ? 'bg-red-600 text-white border-red-600' : 'bg-white text-black border-neutral-300 hover:border-black'}`}
								>
									<Tag size={13} /> Ofertas
								</button>
								<select
									aria-label="Filtrar por precio"
									value={priceFilter}
									onChange={(e) => setPriceFilter(e.target.value as 'all' | 'low' | 'mid' | 'high')}
									className="rounded-full border border-neutral-300 bg-white text-black text-sm font-medium px-4 py-2 focus:outline-none focus:border-black"
								>
									<option value="all">Todo precio</option>
									<option value="low">Hasta $80.000</option>
									<option value="mid">$80.001 – $150.000</option>
									<option value="high">Sobre $150.000</option>
								</select>
							</div>
						</div>
					</div>

					{/* Main grid layout */}
					<main className="max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-32">
						<div className="md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-8">
							{/* Sidebar filters - desktop */}
							<aside className="hidden md:block">
								<div className="sticky top-[140px] space-y-7 pb-10">
									<div>
										<p className="text-sm font-bold uppercase tracking-wider mb-3">Categoría</p>
										<ul className="space-y-2">
											{categories.map((category) => (
												<li key={`side-${category}`}>
													<button
														onClick={() => setSelectedCategory(category)}
														className={`text-left text-sm w-full ${selectedCategory === category ? 'text-black font-bold' : 'text-neutral-600 hover:text-black'}`}
													>
														{category === 'all' ? 'Todos los productos' : category}
													</button>
												</li>
											))}
										</ul>
									</div>
									<div className="border-t border-neutral-200 pt-6">
										<p className="text-sm font-bold uppercase tracking-wider mb-3">Precio</p>
										<ul className="space-y-2">
											{(['all','low','mid','high'] as const).map((p) => (
												<li key={p}>
													<button onClick={() => setPriceFilter(p)} className={`text-left text-sm w-full ${priceFilter === p ? 'text-black font-bold' : 'text-neutral-600 hover:text-black'}`}>
														{p === 'all' ? 'Todos' : p === 'low' ? 'Hasta $80.000' : p === 'mid' ? '$80.001 – $150.000' : 'Sobre $150.000'}
													</button>
												</li>
											))}
										</ul>
									</div>
									<div className="border-t border-neutral-200 pt-6">
										<p className="text-sm font-bold uppercase tracking-wider mb-3">Otros</p>
										<label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
											<input type="checkbox" checked={onlyDiscounted} onChange={(e) => setOnlyDiscounted(e.target.checked)} className="w-4 h-4 accent-black" />
											Solo en oferta
										</label>
									</div>
									{totalSavingsFiltered > 0 && (
										<div className="border-t border-neutral-200 pt-6">
											<p className="text-xs text-neutral-500">Ahorro visible</p>
											<p className="text-2xl font-black text-red-600">${totalSavingsFiltered.toLocaleString('es-CL')}</p>
										</div>
									)}
								</div>
							</aside>

							{/* Mobile filters drawer */}
							{mobileFiltersOpen && (
								<div className="md:hidden mb-6 border border-neutral-200 rounded-md p-4 space-y-4 bg-neutral-50">
									<div>
										<p className="text-xs font-bold uppercase tracking-wider mb-2">Precio</p>
										<select aria-label="Filtrar por precio" value={priceFilter} onChange={(e) => setPriceFilter(e.target.value as 'all' | 'low' | 'mid' | 'high')} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white">
											<option value="all">Todo precio</option>
											<option value="low">Hasta $80.000</option>
											<option value="mid">$80.001 – $150.000</option>
											<option value="high">Sobre $150.000</option>
										</select>
									</div>
									<div>
										<p className="text-xs font-bold uppercase tracking-wider mb-2">Ordenar</p>
										<select aria-label="Ordenar por" value={sortMode} onChange={(e) => setSortMode(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'name-asc')} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white">
											<option value="featured">Destacados</option>
											<option value="price-asc">Precio: menor a mayor</option>
											<option value="price-desc">Precio: mayor a menor</option>
											<option value="name-asc">Nombre: A-Z</option>
										</select>
									</div>
									<label className="flex items-center gap-2 text-sm">
										<input type="checkbox" checked={onlyDiscounted} onChange={(e) => setOnlyDiscounted(e.target.checked)} className="w-4 h-4 accent-black" />
										Solo en oferta
									</label>
								</div>
							)}

							{/* Product grid */}
							<div>
								{fetchComplete && filteredProducts.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-32 text-center gap-4">
										<Package size={48} className="text-neutral-300" />
										<p className="text-neutral-700 text-lg font-medium">No encontramos productos con estos filtros</p>
										<button onClick={() => { setSelectedCategory('all'); setPriceFilter('all'); setOnlyDiscounted(false); }} className="mt-2 rounded-full bg-black text-white px-6 py-2.5 text-sm font-medium hover:bg-neutral-800">Limpiar filtros</button>
									</div>
								) : (
									<div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
										{filteredProducts.map((p) => {
											const pct = (p as { discountPercentage?: number }).discountPercentage ?? 0;
											const finalPrice = getFinalPrice(p);
											const stockBadge = getStockBadge(p);
											const deliveryBadge = getDeliveryBadge(p);
											const rating = (p as { rating?: number }).rating;
											return (
												<article key={p.id} className="nike-card group">
													<button onClick={() => handleSelectProduct(p)} className="block w-full text-left">
														<div className="relative overflow-hidden bg-neutral-100 aspect-square">
															<img src={p.img} alt={p.name} className="w-full h-full object-cover nike-card-img" />
															{pct > 0 && (
																<span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider">-{pct}%</span>
															)}
															{/* Quick add overlay */}
															<div className="nike-card-quickadd absolute bottom-3 left-3 right-3 hidden md:flex">
																<button
																	onClick={(e) => { e.stopPropagation(); handleAddToCart(e, p); }}
																	className="flex-1 bg-white text-black rounded-full py-2.5 text-xs font-medium hover:bg-black hover:text-white transition-colors inline-flex items-center justify-center gap-1.5"
																>
																	<ShoppingBag size={13} /> Añadir rápido
																</button>
															</div>
														</div>
														<div className="pt-3 pb-1">
															{pct > 0 ? (
																<p className="text-[11px] uppercase tracking-wider text-red-600 font-bold">Oferta destacada</p>
															) : (
																<p className="text-[11px] uppercase tracking-wider text-neutral-500 font-medium">{deliveryBadge.label}</p>
															)}
															<h3 className="text-sm md:text-base font-medium text-black mt-0.5 line-clamp-2 leading-tight">{p.name}</h3>
															<p className="text-xs md:text-sm text-neutral-500 mt-0.5">{p.category}</p>
															{rating ? (
																<div className="flex items-center gap-1 mt-1">
																	{[...Array(5)].map((_, si) => (
																		<Star key={si} size={11} className={si < Math.round(rating) ? 'text-black fill-black' : 'text-neutral-300 fill-neutral-300'} />
																	))}
																	<span className="text-[10px] text-neutral-500 ml-0.5">{rating.toFixed(1)}</span>
																</div>
															) : null}
															<div className="mt-2 flex items-baseline gap-2 flex-wrap">
																<span className="text-sm md:text-base font-semibold text-black">${finalPrice.toLocaleString('es-CL')}</span>
																{pct > 0 && <span className="text-xs text-neutral-400 line-through">${p.price.toLocaleString('es-CL')}</span>}
															</div>
															<p className={`text-[10px] mt-1 font-medium uppercase tracking-wider ${stockBadge.label.toLowerCase().includes('critico') || stockBadge.label.toLowerCase().includes('crítico') ? 'text-red-600' : stockBadge.label.toLowerCase().includes('bajo') ? 'text-amber-600' : 'text-neutral-500'}`}>
																{stockBadge.label}
															</p>
														</div>
													</button>
													<div className="md:hidden pb-2">
														<button
															onClick={(e) => handleAddToCart(e, p)}
															className="w-full bg-black text-white rounded-full py-2 text-xs font-medium hover:bg-neutral-800 transition-colors inline-flex items-center justify-center gap-1.5 mt-1"
														>
															<ShoppingBag size={12} /> Añadir
														</button>
													</div>
												</article>
											);
										})}
									</div>
								)}

								{/* Editorial banner mid-grid */}
								{filteredProducts.length > 4 && (
									<section className="my-14 grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="relative overflow-hidden bg-neutral-100 aspect-[4/3] group cursor-pointer" onClick={() => setSelectedCategory('Iluminación')}>
											<img src="https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?q=80&w=1200&auto=format&fit=crop" alt="Iluminación" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
											<div className="absolute inset-0 nike-hero-grad" />
											<div className="absolute bottom-6 left-6 text-white">
												<p className="text-[11px] uppercase tracking-[0.18em] mb-1 opacity-90">Ambientes</p>
												<h3 className="nike-headline text-2xl md:text-3xl">Iluminación</h3>
												<button className="mt-3 bg-white text-black rounded-full px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5">Ver colección <ArrowRight size={12} /></button>
											</div>
										</div>
										<div className="relative overflow-hidden bg-neutral-100 aspect-[4/3] group cursor-pointer" onClick={() => setSelectedCategory('Seguridad')}>
											<img src="https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=1200&auto=format&fit=crop" alt="Seguridad" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
											<div className="absolute inset-0 nike-hero-grad" />
											<div className="absolute bottom-6 left-6 text-white">
												<p className="text-[11px] uppercase tracking-[0.18em] mb-1 opacity-90">Tu hogar</p>
												<h3 className="nike-headline text-2xl md:text-3xl">Seguridad inteligente</h3>
												<button className="mt-3 bg-white text-black rounded-full px-4 py-2 text-xs font-medium inline-flex items-center gap-1.5">Explorar <ArrowRight size={12} /></button>
											</div>
										</div>
									</section>
								)}

								{/* Trust strip */}
								<section className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-neutral-200 pt-10">
									<div className="flex items-start gap-3"><Award size={22} className="text-black mt-0.5" /><div><p className="text-sm font-bold">Garantía real</p><p className="text-xs text-neutral-500 mt-1">Cobertura extendida en todas las instalaciones.</p></div></div>
									<div className="flex items-start gap-3"><Clock size={22} className="text-black mt-0.5" /><div><p className="text-sm font-bold">Despacho rápido</p><p className="text-xs text-neutral-500 mt-1">Entregas en 24-48h en stock disponible.</p></div></div>
									<div className="flex items-start gap-3"><Sparkles size={22} className="text-black mt-0.5" /><div><p className="text-sm font-bold">Curatoría premium</p><p className="text-xs text-neutral-500 mt-1">Solo productos validados por nuestros expertos.</p></div></div>
									<div className="flex items-start gap-3"><Phone size={22} className="text-black mt-0.5" /><div><p className="text-sm font-bold">Asesoría dedicada</p><p className="text-xs text-neutral-500 mt-1">Habla con un especialista antes de comprar.</p></div></div>
								</section>
							</div>
						</div>
					</main>

					{/* Hidden legacy intro retained for SEO crawlers */}
					<div className="sr-only">
						<h2>Catálogo Fabrick - materiales premium instalados</h2>
					</div>
				</div>
			)}

			{/* Legacy intro strip kept hidden to preserve hooks */}
			{false && !selectedProduct && (
				<>
					<section className="relative px-6 md:px-10 pt-10 pb-6 max-w-6xl mx-auto">
						<div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
							<div>
								<p className="text-[9px] uppercase tracking-[0.5em] text-yellow-400/70 mb-3">Catálogo Fabrick</p>
								<h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-[0.95] text-white">
									Materiales que instalamos<br />
									<span className="bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">en tu obra</span>
								</h1>
								<p className="mt-4 text-zinc-400 text-sm max-w-xl leading-relaxed">
									Cada material de este catálogo es seleccionado, adquirido e instalado por nuestro equipo certificado directamente en tu proyecto.
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
						<section className="mb-10 md:mb-14 rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 via-black/60 to-black/70 p-5 md:p-8 overflow-hidden relative">
							<div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-yellow-400/15 blur-3xl" />
							<div className="absolute -left-16 -bottom-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
							<div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
								<div>
									<p className="text-[9px] uppercase tracking-[0.45em] text-yellow-400/85 mb-3">Dropshipping Pro Layer</p>
									<h3 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white leading-[0.95]">
										Colecciones listas para convertir
									</h3>
									<p className="mt-3 max-w-xl text-sm text-zinc-300">
										Visual premium, lectura rápida y foco en decisión de compra para móvil y desktop.
									</p>
								</div>
								<div className="grid grid-cols-2 gap-2 md:grid-cols-3">
									<div className="depth-glass rounded-xl border border-white/15 px-3 py-2 text-center">
										<p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Productos</p>
										<p className="text-lg font-black text-white">{liveProducts.length}</p>
									</div>
									<div className="depth-glass rounded-xl border border-white/15 px-3 py-2 text-center">
										<p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Con oferta</p>
										<p className="text-lg font-black text-yellow-300">{liveProducts.filter((p) => ((p as { discountPercentage?: number }).discountPercentage ?? 0) > 0).length}</p>
									</div>
									<div className="depth-glass rounded-xl border border-white/15 px-3 py-2 text-center col-span-2 md:col-span-1">
										<p className="text-[10px] uppercase tracking-[0.14em] text-zinc-400">Tiempo real</p>
										<p className={`text-lg font-black ${realtimeConnected ? 'text-emerald-300' : 'text-zinc-300'}`}>
											{realtimeConnected ? 'Online' : 'Sync'}
										</p>
									</div>
								</div>
							</div>
						</section>

						{/* Section header */}
						<div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-16 pt-16 border-t border-white/5">
							<div>
								<p className="text-[9px] uppercase tracking-[0.4em] text-yellow-400/70 mb-2">Nuestro catálogo</p>
								<h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-white">
									{filteredProducts.length} Productos
								</h2>
							</div>
							<div className="flex items-center gap-2">
								<span className={`w-2 h-2 rounded-full ${realtimeConnected ? 'bg-emerald-400 shadow-[0_0_6px_#4ade80]' : 'bg-zinc-600'}`} />
								<span className={`text-[10px] uppercase tracking-widest ${realtimeConnected ? 'text-emerald-400' : 'text-zinc-500'}`}>
									{realtimeConnected ? 'Catálogo actualizado' : 'Cargando catálogo'}
								</span>
							</div>
						</div>

						<div className="xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-8">
						<div className="hidden xl:block">
							<aside className="sticky top-28 rounded-[1.25rem] border border-white/10 bg-white/[0.02] p-4">
								<p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500 font-bold">Panel de filtros</p>
								<p className="mt-1 text-xs text-zinc-400">Ajusta catálogo y maximiza margen de conversión.</p>
								<div className="mt-4 space-y-2">
									<p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 font-bold">Categorias</p>
									<div className="flex flex-wrap gap-2">
										{categories.map((category) => (
											<button
												key={`desk-${category}`}
												onClick={() => setSelectedCategory(category)}
												className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] font-bold transition-all ${selectedCategory === category ? 'filter-pill-active border-yellow-400/40 bg-yellow-400/15 text-yellow-300' : 'border-white/15 text-zinc-300 hover:border-white/35 hover:text-white'}`}
											>
												{category === 'all' ? 'Todas' : category}
											</button>
										))}
									</div>
								</div>
								<div className="mt-3 space-y-2">
									<select
										aria-label="Filtrar por precio"
										value={priceFilter}
										onChange={(e) => setPriceFilter(e.target.value as 'all' | 'low' | 'mid' | 'high')}
										className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-200 focus:border-yellow-400/40 focus:outline-none"
									>
										<option value="all">Todo precio</option>
										<option value="low">Hasta $80.000</option>
										<option value="mid">$80.001 a $150.000</option>
										<option value="high">Sobre $150.000</option>
									</select>
									<select
										aria-label="Ordenar por"

										value={sortMode}
										onChange={(e) => setSortMode(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'name-asc')}
										className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-200 focus:border-yellow-400/40 focus:outline-none"
									>
										<option value="featured">Destacados</option>
										<option value="price-asc">Precio menor</option>
										<option value="price-desc">Precio mayor</option>
										<option value="name-asc">A-Z</option>
									</select>
									<button
										onClick={() => setOnlyDiscounted((v) => !v)}
										className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-bold transition-all ${onlyDiscounted ? 'filter-pill-active border-yellow-400/40 bg-yellow-400/15 text-yellow-300' : 'border-white/15 text-zinc-300 hover:border-white/35 hover:text-white'}`}
									>
										<Tag size={11} /> Solo ofertas
									</button>
								</div>
								<div className="mt-4 rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-3">
									<p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500 font-bold">Ahorro total visible</p>
									<p className="mt-1 text-xl font-black text-yellow-300">${totalSavingsFiltered.toLocaleString()}</p>
									<p className="mt-1 text-xs text-zinc-400">Basado en descuentos aplicados de los productos filtrados.</p>
								</div>
							</aside>
						</div>
						<div>
						<div className="mb-12 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-4 md:p-5">
							<div className="mb-3 flex items-center gap-2">
								<SlidersHorizontal size={14} className="text-yellow-400" />
								<p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold">Filtros avanzados</p>
							</div>
							<div className="grid gap-3 md:grid-cols-[1fr_auto]">
								<div className="flex flex-wrap gap-2">
									{categories.map((category, fIdx) => (
										<button
											key={category}
											onClick={() => setSelectedCategory(category)}
											className={`mobile-stagger rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.16em] font-bold transition-all ${selectedCategory === category ? 'filter-pill-active border-yellow-400/40 bg-yellow-400/15 text-yellow-300' : 'border-white/15 text-zinc-300 hover:border-white/35 hover:text-white'}`}
										>
											{category === 'all' ? 'Todas' : category}
										</button>
									))}
								</div>
								<div className="flex flex-wrap gap-2 md:justify-end">
									<select
										aria-label="Filtrar por precio"
										value={priceFilter}
										onChange={(e) => setPriceFilter(e.target.value as 'all' | 'low' | 'mid' | 'high')}
										className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-200 focus:border-yellow-400/40 focus:outline-none"
									>
										<option value="all">Todo precio</option>
										<option value="low">Hasta $80.000</option>
										<option value="mid">$80.001 a $150.000</option>
										<option value="high">Sobre $150.000</option>
									</select>
									<select
										aria-label="Ordenar por"
										value={sortMode}
										onChange={(e) => setSortMode(e.target.value as 'featured' | 'price-asc' | 'price-desc' | 'name-asc')}
										className="rounded-full border border-white/15 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-bold text-zinc-200 focus:border-yellow-400/40 focus:outline-none"
									>
										<option value="featured">Destacados</option>
										<option value="price-asc">Precio menor</option>
										<option value="price-desc">Precio mayor</option>
										<option value="name-asc">A-Z</option>
									</select>
									<button
										onClick={() => setOnlyDiscounted((v) => !v)}
										className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.14em] font-bold transition-all ${onlyDiscounted ? 'filter-pill-active border-yellow-400/40 bg-yellow-400/15 text-yellow-300' : 'border-white/15 text-zinc-300 hover:border-white/35 hover:text-white'}`}
									>
										<Tag size={11} /> Solo ofertas
									</button>
								</div>
							</div>
							<button
								onClick={() => setMobileFiltersOpen((v) => !v)}
								className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.16em] font-bold text-zinc-300 md:hidden"
							>
								<ArrowUpDown size={11} />
								{mobileFiltersOpen ? 'Cerrar panel' : 'Ver panel rápido'}
							</button>
							{mobileFiltersOpen && (
								<p className="mt-3 text-xs text-zinc-500 md:hidden">
									Aplica filtros para encontrar combinaciones con mayor margen y mejor conversión en checkout.
								</p>
							)}
						</div>

						{/* Products */}
						<div className="space-y-28 md:space-y-40">
							{fetchComplete && filteredProducts.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-32 text-center gap-4">
									<span className="text-5xl">📦</span>
									<p className="text-white/60 text-lg">No hay productos con estos filtros</p>
									<p className="text-white/30 text-sm">Prueba otra categoría o rango de precio</p>
								</div>
							) : (
							filteredProducts.map((p, idx) => (
								<div key={p.id} className={`mobile-card-stagger scroll-reveal group flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-10 md:gap-20`}>
									{/* Image */}
									<div className="product-3d-wrap w-full md:w-1/2">
									<div
										className="product-3d-card aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-white/5 shadow-[0_30px_80px_rgba(0,0,0,0.7)] relative cursor-pointer"
										onClick={() => handleSelectProduct(p)}
									>
										<img
											src={p.img}
											className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2s] ease-out"
											alt={p.name}
										/>
										<div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
										<div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.18),transparent_45%)] opacity-70 mix-blend-screen pointer-events-none" />
										<div className="absolute -inset-[2px] rounded-[2.6rem] border border-yellow-400/20 pointer-events-none" />
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

										{(() => {
											const deliveryBadge = getDeliveryBadge(p);
											const stockBadge = getStockBadge(p);
											return (
												<div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
													<span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${deliveryBadge.className}`}>
														{deliveryBadge.label}
													</span>
													<span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${stockBadge.className}`}>
														{stockBadge.label}
													</span>
												</div>
											);
										})()}

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
							))
							)}
						</div>
						</div>
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
							{[['Catálogo completo', '#nike-grid'], ['Seguridad', null], ['Iluminación', null], ['Ofertas activas', null]].map(([label, href]) => (
								<li key={label as string}>
									<button onClick={() => href ? document.getElementById('nike-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : null} className="text-sm text-neutral-400 hover:text-white transition-colors">{label}</button>
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