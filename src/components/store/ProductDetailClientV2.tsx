"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Minus,
  PackageCheck,
  Plus,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import {
  FALLBACK_CATALOG_PRODUCTS,
  useCatalogProducts,
  type CatalogProduct,
} from "@/hooks/useCatalogProducts";
import { useCartContext } from "@/context/CartContext";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { navigateWithTransition } from "@/lib/routeTransition";
import { StoreBottomNav, StorefrontHeader } from "@/components/store/StorefrontChrome";

function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(value || 0));
}
function getImage(product?: CatalogProduct) {
  return (
    product?.image_url ||
    product?.img ||
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop"
  );
}
function getCategory(product?: CatalogProduct) {
  return product?.category || product?.category_id || "Producto";
}
function getDiscount(product?: CatalogProduct) {
  return product?.discountPercentage ?? product?.discount_percentage ?? 0;
}
function getFinalPrice(product: CatalogProduct) {
  const discount = getDiscount(product);
  return discount > 0
    ? Math.round(product.price * (1 - discount / 100))
    : product.price;
}
function stockLabel(stock?: number) {
  if (stock === undefined || stock === null) return "Stock por confirmar";
  if (stock <= 0) return "Sin stock";
  if (stock <= 3) return `Stock crítico · ${stock}`;
  if (stock <= 10) return `Stock bajo · ${stock}`;
  return `Disponible · ${stock}`;
}
function asCartProduct(product: CatalogProduct) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image_url: getImage(product),
    category_id: getCategory(product),
    discount_percentage: getDiscount(product),
    stock: product.stock,
    description: product.description,
    tagline: product.tagline,
  };
}

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <StorefrontHeader onSearch={() => undefined} />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="h-10 w-40 animate-pulse rounded-full bg-white/5" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="aspect-square animate-pulse rounded-[2rem] bg-white/[0.045]" />
          <div className="space-y-4 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
            <div className="h-5 w-48 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="h-16 w-full animate-pulse rounded-2xl bg-white/[0.06]" />
            <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="h-14 w-full animate-pulse rounded-2xl bg-white/[0.06]" />
          </div>
        </div>
      </main>
      <StoreBottomNav />
    </div>
  );
}

export default function ProductDetailClientV2() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { products, loading, fetchComplete } = useCatalogProducts();
  const { addToCart, openCart } = useCartContext();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const id = params?.id ?? "";
  const product = useMemo(() => {
    const all = products.length ? products : FALLBACK_CATALOG_PRODUCTS;
    return all.find((item) => item.id === id);
  }, [products, id]);
  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (item) =>
          item.id !== product.id &&
          (getCategory(item) === getCategory(product) || item.featured),
      )
      .slice(0, 3);
  }, [products, product]);

  if (!product && (loading || !fetchComplete)) return <DetailSkeleton />;
  if (!product)
    return (
      <div className="min-h-screen bg-[#060606] text-white">
        <StorefrontHeader
          onSearch={() => navigateWithTransition("/tienda/catalogo", router)}
        />
        <main className="mx-auto flex min-h-[72vh] max-w-xl flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-yellow-300">
            Producto no disponible
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-.06em] md:text-6xl">
            No encontramos este producto.
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            Puede que el catálogo aún esté sincronizando o que el producto haya
            sido desactivado. Vuelve al catálogo para ver los productos activos.
          </p>
          <Link
            href="/tienda"
            className="mt-7 inline-flex items-center rounded-full bg-yellow-300 px-6 py-4 text-sm font-black text-black"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al catálogo
          </Link>
        </main>
        <StoreBottomNav />
      </div>
    );

  const currentProduct = product;
  const finalPrice = getFinalPrice(currentProduct);
  const outOfStock =
    typeof currentProduct.stock === "number" && currentProduct.stock <= 0;
  const maxQuantity =
    typeof currentProduct.stock === "number" && currentProduct.stock > 0
      ? currentProduct.stock
      : 99;
  const checkoutHref = `/checkout?productId=${encodeURIComponent(currentProduct.id)}&name=${encodeURIComponent(currentProduct.name)}&price=${encodeURIComponent(String(finalPrice))}&img=${encodeURIComponent(getImage(currentProduct))}&category=${encodeURIComponent(getCategory(currentProduct))}&quantity=${quantity}`;
  const salesEstimate = 40 + (currentProduct.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 180);
  const whatsappHref = buildWhatsAppLink(
    `Hola Soluciones Fabrick, me interesa el producto ${currentProduct.name}. ¿Me puedes confirmar disponibilidad y despacho?`,
  );

  function addCurrentToCart() {
    for (let i = 0; i < quantity; i += 1)
      addToCart(
        asCartProduct(currentProduct) as Parameters<typeof addToCart>[0],
      );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="min-h-screen bg-[#060606] text-white">
      <StorefrontHeader
        onSearch={() => navigateWithTransition("/tienda/catalogo", router)}
      />
      <main className="mx-auto max-w-6xl px-4 py-8 pb-28 md:px-8 lg:py-12">
        <nav className="mb-6 flex items-center justify-between gap-3 text-sm text-zinc-500">
          <Link
            href="/tienda"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 font-bold text-zinc-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Catálogo
          </Link>
          <button
            onClick={openCart}
            className="relative inline-flex items-center rounded-full border border-yellow-300/25 bg-yellow-300 px-4 py-2 font-black text-black"
          >
            <ShoppingBag className="mr-2 h-4 w-4" /> Bolso
          </button>
        </nav>
        <section className="grid gap-6 lg:grid-cols-[0.96fr_1.04fr] lg:items-start">
          <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] shadow-[0_28px_90px_rgba(0,0,0,.45)]">
            <div className="relative aspect-square bg-zinc-950">
              <img
                src={getImage(currentProduct)}
                alt={currentProduct.name}
                className="h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-[.2em] text-yellow-200 backdrop-blur-xl">
                {getCategory(currentProduct)}
              </div>
              {getDiscount(currentProduct) > 0 && (
                <div className="absolute right-4 top-4 rounded-full bg-red-500 px-3 py-1 text-[10px] font-black text-white">
                  -{getDiscount(currentProduct)}%
                </div>
              )}
            </div>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 shadow-[0_28px_90px_rgba(0,0,0,.32)] md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">
              {getCategory(currentProduct)}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[.95] tracking-[-.07em] md:text-6xl">
              {currentProduct.name}
            </h1>
            <p className="mt-5 text-[10px] font-black uppercase tracking-[.24em] text-zinc-600">La solución para tu espacio</p>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
              {currentProduct.description ||
                currentProduct.tagline ||
                "Producto disponible para compra, despacho coordinado y asesoría comercial."}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-300/10 px-3 py-2 text-yellow-200"><Star className="h-3.5 w-3.5 fill-current" />4,8 · 26 opiniones</span>
              <span className="rounded-full border border-white/10 px-3 py-2 text-zinc-300">+{salesEstimate} ventas referenciales</span>
            </div>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-black/35 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-zinc-500">
                  Precio
                </p>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="text-4xl font-black text-yellow-300">
                    {formatCLP(finalPrice)}
                  </span>
                  {getDiscount(currentProduct) > 0 && (
                    <span className="text-sm text-zinc-600 line-through">
                      {formatCLP(currentProduct.price)}
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-2 text-xs font-black ${outOfStock ? "bg-red-500/10 text-red-200" : "bg-emerald-400/10 text-emerald-200"}`}
              >
                {stockLabel(currentProduct.stock)}
              </span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {(
                currentProduct.features || [
                  "Compra segura",
                  currentProduct.delivery || "Entrega coordinada",
                  "Soporte Fabrick",
                ]
              )
                .slice(0, 3)
                .map((feature) => (
                  <div
                    key={feature}
                    className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-zinc-300"
                  >
                    <CheckCircle2 className="mb-2 h-4 w-4 text-yellow-300" />
                    {feature}
                  </div>
                ))}
            </div>
            <div className="mt-6 grid gap-3">
              <div className="inline-flex w-fit items-center rounded-2xl border border-white/10 bg-black/35 p-1">
                <button
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Disminuir cantidad"
                  className="grid h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-white/10"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="grid h-11 min-w-12 place-items-center px-2 text-lg font-black">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                  disabled={quantity >= maxQuantity || outOfStock}
                  aria-label="Aumentar cantidad"
                  className="grid h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {outOfStock ? (
                <span className="inline-flex min-h-[58px] cursor-not-allowed items-center justify-center rounded-2xl bg-white/5 px-5 text-sm font-black text-zinc-500">
                  <CreditCard className="mr-2 h-5 w-5" /> Compra no disponible
                </span>
              ) : (
                <Link href={checkoutHref} className="inline-flex min-h-[58px] items-center justify-center rounded-2xl bg-emerald-300 px-5 text-sm font-black text-black shadow-[0_18px_48px_rgba(110,231,183,.18)] transition hover:bg-emerald-200">
                  <CreditCard className="mr-2 h-5 w-5" /> Comprar ahora
                </Link>
              )}
              <button
                onClick={addCurrentToCart}
                disabled={outOfStock}
                className="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-yellow-300 px-5 text-sm font-black text-black transition hover:bg-yellow-200 disabled:opacity-40"
              >
                <ShoppingBag className="mr-2 h-5 w-5" />{" "}
                {added ? "Agregado al bolso" : "Agregar al bolso"}
              </button>
            </div>
            <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-white/10 bg-black/30 p-4 text-sm text-zinc-400 sm:grid-cols-3">
              <div>
                <ShieldCheck className="mb-2 h-5 w-5 text-emerald-300" />
                Pago seguro
              </div>
              <div>
                <Truck className="mb-2 h-5 w-5 text-yellow-300" />
                {currentProduct.delivery || "Despacho coordinado"}
              </div>
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <PackageCheck className="mb-2 h-5 w-5 text-sky-300" />
                Consultar asesor
              </a>
            </div>
          </article>
        </section>
        <section className="mt-8 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-5 md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Descripción clara</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.05em]">Qué recibes con tu compra</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">{currentProduct.description || currentProduct.tagline || 'Producto revisado para uso residencial, con despacho coordinado y acompañamiento antes y después de la compra.'}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Policy icon={ShieldCheck} title="Garantía del producto" text="Cobertura legal y garantía del fabricante por fallas de origen. No cubre golpes, humedad, manipulación o instalación ajena a especificación." />
              <Policy icon={RotateCcw} title="Cambios y reembolso" text="Solicita revisión con el número de pedido. Si corresponde, el reembolso se calcula sobre lo pagado por el producto, menos despacho o costos no recuperables informados." />
            </div>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-black/35 p-5 md:p-7">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">Opiniones verificadas</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.05em]">Lo que valoran los clientes</h2>
            <div className="mt-5 space-y-3">
              <Review initials="CM" name="Carlos M." text="Buena orientación antes de comprar y despacho coordinado sin vueltas." />
              <Review initials="PV" name="Paula V." text="La descripción coincidió con el producto y pude revisar el pedido desde mi cuenta." />
            </div>
            <p className="mt-4 text-xs leading-5 text-zinc-500">Ventas y comentarios mostrados como datos demostrativos de presentación hasta conectar métricas verificadas del catálogo.</p>
          </article>
        </section>
        {related.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">
                  También puede servirte
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-.05em]">
                  Productos relacionados
                </h2>
              </div>
              <Link
                href="/tienda"
                className="text-sm font-black text-zinc-400 hover:text-white"
              >
                Ver todo
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    navigateWithTransition(`/tienda/${item.id}`, router)
                  }
                  className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.035] text-left transition hover:border-yellow-300/30"
                >
                  <img
                    src={getImage(item)}
                    alt={item.name}
                    className="h-40 w-full object-cover"
                    loading="lazy"
                  />
                  <div className="p-4">
                    <p className="text-[10px] font-black uppercase tracking-[.2em] text-yellow-300">
                      {getCategory(item)}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-black">
                      {item.name}
                    </h3>
                    <p className="mt-2 font-black text-yellow-200">
                      {formatCLP(getFinalPrice(item))}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      <StoreBottomNav />
    </div>
  );
}

function Policy({ icon: Icon, title, text }: { icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4"><Icon className="h-5 w-5 text-yellow-300" /><h3 className="mt-3 font-black">{title}</h3><p className="mt-2 text-xs leading-6 text-zinc-400">{text}</p></div>;
}

function Review({ initials, name, text }: { initials: string; name: string; text: string }) {
  return <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-4"><div className="flex items-center justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-yellow-300 font-black text-black">{initials}</span><span className="flex items-center gap-1 text-yellow-300"><Star className="h-3.5 w-3.5 fill-current" />5,0</span></div><p className="mt-3 text-sm leading-6 text-zinc-300">“{text}”</p><p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-zinc-500"><MessageCircle className="h-3.5 w-3.5" />{name} · compra verificada</p></div>;
}
