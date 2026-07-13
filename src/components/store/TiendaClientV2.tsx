"use client";

import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Facebook,
  Hammer,
  Instagram,
  Search,
  ShieldCheck,
  Snowflake,
  Truck,
  Wrench,
} from "lucide-react";
import { navigateWithTransition } from "@/lib/routeTransition";
import {
  FALLBACK_CATALOG_PRODUCTS,
  useCatalogProducts,
} from "@/hooks/useCatalogProducts";
import { useTenantBranding } from "@/hooks/useTenantBranding";
import { useTheme } from "@/context/ThemeContext";
import { useCartContext } from "@/context/CartContext";
import UiverseProductCard from "@/components/store/UiverseProductCard";
import UiverseSearchModal from "@/components/UiverseSearchModal";
import {
  StoreBottomNav,
  StoreFabrickLogo,
  StorefrontHeader,
} from "@/components/store/StorefrontChrome";

type Product = {
  id: string;
  name: string;
  price: number;
  category?: string;
  category_id?: string;
  tagline?: string;
  description?: string;
  features?: string[];
  dimensions?: string;
  delivery?: string;
  delivery_days?: string;
  img?: string;
  image_url?: string;
  discountPercentage?: number;
  discount_percentage?: number;
  rating?: number;
  stock?: number | string;
};
const FALLBACK_PRODUCTS = FALLBACK_CATALOG_PRODUCTS as Product[];
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=1800&auto=format&fit=crop";

function getCategory(product: Product) {
  return product.category || product.category_id || "Producto";
}
function getImage(product: Product) {
  return (
    product.img ||
    product.image_url ||
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop"
  );
}
function getDiscount(product: Product) {
  return product.discountPercentage ?? product.discount_percentage ?? 0;
}
function getStockNumber(product: Product) {
  if (typeof product.stock === "number") return product.stock;
  const match = String(product.stock || "").match(/[0-9]+/);
  return match ? Number(match[0]) : null;
}
function getStockBadge(product: Product) {
  const stock = getStockNumber(product);
  if (stock === null) return "Stock por confirmar";
  if (stock <= 0) return "Sin stock";
  if (stock <= 3) return `Crítico · ${stock}`;
  if (stock <= 10) return `Bajo · ${stock}`;
  return `Disponible · ${stock}`;
}
function getDelivery(product: Product) {
  return product.delivery || product.delivery_days || "Entrega coordinada";
}
function asCartProduct(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: getImage(product),
    category_id: getCategory(product),
    discount_percentage: getDiscount(product),
    stock: typeof product.stock === "number" ? product.stock : undefined,
    description: product.description,
    tagline: product.tagline,
  };
}

export default function TiendaClientV2() {
  const router = useRouter();
  const { branding } = useTenantBranding();
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "gold";
  const {
    products: catalogProducts,
    connected,
    fetchComplete,
  } = useCatalogProducts();
  const { addToCart } = useCartContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const brandName = branding.name || "Soluciones Fabrick";
  const supportLink = branding.whatsappUrl || "/contacto";
  const liveProducts = useMemo<Product[]>(
    () =>
      catalogProducts.length
        ? (catalogProducts as Product[])
        : FALLBACK_PRODUCTS,
    [catalogProducts],
  );
  const categories = useMemo(
    () => [
      "Todos",
      ...Array.from(new Set(liveProducts.map(getCategory)))
        .filter(Boolean)
        .slice(0, 8),
    ],
    [liveProducts],
  );
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return liveProducts.filter((product) => {
      const category = getCategory(product);
      const stock = getStockNumber(product);
      const haystack =
        `${product.name} ${category} ${product.tagline || ""} ${product.description || ""}`.toLowerCase();
      if (activeCategory !== "Todos" && category !== activeCategory)
        return false;
      if (onlyDeals && getDiscount(product) <= 0) return false;
      if (onlyInStock && stock !== null && stock <= 0) return false;
      return !q || haystack.includes(q);
    });
  }, [activeCategory, liveProducts, onlyDeals, onlyInStock, searchQuery]);
  const featured = filteredProducts.slice(0, 12);
  function selectProduct(product: Product) {
    navigateWithTransition(`/tienda/${product.id}`, router);
  }
  function addProduct(e: MouseEvent, product: Product) {
    e.stopPropagation();
    addToCart(asCartProduct(product) as Parameters<typeof addToCart>[0]);
  }
  function goSupport() {
    if (supportLink.startsWith("http"))
      window.open(supportLink, "_blank", "noopener,noreferrer");
    else router.push(supportLink);
  }
  function clearFilters() {
    setSearchQuery("");
    setActiveCategory("Todos");
    setOnlyDeals(false);
    setOnlyInStock(false);
  }
  return (
    <div
      className={`relative isolate min-h-screen overflow-x-hidden ${isDark ? "bg-[#070603] text-[#fff9ec]" : "bg-[#f4edda] text-neutral-950"}`}
    >
      <style>{`
        .store-scroll::-webkit-scrollbar{display:none}.store-scroll{scrollbar-width:none}
        @keyframes storeAuraOne{0%,100%{transform:translate3d(-8%,-5%,0) scale(1)}50%{transform:translate3d(18%,10%,0) scale(1.14)}}
        @keyframes storeAuraTwo{0%,100%{transform:translate3d(9%,12%,0) scale(1.08)}50%{transform:translate3d(-18%,-8%,0) scale(.94)}}
        @keyframes storeAuraThree{0%,100%{transform:translate3d(0,8%,0) rotate(0deg)}50%{transform:translate3d(12%,-12%,0) rotate(9deg)}}
        .store-aura{position:absolute;border-radius:9999px;filter:blur(74px);pointer-events:none;will-change:transform}
        .store-aura-one{animation:storeAuraOne 17s ease-in-out infinite}
        .store-aura-two{animation:storeAuraTwo 22s ease-in-out infinite}
        .store-aura-three{animation:storeAuraThree 19s ease-in-out infinite}
        @media (prefers-reduced-motion:reduce){.store-aura{animation:none!important}.store-motion{transition:none!important}}
      `}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <span className={`store-aura store-aura-one -left-36 top-12 h-[28rem] w-[28rem] ${isDark ? "bg-yellow-300/15" : "bg-yellow-500/20"}`} />
        <span className={`store-aura store-aura-two -right-40 top-[34rem] h-[34rem] w-[34rem] ${isDark ? "bg-[#fff0c2]/10" : "bg-[#fff8df]/75"}`} />
        <span className={`store-aura store-aura-three left-[22%] top-[78rem] h-[30rem] w-[30rem] ${isDark ? "bg-amber-700/10" : "bg-amber-400/20"}`} />
      </div>
      <StorefrontHeader onSearch={() => setSearchOpen(true)} />
      <header className="mx-auto max-w-[1320px] pb-5 md:px-8 md:pb-9 md:pt-4">
        <section className="relative isolate min-h-[460px] overflow-hidden bg-[#090805]/92 text-white shadow-[0_32px_100px_rgba(0,0,0,.28)] md:min-h-[540px] md:rounded-[2.75rem]">
          <img
            src={HERO_IMAGE}
            alt="Cocina moderna equipada con productos para el hogar"
            className="absolute inset-y-0 right-0 h-full w-full object-cover object-center opacity-45 md:w-[66%] md:opacity-70"
            style={{ WebkitMaskImage: "linear-gradient(90deg, transparent 0%, black 40%, black 100%)", maskImage: "linear-gradient(90deg, transparent 0%, black 40%, black 100%)" }}
            loading="eager"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,7,4,.98)_0%,rgba(8,7,4,.86)_48%,rgba(8,7,4,.18)_100%)]" />
          <div className="store-aura store-aura-one -left-24 -top-28 h-80 w-80 bg-yellow-300/20" />
          <div className="store-aura store-aura-two bottom-[-12rem] right-[10%] h-96 w-96 bg-[#fff1c4]/15" />
          <div className="relative z-10 flex min-h-[460px] max-w-3xl flex-col justify-end px-6 py-9 md:min-h-[540px] md:p-12 lg:p-14">
            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fff5d6]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.22em] text-yellow-100 backdrop-blur-xl">
              <BadgeCheck className="h-3.5 w-3.5" /> Productos seleccionados
            </div>
            <h1 className="mt-5 text-[clamp(42px,8vw,80px)] font-black leading-[.88] tracking-[-.075em]">Tu hogar, mejor resuelto.</h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#f7eedb]/78 md:text-base">Productos elegidos por utilidad, consumo y respaldo. Compara sin ruido y suma instalación cuando realmente la necesitas.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => setSearchOpen(true)} className="store-motion inline-flex min-h-12 items-center gap-2 rounded-full bg-yellow-300 px-6 text-sm font-black text-black shadow-[0_14px_40px_rgba(250,204,21,.22)] transition hover:-translate-y-0.5 hover:bg-[#fff5d6]"><Search className="h-4 w-4" /> Buscar productos</button>
              <a href="#storeFilters" className="store-motion inline-flex min-h-12 items-center rounded-full bg-[#fff5d6]/10 px-6 text-sm font-black text-[#fff8e9] backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-[#fff5d6]/18">Explorar categorías</a>
            </div>
          </div>
        </section>
      </header>
      <main className="mx-auto max-w-[1320px] px-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-16">
        <section aria-label="Buscar productos" className={`mb-4 rounded-[1.6rem] p-3 shadow-[0_22px_70px_rgba(0,0,0,.10)] backdrop-blur-2xl md:flex md:items-center md:gap-4 ${isDark ? "bg-[#fff6dc]/[0.07]" : "bg-white/60"}`}>
          <label className="relative block flex-1">
            <span className="sr-only">Buscar en la tienda</span>
            <Search className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${isDark ? "text-yellow-300" : "text-amber-700"}`} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="¿Qué quieres mejorar? Aire, iluminación, grifería..." className={`h-14 w-full rounded-2xl border-0 pl-12 pr-4 text-sm font-semibold outline-none ring-0 transition focus:ring-2 focus:ring-yellow-300/45 ${isDark ? "bg-black/30 text-white placeholder:text-[#f7eedb]/35" : "bg-[#fffaf0]/80 text-neutral-950 placeholder:text-neutral-400"}`} />
          </label>
          <p className={`mt-3 px-2 text-xs md:mt-0 md:max-w-[280px] ${isDark ? "text-zinc-300" : "text-neutral-600"}`}>{filteredProducts.length} soluciones encontradas · compra directa o asistencia humana.</p>
        </section>
        <section className={`mb-4 overflow-hidden rounded-[1.8rem] p-4 shadow-[0_24px_70px_rgba(0,0,0,.10)] backdrop-blur-2xl sm:p-6 ${isDark ? "bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,.12),transparent_36%),rgba(255,246,220,.065)]" : "bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,.18),transparent_38%),rgba(255,255,255,.68)]"}`}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[.24em] ${isDark ? "text-yellow-300" : "text-amber-700"}`}>Compra con la medida correcta</p>
              <h2 className="mt-1 max-w-[18ch] text-[1.7rem] font-black leading-[.98] tracking-[-.05em] sm:max-w-none sm:text-3xl">Calcula antes de comprar.</h2>
            </div>
            <p className={`hidden max-w-sm text-right text-xs leading-5 sm:block ${isDark ? "text-[#f7eedb]/58" : "text-neutral-600"}`}>Obtén una capacidad o cantidad recomendada y compra con una referencia clara.</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <a href="/herramientas/aire-acondicionado" className="group flex min-w-0 flex-col rounded-[1.45rem] bg-[#f8f1df] p-3.5 text-black shadow-[0_16px_40px_rgba(0,0,0,.12)] transition hover:-translate-y-1 sm:grid sm:grid-cols-[64px_1fr_auto] sm:items-center sm:gap-4 sm:p-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0c1118] text-cyan-300 shadow-inner sm:h-16 sm:w-16"><Snowflake className="h-6 w-6 sm:h-7 sm:w-7" /></span>
              <span className="mt-4 min-w-0 sm:mt-0">
                <span className="block text-[8px] font-black uppercase tracking-[.16em] text-blue-700 sm:text-[9px]">Climatización</span>
                <b className="mt-1 block text-[15px] leading-[1.05] sm:text-base">Aire correcto para tu espacio</b>
                <span className="mt-2 block text-[10px] leading-4 text-black/58 sm:text-xs">BTU, equipo y consumo mensual.</span>
              </span>
              <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[.12em] sm:mt-0 sm:grid sm:h-10 sm:w-10 sm:place-items-center sm:rounded-full sm:bg-black sm:text-white"><span className="sm:sr-only">Calcular aire</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </a>
            <a href="/herramientas/radier" className="group flex min-w-0 flex-col rounded-[1.45rem] bg-yellow-300 p-3.5 text-black shadow-[0_16px_40px_rgba(250,204,21,.14)] transition hover:-translate-y-1 sm:grid sm:grid-cols-[64px_1fr_auto] sm:items-center sm:gap-4 sm:p-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-black/90 text-yellow-300 shadow-inner sm:h-16 sm:w-16"><Hammer className="h-6 w-6 sm:h-7 sm:w-7" /></span>
              <span className="mt-4 min-w-0 sm:mt-0">
                <span className="block text-[8px] font-black uppercase tracking-[.16em] text-black/55 sm:text-[9px]">Construcción</span>
                <b className="mt-1 block text-[15px] leading-[1.05] sm:text-base">Radier con materiales claros</b>
                <span className="mt-2 block text-[10px] leading-4 text-black/58 sm:text-xs">Área, capas y costo referencial.</span>
              </span>
              <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[.12em] sm:mt-0 sm:grid sm:h-10 sm:w-10 sm:place-items-center sm:rounded-full sm:bg-black sm:text-white"><span className="sm:sr-only">Calcular radier</span><ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
            </a>
          </div>
        </section>
        <section
          id="storeFilters"
          className={`sticky top-16 z-30 -mx-4 scroll-mt-20 px-4 py-3 shadow-[0_18px_46px_rgba(0,0,0,.10)] backdrop-blur-2xl md:top-[68px] md:mx-0 md:rounded-[1.5rem] ${isDark ? "bg-[#0b0905]/88" : "bg-[#f4edda]/88"}`}
        >
          <div className="store-scroll flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${activeCategory === cat ? "bg-yellow-300 text-black shadow-[0_8px_24px_rgba(250,204,21,.18)]" : isDark ? "bg-[#fff6dc]/[0.07] text-[#fff8e9]/70" : "bg-white/65 text-neutral-600"}`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setOnlyDeals((value) => !value)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${onlyDeals ? "bg-[#fff1c4] text-black" : isDark ? "bg-[#fff6dc]/[0.07] text-[#fff8e9]/70" : "bg-white/65 text-neutral-600"}`}
            >
              Ofertas
            </button>
            <button
              onClick={() => setOnlyInStock((value) => !value)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${onlyInStock ? "bg-yellow-300 text-black" : isDark ? "bg-[#fff6dc]/[0.07] text-[#fff8e9]/70" : "bg-white/65 text-neutral-600"}`}
            >
              Stock listo
            </button>
          </div>
        </section>
        <div className="mb-5 mt-9 flex items-end justify-between gap-4">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-[.24em] ${isDark ? "text-yellow-200" : "text-amber-700"}`}>Selección Fabrick</p>
            <h2 className="mt-2 text-3xl font-black tracking-[-.045em] md:text-4xl">Soluciones para usar todos los días.</h2>
          </div>
          <p className={`hidden max-w-sm text-right text-sm leading-6 md:block ${isDark ? "text-[#f7eedb]/55" : "text-neutral-600"}`}>Precio, disponibilidad y entrega visibles antes de entrar al detalle.</p>
        </div>
        {featured.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((product) => (
              <UiverseProductCard
                key={product.id}
                name={product.name}
                price={product.price}
                category={getCategory(product)}
                img={getImage(product)}
                description={product.description || product.tagline}
                features={
                  product.features ||
                  [product.dimensions || "", getDelivery(product)].filter(
                    Boolean,
                  )
                }
                discountPct={getDiscount(product)}
                rating={product.rating}
                stock={product.stock}
                stockLabel={getStockBadge(product)}
                deliveryLabel={getDelivery(product)}
                isDark={isDark}
                onSelect={() => selectProduct(product)}
                onAddToCart={(e) => addProduct(e, product)}
              />
            ))}
          </div>
        ) : (
          <div className={`mt-6 rounded-[2rem] p-8 text-center backdrop-blur-2xl ${isDark ? "bg-[#fff6dc]/[0.07]" : "bg-white/65"}`}>
            <p className="text-xl font-black">
              No encontré productos con esos filtros.
            </p>
            <button
              onClick={clearFilters}
              className="mt-5 rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </main>
      <section className="mx-auto grid max-w-[1320px] gap-3 px-4 pb-16 md:grid-cols-3 md:px-8 md:pb-20">
        {[
          [
            ShieldCheck,
            "Compra con respaldo",
            "Orden registrada, pago validado y seguimiento en un solo lugar.",
          ],
          [
            Truck,
            "Entrega coordinada",
            "Confirma cobertura, dirección y plazo antes del despacho.",
          ],
          [
            Wrench,
            "¿Necesitas instalación?",
            "Te conectamos con soporte humano cuando el producto requiere visita o montaje.",
          ],
        ].map(([Icon, title, text]) => {
          const IconComponent = Icon as typeof ShieldCheck;
          return (
            <article
              key={String(title)}
              className={`rounded-[1.6rem] p-5 shadow-[0_20px_55px_rgba(0,0,0,.08)] backdrop-blur-2xl ${isDark ? "bg-[#fff6dc]/[0.055]" : "bg-white/55"}`}
            >
              <IconComponent className="mb-4 h-7 w-7 text-yellow-300" />
              <h3 className="text-xl font-black">{String(title)}</h3>
              <p
                className={`mt-2 text-sm leading-6 ${isDark ? "text-zinc-300" : "text-neutral-600"}`}
              >
                {String(text)}
              </p>
            </article>
          );
        })}
      </section>
      <footer className="bg-black/90 px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-8 text-white backdrop-blur-2xl md:px-8 md:py-8">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <StoreFabrickLogo tone="dark" branding={branding} compact />
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-300">Productos útiles, compra clara e instalación coordinada cuando la necesitas.</p>
            <p className="mt-3 text-[10px] uppercase tracking-[.14em] text-zinc-500">© {new Date().getFullYear()} {brandName} · Claridad para construir y mejorar.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full bg-white/[0.07] p-3 text-white/70 hover:bg-white/[0.12] hover:text-white"
              aria-label="Facebook"
            >
              <Facebook size={18} />
            </button>
            <button
              className="rounded-full bg-white/[0.07] p-3 text-white/70 hover:bg-white/[0.12] hover:text-white"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </button>
            <button
              onClick={goSupport}
              className="rounded-full bg-yellow-300 px-5 py-3 text-sm font-black text-black transition hover:bg-white"
            >
              Hablar con un asesor
            </button>
          </div>
        </div>
      </footer>
      <StoreBottomNav />
      <UiverseSearchModal
        open={searchOpen}
        value={searchQuery}
        onChange={setSearchQuery}
        onClose={() => setSearchOpen(false)}
        onFilterClick={() => {
          setSearchOpen(false);
        }}
        resultCount={searchQuery.trim() ? filteredProducts.length : undefined}
      />
      <div className="hidden text-xs opacity-0">
        {connected ? "online" : "offline"} {fetchComplete ? "ready" : "loading"}
      </div>
    </div>
  );
}
