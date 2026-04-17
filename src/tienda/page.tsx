'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
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
} from 'lucide-react';

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
	{ icon: Home, label: 'Inicio' },
	{ icon: LayoutGrid, label: 'Ver Catálogo' },
	{ icon: Award, label: 'Garantías' },
	{ icon: User, label: 'Mi Cuenta' },
	{ icon: Settings, label: 'Ajustes' },
];

function FabrickLogo({ className = '', centered = false, active = false, onClick }: { className?: string; centered?: boolean; active?: boolean; onClick?: () => void }) {
return (
<div onClick={onClick} className={`select-none cursor-pointer ${className}`}>
<img
src="/logo-soluciones-fabrick.svg"
alt="Soluciones Fabrick"
className={`block md:hidden ${centered ? 'w-44' : 'w-32'} h-auto object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.25)] ${active ? 'opacity-100' : 'opacity-95 group-hover:opacity-100'}`}
/>

<div className={`hidden md:flex items-center gap-3 group ${centered ? 'flex-col text-center' : ''}`}>
<div className={`relative ${centered ? 'w-14 h-14' : 'w-9 h-9'} transition-all duration-700`}>
<div className={`absolute inset-0 bg-yellow-400/20 blur-xl rounded-full transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
<svg viewBox="0 0 68 60" className="w-full h-full relative z-10 overflow-visible">
<path d="M 8 36 L 34 10 L 60 36" fill="none" stroke="#FACC15" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
<path d="M 14 38 H 54" fill="none" stroke="#EAB308" strokeWidth="3" strokeLinecap="round" />
<rect x="40" y="18" width="8" height="10" rx="1.5" fill="#FACC15" opacity="0.9" />
</svg>
</div>
<div className={`flex flex-col ${centered ? 'items-center mt-2' : 'text-left'}`}>
<span className="font-bold uppercase tracking-[0.3em] text-white/90 text-[10px] md:text-sm leading-none">Soluciones</span>
<span className="text-yellow-400 font-black tracking-[0.6em] uppercase text-[6px] md:text-[8px]">Fabrick</span>
</div>
</div>
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
	const { products: dbProducts, loading: productsLoading, connected: realtimeConnected } = useRealtimeProducts();
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [showExitConfirm, setShowExitConfirm] = useState(false);
	const [cart, setCart] = useState<Product[]>([]);
	const [activeMenuIndex, setActiveMenuIndex] = useState(0);
	const [gsapReady, setGsapReady] = useState(false);

	const cartIconRef = useRef<HTMLDivElement>(null);
	const gsapRef = useRef<null | typeof import('gsap').default>(null);

	const liveProducts: Product[] = useMemo(() => {
		if (!dbProducts.length) return PRODUCTS;
		return dbProducts
			.filter((p) => p.activo !== false)
			.map((p) => ({
				id: p.id,
				name: p.name,
				price: p.price,
				category: p.category_id || 'General',
				tagline: p.tagline || (p.delivery_days ? `Entrega ${p.delivery_days}` : 'Calidad profesional para tu proyecto'),
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
		if (label === 'Garantías') router.push('/soluciones');
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
		setCart((prev) => [...prev, product]);
		setIsCartOpen(true);
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
			`}</style>

			<nav className="fixed top-0 left-0 w-full z-[100] bg-black/10 backdrop-blur-xl border-b border-white/5 py-5 px-6 md:px-12 flex justify-between items-center transition-all duration-1000">
				<FabrickLogo onClick={() => (selectedProduct ? setShowExitConfirm(true) : router.push('/'))} />
				<div className="flex items-center gap-6">
					<div ref={cartIconRef} className="relative cursor-pointer transition-all duration-300 p-2" onClick={() => setIsCartOpen(true)}>
						<div className="absolute top-0 right-0 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-black text-[8px] font-black shadow-[0_0_15px_#FACC15]">
							{cart.length}
						</div>
						<ShoppingBag size={22} className="text-white/70" />
					</div>
					<button onClick={() => setIsMenuOpen(true)} className="p-2 text-white/70 hover:text-white transition-colors">
						<Menu size={24} />
					</button>
				</div>
			</nav>

			{!selectedProduct && (
				<>
					<section className="h-[100dvh] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
						<div className="aura-glow-bg absolute inset-0 z-0" />
						<img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?q=80&w=2070&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale-[0.5]" alt="" />
						<div className="relative z-10 welcome-box p-10 md:p-20 rounded-[3rem] max-w-5xl shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
							<div className="inline-flex items-center gap-3 px-6 py-2 rounded-full border border-yellow-400/20 bg-black/40 mb-8">
								<Sparkles size={14} className="text-yellow-400 animate-pulse" />
								<span className="text-yellow-400 font-black tracking-[0.5em] text-[9px] uppercase">Boutique Fabrick</span>
							</div>
							<h1 className="text-4xl md:text-[90px] font-black uppercase tracking-tighter leading-[0.9] text-white mb-10">
								Bienvenido a <br />
								<span className="text-transparent" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.6)' }}>
									Nuestra Boutique.
								</span>
							</h1>
							<p className="text-zinc-400 text-sm md:text-xl font-light max-w-2xl mx-auto leading-relaxed tracking-widest opacity-90 mb-12 uppercase">
								Cada producto está pensado para elevar tu hogar: ingeniería precisa, materiales nobles y la tranquilidad de comprar calidad real.
							</p>
						</div>
					</section>

					<main className="max-w-6xl mx-auto px-6 pb-48 space-y-32 md:space-y-48 relative z-10">
						<div className="flex items-center justify-between px-1">
							<p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
								{productsLoading ? 'Cargando productos...' : `${liveProducts.length} productos sincronizados`}
							</p>
							<p className={`text-[10px] uppercase tracking-[0.25em] ${realtimeConnected ? 'text-emerald-400' : 'text-zinc-600'}`}>
								{realtimeConnected ? 'Tiempo real activo' : 'Sincronización en reconexión'}
							</p>
						</div>
						{liveProducts.map((p) => (
							<div key={p.id} className="scroll-reveal group flex flex-col md:flex-row items-center gap-12 md:gap-24">
								<div className="w-full md:w-1/2 aspect-[4/5] overflow-hidden rounded-[3rem] border border-white/5 shadow-2xl relative cursor-pointer" onClick={() => handleSelectProduct(p)}>
									<img src={p.img} className="w-full h-full object-cover grayscale-[0.6] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2.5s] ease-out" alt={p.name} />
									<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
								</div>
								<div className="w-full md:w-1/2 space-y-8 text-center md:text-left">
									<span className="text-yellow-400 font-bold tracking-[0.5em] text-[10px] uppercase border-b border-yellow-400/20 pb-2 inline-block">Categoría: {p.category}</span>
									<h3 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-white">{p.name}</h3>
									<p className="text-zinc-400 text-sm md:text-lg font-light leading-relaxed tracking-wide italic">"{p.tagline}"</p>
									<div className="flex flex-col md:flex-row items-center gap-8 pt-4">
										<p className="font-mono text-3xl font-bold text-white/90">${p.price.toLocaleString()}</p>
										<SilverGoldButton onClick={() => goToCheckout(p)}>Ver Detalle</SilverGoldButton>
										<SilverGoldButton onClick={(e) => handleAddToCart(e, p)}>Añadir</SilverGoldButton>
									</div>
								</div>
							</div>
						))}
					</main>
				</>
			)}

			{selectedProduct && (
				<div className="fixed inset-0 z-[150] bg-black overflow-y-auto scrollbar-hide cinematic-panel-enter">
					<div className="w-full min-h-[150vh] relative">
						<section className="h-[95dvh] w-full sticky top-0 overflow-hidden z-0">
							<img src={selectedProduct.img} className="w-full h-full object-cover" alt={selectedProduct.name} />
							<div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black" />
							<button onClick={() => setSelectedProduct(null)} className="absolute top-10 right-10 text-white/40 hover:text-white transition-colors p-4 z-50">
								<X size={32} />
							</button>
						</section>

						<div className="relative z-10 bg-black pt-24 pb-40 shadow-[0_-100px_150px_rgba(0,0,0,1)] px-8 border-t border-white/5">
							<div className="max-w-4xl mx-auto space-y-20">
								<div className="text-center md:text-left space-y-8">
									<FabrickLogo active className="mb-8" />
									<h2 className="text-5xl md:text-[80px] font-black uppercase tracking-tighter leading-[0.8] text-white">{selectedProduct.name}</h2>
									<p className="text-zinc-400 text-xl md:text-2xl font-light leading-relaxed max-w-2xl">{selectedProduct.description}</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
									{selectedProduct.features.map((f) => (
										<div key={f} className="flex items-center gap-6 p-8 bg-zinc-950 rounded-[2rem] border border-white/5 shadow-inner hover:border-yellow-400/30 transition-colors">
											<Zap className="text-yellow-400" size={24} />
											<span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-300">{f}</span>
										</div>
									))}
								</div>

								<div className="flex flex-col md:flex-row items-center justify-between py-12 border-y border-white/10 gap-10 text-center md:text-left">
									<div className="flex gap-12 text-zinc-500 font-mono text-[10px] uppercase tracking-[0.4em]">
										<div className="space-y-3">
											<p className="text-zinc-700 font-black">Dimensión</p>
											<p className="text-white flex items-center justify-center md:justify-start gap-3">
												<Ruler size={16} /> {selectedProduct.dimensions}
											</p>
										</div>
										<div className="space-y-3">
											<p className="text-zinc-700 font-black">Entrega</p>
											<p className="text-white flex items-center justify-center md:justify-start gap-3">
												<Clock size={16} /> {selectedProduct.delivery}
											</p>
										</div>
									</div>
									<div>
										<p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3 font-black">Inversión Final</p>
										<p className="text-5xl md:text-6xl font-black text-white">${selectedProduct.price.toLocaleString()}</p>
									</div>
								</div>

								<div className="flex justify-center pb-16">
									<SilverGoldButton className="w-full md:w-auto py-6 md:px-20 text-[10px]" onClick={() => goToCheckout(selectedProduct)}>
										Confirmar mi Pedido
									</SilverGoldButton>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{isMenuOpen && (
				<div className="fixed inset-0 z-[210] flex justify-end">
					<div className="absolute inset-0 cinematic-overlay" onClick={() => setIsMenuOpen(false)} />
					<div className="relative w-full max-w-[300px] bg-zinc-950 border-l border-white/5 h-full p-10 flex flex-col shadow-2xl cinematic-panel-enter">
						<FabrickLogo className="mb-16 self-center" />
						<div className="flex-1 relative flex items-center justify-center">
							<div className="wheel-selector" />
							<div className="flex-1 h-80 overflow-y-auto scrollbar-hide py-40 snap-y snap-mandatory text-center">
								{MENU_OPTIONS.map((item, i) => (
									<button key={item.label} onMouseEnter={() => setActiveMenuIndex(i)} onClick={() => handleMenuAction(item.label)} className={`h-[60px] w-full flex items-center justify-center gap-6 transition-all duration-500 snap-center ${activeMenuIndex === i ? 'opacity-100 scale-125' : 'opacity-10 scale-90 blur-[1.5px]'}`}>
										<item.icon size={18} className={activeMenuIndex === i ? 'text-yellow-400' : 'text-zinc-500'} />
										<span className={`text-xs font-black uppercase tracking-[0.4em] ${activeMenuIndex === i ? 'text-white' : 'text-zinc-600'}`}>{item.label}</span>
									</button>
								))}
							</div>
						</div>
						<button onClick={() => setIsMenuOpen(false)} className="mt-auto self-center text-zinc-700 hover:text-white uppercase text-[8px] font-black tracking-[0.8em] py-4">
							Cerrar Panel
						</button>
					</div>
				</div>
			)}

			{isCartOpen && (
				<div className="fixed inset-0 z-[220] flex items-center justify-center p-0 md:p-12 overflow-hidden">
					<div className="absolute inset-0 cinematic-overlay" onClick={() => setIsCartOpen(false)} />
					<div className="relative w-full h-full max-w-5xl max-h-[85vh] bg-zinc-950 md:rounded-[4rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden cinematic-panel-enter">
						<div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/5 via-transparent to-yellow-400/5 opacity-50" />
						<svg className="absolute inset-0 w-full h-full pointer-events-none rounded-[3rem]">
							<rect width="100%" height="100%" fill="none" stroke="rgba(250,204,21,0.05)" strokeWidth="1" rx="48" />
							<rect width="100%" height="100%" fill="none" stroke="#FACC15" strokeWidth="2" strokeDasharray="10 1000" className="cart-border-run" rx="48" />
						</svg>
						<div className="p-8 md:p-12 border-b border-white/5 flex flex-col items-center relative z-10 bg-black/40 backdrop-blur-md">
							<FabrickLogo centered />
							<button onClick={() => setIsCartOpen(false)} className="absolute top-10 right-10 text-zinc-600 hover:text-white transition-colors">
								<X size={24} />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide relative z-10">
							{cart.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center opacity-10 space-y-6">
									<ShoppingBag size={80} />
									<p className="text-xl font-black uppercase tracking-[1em]">Vacio</p>
								</div>
							) : (
								cart.map((item, idx) => (
									<div key={`${item.id}-${idx}`} className="flex flex-col md:flex-row items-center gap-10 bg-black/40 p-8 rounded-[2rem] border border-white/5 shadow-inner snap-center transition-all hover:border-yellow-400/20">
										<div className="w-32 h-32 md:w-44 md:h-44 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex-shrink-0">
											<img src={item.img} className="w-full h-full object-cover grayscale" alt={item.name} />
										</div>
										<div className="flex-1 text-center md:text-left">
											<h4 className="font-black uppercase text-xl text-white tracking-widest">{item.name}</h4>
											<p className="text-yellow-400 font-mono text-lg mt-2">${item.price.toLocaleString()}</p>
										</div>
										<button
											onClick={() => setCart((prev) => prev.filter((_, i) => i !== idx))}
											className="text-zinc-600 hover:text-red-500 p-4"
										>
											<Trash2 size={24} />
										</button>
									</div>
								))
							)}
						</div>

						{cart.length > 0 && (
							<div className="p-10 md:p-12 bg-black/80 border-t border-white/5 flex flex-col items-center space-y-6 relative z-10">
								<p className="text-[10px] text-zinc-600 uppercase tracking-widest font-black w-full text-center">
									Total Confirmado: <span className="text-white text-3xl ml-4">${cartTotal.toLocaleString()}</span>
								</p>
								<SilverGoldButton className="w-full max-w-sm py-6" onClick={() => goToCheckout()}>
									Solicitar Pedido
								</SilverGoldButton>
							</div>
						)}
					</div>
				</div>
			)}

			<footer className="py-24 border-t border-white/5 flex flex-col items-center gap-10 bg-black relative z-10 text-center">
				<FabrickLogo centered />
				<div className="flex gap-10 items-center">
					<Instagram size={20} className="text-zinc-800 hover:text-yellow-400 transition-all cursor-pointer transform hover:scale-125" />
					<Facebook size={20} className="text-zinc-800 hover:text-yellow-400 transition-all cursor-pointer transform hover:scale-125" />
				</div>
				<p className="text-[7px] text-zinc-800 uppercase tracking-[1em] font-medium">© 2026 Soluciones Fabrick • Ingeniería para tu Vida</p>
			</footer>

			{showExitConfirm && (
				<div className="fixed inset-0 z-[500] cinematic-overlay flex items-center justify-center p-6">
					<div className="bg-zinc-950 border border-white/10 p-12 rounded-[3rem] max-w-sm text-center space-y-8 shadow-2xl cinematic-panel-enter">
						<AlertCircle className="w-16 h-16 text-yellow-400 mx-auto animate-pulse" />
						<div className="space-y-2">
							<h3 className="text-xl font-black uppercase tracking-widest text-white">¿Regresar al Inicio?</h3>
							<p className="text-zinc-600 text-[10px] uppercase tracking-widest leading-relaxed">Tu selección actual se mantendrá en la bolsa.</p>
						</div>
						<div className="flex flex-col gap-4">
							<button
								onClick={() => {
									setSelectedProduct(null);
									setShowExitConfirm(false);
									router.push('/');
								}}
								className="w-full py-5 bg-yellow-400 text-black font-black uppercase text-[10px] tracking-widest rounded-full"
							>
								Confirmar
							</button>
							<button onClick={() => setShowExitConfirm(false)} className="w-full py-5 bg-white/5 text-zinc-500 font-black uppercase text-[10px] tracking-widest rounded-full border border-white/5">
								Cancelar
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}



