'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Camera,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Heart,
  LogOut,
  MapPin,
  Package,
  Phone,
  Save,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';
import { useAuth } from '@/context/AuthContext';
import { insforge } from '@/lib/insforge';
import { formatCLP, normalizeOrderRecord, orderStatusColor, orderStatusLabel, shortRecordId } from '@/lib/commerce';
import { useFavorites } from '@/hooks/useFavorites';
import { useRealtimeProducts, type Product } from '@/hooks/useRealtimeProducts';
import { getInitials } from '@/lib/initials';

type NormOrder = ReturnType<typeof normalizeOrderRecord>;
type CustomerProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  commune: string;
  region: string;
  avatarUrl: string;
};

const EMPTY_PROFILE: CustomerProfile = { firstName: '', lastName: '', phone: '', address: '', commune: '', region: '', avatarUrl: '' };
const PROFILE_KEY = (id: string) => `fabrick.customer-profile.v2.${id}`;
const LEGACY_PROFILE_KEY = (id: string) => `fabrick.profile.v1.${id}`;

function readProfile(id: string, authName?: string, authAvatar?: string): CustomerProfile {
  const base = { ...EMPTY_PROFILE, avatarUrl: authAvatar || '' };
  if (authName) {
    const parts = authName.trim().split(/\s+/);
    base.firstName = parts[0] || '';
    base.lastName = parts.slice(1).join(' ');
  }
  if (typeof window === 'undefined') return base;
  try {
    const raw = localStorage.getItem(PROFILE_KEY(id));
    if (raw) return { ...base, ...(JSON.parse(raw) as Partial<CustomerProfile>), avatarUrl: (JSON.parse(raw) as Partial<CustomerProfile>).avatarUrl || authAvatar || '' };
    const legacyRaw = localStorage.getItem(LEGACY_PROFILE_KEY(id));
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as { nombre?: string; apellido?: string; direccion?: string; whatsapp?: string };
      return { ...base, firstName: legacy.nombre || base.firstName, lastName: legacy.apellido || base.lastName, phone: legacy.whatsapp || '', address: legacy.direccion || '' };
    }
  } catch {}
  return base;
}

function persistProfile(id: string, profile: CustomerProfile) {
  try { localStorage.setItem(PROFILE_KEY(id), JSON.stringify(profile)); } catch {}
}

function finalPrice(product: Product) {
  const discount = Math.max(0, Math.min(100, Number(product.discount_percentage || 0)));
  return Math.round(product.price * (1 - discount / 100));
}

async function imageToDataUrl(file: File) {
  if (file.size > 6 * 1024 * 1024) throw new Error('La foto supera 6 MB.');
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) throw new Error('Usa una foto JPG, PNG o WebP.');
  const bitmap = await createImageBitmap(file);
  const max = 1080;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar la imagen.');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.86);
}

function Avatar({ profile, fallback }: { profile: CustomerProfile; fallback: string }) {
  if (profile.avatarUrl) return <img src={profile.avatarUrl} alt="Foto de perfil" className="h-24 w-24 shrink-0 rounded-[1.7rem] object-cover ring-4 ring-[#F6C64A]/20" />;
  return <div className="grid h-24 w-24 shrink-0 place-items-center rounded-[1.7rem] bg-[#F6C64A] text-2xl font-black text-[#080B0D] ring-4 ring-[#F6C64A]/15">{getInitials(`${profile.firstName} ${profile.lastName}`) || getInitials(fallback) || <User className="h-9 w-9" />}</div>;
}

function Stat({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof ShoppingBag }) {
  return <article className="rounded-[1.35rem] border border-white/[.08] bg-[#11191D] p-4"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F6C64A]/10 text-[#F6C64A]"><Icon className="h-4 w-4" /></span><div><b className="block text-xl text-white">{value}</b><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8E9BA1]">{label}</span></div></div></article>;
}

export default function MiCuentaPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { user, loading, signOut, refresh } = useAuth();
  const { favorites, loading: favoritesLoading } = useFavorites();
  const { products, loading: productsLoading } = useRealtimeProducts();
  const [orders, setOrders] = useState<NormOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profile, setProfile] = useState<CustomerProfile>(EMPTY_PROFILE);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { if (!loading && !user) router.replace('/auth'); }, [user, loading, router]);
  useEffect(() => { if (user?.id) setProfile(readProfile(user.id, user.name, user.avatarUrl)); }, [user?.id, user?.name, user?.avatarUrl]);

  const loadOrders = useCallback(async () => {
    if (!user?.email) { setOrdersLoading(false); return; }
    setOrdersLoading(true);
    try {
      const { data } = await insforge.database.from('orders')
        .select('id, customer_name, customer_email, items, subtotal, total, currency, status, created_at, updated_at, payment_id, payment_status, shipping_address, region, customer_phone, tax, shipping_fee')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false }).limit(50);
      const normalized = Array.isArray(data) ? (data as Record<string, unknown>[]).map(normalizeOrderRecord) : [];
      setOrders(normalized);
      if (normalized[0] && user.id) {
        setProfile((current) => {
          const latest = normalized[0];
          const next = {
            ...current,
            phone: current.phone || latest.customer_phone,
            address: current.address || latest.shipping_address,
            region: current.region || latest.region,
          };
          persistProfile(user.id, next);
          return next;
        });
      }
    } catch { setOrders([]); }
    setOrdersLoading(false);
  }, [user?.email, user?.id]);

  useEffect(() => { if (user) void loadOrders(); }, [user, loadOrders]);

  const favoriteProducts = useMemo(() => products.filter((product) => favorites.has(product.id)).slice(0, 4), [products, favorites]);
  const completed = orders.filter((order) => order.status === 'entregado').length;
  const pending = orders.filter((order) => !['entregado', 'cancelado'].includes(order.status)).length;
  const displayName = `${profile.firstName} ${profile.lastName}`.trim() || user?.name || user?.email || 'Cliente';

  async function handleSave() {
    if (!user) return;
    if (!profile.firstName.trim()) { setNotice('Ingresa al menos tu nombre.'); return; }
    setSaving(true); setNotice('');
    persistProfile(user.id, profile);
    try {
      const auth = insforge.auth as unknown as { setProfile: (value: Record<string, string>) => Promise<{ error?: { message?: string } | null }> };
      const payload: Record<string, string> = { name: `${profile.firstName} ${profile.lastName}`.trim() };
      if (profile.avatarUrl) payload.avatar_url = profile.avatarUrl;
      const result = await auth.setProfile(payload);
      if (result?.error) throw new Error(result.error.message || 'No se pudo sincronizar el perfil.');
      await refresh();
      setNotice('Perfil actualizado.');
      setEditing(false);
    } catch {
      setNotice('Datos de entrega guardados en este dispositivo. Nombre/foto se sincronizarán cuando el servicio esté disponible.');
    } finally { setSaving(false); }
  }

  async function handleAvatar(file?: File) {
    if (!file || !user) return;
    setAvatarUploading(true); setNotice('');
    try {
      const dataUrl = await imageToDataUrl(file);
      const { data } = await insforge.auth.refreshSession();
      if (!data?.accessToken) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
      const response = await fetch('/api/account/avatar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.accessToken}` }, body: JSON.stringify({ dataUrl }) });
      const json = await response.json().catch(() => null) as { url?: string; error?: string } | null;
      if (!response.ok || !json?.url) throw new Error(json?.error || 'No se pudo subir la foto.');
      const next = { ...profile, avatarUrl: json.url };
      setProfile(next); persistProfile(user.id, next);
      const auth = insforge.auth as unknown as { setProfile: (value: Record<string, string>) => Promise<unknown> };
      await auth.setProfile({ avatar_url: json.url, name: `${next.firstName} ${next.lastName}`.trim() || displayName });
      await refresh();
      setNotice('Foto actualizada en Cloudinary.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo actualizar la foto.'); }
    finally { setAvatarUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function handleSignOut() { await signOut(); router.replace('/'); }

  if (loading || !user) return <div className="min-h-screen bg-[#080B0D]" />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080B0D] pb-[calc(7rem+env(safe-area-inset-bottom))] text-[#F7F4ED] md:pb-16">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-24 sm:px-6 sm:pt-28">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/[.08] bg-[#0D1418] p-5 shadow-[0_28px_90px_rgba(0,0,0,.3)] sm:p-7">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_0%,rgba(246,198,74,.13),transparent_30rem)]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
            <div className="relative w-fit"><Avatar profile={profile} fallback={user.email || ''} /><button type="button" onClick={() => fileRef.current?.click()} disabled={avatarUploading} className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full border-2 border-[#0D1418] bg-[#F6C64A] text-[#080B0D] shadow-lg disabled:opacity-50" aria-label="Cambiar foto"><Camera className="h-4 w-4" /></button><input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleAvatar(event.target.files?.[0])} /></div>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Mi cuenta Fabrick</p><h1 className="mt-2 text-3xl font-black tracking-[-.045em] sm:text-4xl">{displayName}</h1><p className="mt-2 truncate text-[13px] text-[#AEB8BC]">{user.email}</p><div className="mt-3 flex flex-wrap gap-3 text-[12px] text-[#C5CDD1]">{profile.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#F6C64A]" />{profile.phone}</span> : null}{profile.address ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#F6C64A]" />{profile.address}</span> : null}</div></div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditing((value) => !value)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F6C64A] px-4 text-[11px] font-black text-[#080B0D]"><Edit3 className="h-4 w-4" /> Editar perfil</button><button type="button" onClick={() => void handleSignOut()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/12 bg-white/[.035] px-4 text-[11px] font-black text-[#D9E0E3]"><LogOut className="h-4 w-4" /> Salir</button></div>
          </div>
        </section>

        {notice ? <div className="mt-3 rounded-[1.1rem] border border-[#F6C64A]/20 bg-[#F6C64A]/[.06] px-4 py-3 text-[12px] leading-5 text-[#E9DDAE]">{notice}</div> : null}

        {editing ? <section className="mt-4 rounded-[1.7rem] border border-white/[.08] bg-[#11191D] p-5 sm:p-6"><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#F6C64A]">Datos del cliente</p><h2 className="mt-1 text-xl font-black">Perfil y dirección de entrega</h2></div><button type="button" onClick={() => setEditing(false)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-[#AEB8BC]"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><ProfileField label="Nombre" value={profile.firstName} onChange={(value) => setProfile({ ...profile, firstName: value })} /><ProfileField label="Apellido" value={profile.lastName} onChange={(value) => setProfile({ ...profile, lastName: value })} /><ProfileField label="Teléfono / WhatsApp" value={profile.phone} onChange={(value) => setProfile({ ...profile, phone: value })} type="tel" /><ProfileField label="Región" value={profile.region} onChange={(value) => setProfile({ ...profile, region: value })} /><div className="sm:col-span-2"><ProfileField label="Dirección" value={profile.address} onChange={(value) => setProfile({ ...profile, address: value })} placeholder="Calle, número, parcela o referencia" /></div><div className="sm:col-span-2"><ProfileField label="Comuna" value={profile.commune} onChange={(value) => setProfile({ ...profile, commune: value })} /></div></div><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-xl text-[11px] leading-5 text-[#829096]">Nombre y foto se sincronizan con tu cuenta. Teléfono y dirección se mantienen privados en este dispositivo y también se recuperan desde tus pedidos cuando existe historial.</p><button type="button" onClick={() => void handleSave()} disabled={saving} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F6C64A] px-6 text-[11px] font-black text-[#080B0D] disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Guardando…' : 'Guardar cambios'}</button></div></section> : null}

        <section className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat icon={ShoppingBag} label="Pedidos" value={orders.length} /><Stat icon={CheckCircle2} label="Entregados" value={completed} /><Stat icon={Package} label="En proceso" value={pending} /><Stat icon={Heart} label="Guardados" value={favorites.size} /></section>

        <section className="mt-7"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Guardados</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Productos que te gustan</h2></div><Link href="/favoritos" className="text-[11px] font-black text-[#F6C64A]">Ver todos →</Link></div>{favoritesLoading || productsLoading ? <div className="rounded-[1.4rem] border border-white/[.07] bg-[#11191D] p-5 text-[12px] text-[#8E9BA1]">Actualizando productos guardados…</div> : favoriteProducts.length ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{favoriteProducts.map((product) => <Link key={product.id} href={`/producto/${encodeURIComponent(product.id)}`} className="group overflow-hidden rounded-[1.4rem] border border-white/[.08] bg-[#11191D] transition hover:border-[#F6C64A]/45"><div className="aspect-square bg-[#0B1114] p-3">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain transition group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center text-[#56646A]"><Package className="h-8 w-8" /></div>}</div><div className="p-3"><h3 className="line-clamp-2 min-h-10 text-[13px] font-black leading-5">{product.name}</h3><b className="mt-2 block text-[15px] text-[#F6C64A]">{formatCLP(finalPrice(product))}</b><span className="mt-1 block text-[9px] font-black uppercase tracking-[.12em] text-[#7F8C92]">IVA incluido</span><span className="mt-3 block text-[10px] font-black text-[#D7DEE1]">Ver producto →</span></div></Link>)}</div> : <div className="rounded-[1.4rem] border border-white/[.07] bg-[#11191D] p-6"><Heart className="h-6 w-6 text-[#F6C64A]" /><h3 className="mt-3 font-black">Todavía no guardaste productos</h3><p className="mt-2 text-[12px] leading-5 text-[#8E9BA1]">Toca el corazón de un producto para encontrarlo aquí después.</p><Link href="/tienda" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[#F6C64A]/30 px-4 text-[11px] font-black text-[#F6C64A]">Explorar tienda</Link></div>}</section>

        <section className="mt-8"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Historial de compras</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Pedidos y detalles</h2></div><Link href="/tienda" className="text-[11px] font-black text-[#F6C64A]">Ir a tienda →</Link></div>{ordersLoading ? <div className="rounded-[1.4rem] border border-white/[.07] bg-[#11191D] p-5 text-[12px] text-[#8E9BA1]">Actualizando tu historial…</div> : orders.length === 0 ? <div className="rounded-[1.6rem] border border-white/[.08] bg-[#11191D] p-7 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-[#F6C64A]" /><h3 className="mt-3 text-lg font-black">Aún no tienes pedidos</h3><p className="mx-auto mt-2 max-w-md text-[12px] leading-5 text-[#8E9BA1]">Cuando realices una compra, aquí podrás abrir el pedido, revisar productos, entrega y estado.</p></div> : <div className="grid gap-3">{orders.map((order) => <details key={order.id} className="group rounded-[1.45rem] border border-white/[.08] bg-[#11191D] open:border-[#F6C64A]/25"><summary className="flex cursor-pointer list-none items-center gap-4 p-4 sm:p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F6C64A]/10 text-[#F6C64A]"><Package className="h-5 w-5" /></span><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#F6C64A]">Pedido #{shortRecordId(order.id)}</p><p className="mt-1 line-clamp-1 text-[12px] text-[#AEB8BC]">{order.items.length ? order.items.map((item) => `${item.name} ×${item.quantity}`).join(' · ') : 'Detalle del pedido'}</p></div><div className="shrink-0 text-right"><b className="block text-[16px]">{formatCLP(order.total)}</b><span className="text-[10px] font-black" style={{ color: orderStatusColor(order.status) }}>{orderStatusLabel(order.status)}</span></div><ChevronDown className="h-4 w-4 shrink-0 text-[#7F8C92] transition group-open:rotate-180" /></summary><div className="border-t border-white/[.07] p-4 sm:p-5"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{order.items.map((item, index) => <Link key={`${item.productId}-${index}`} href={item.productId && item.productId !== 'sin-id' ? `/producto/${encodeURIComponent(item.productId)}` : '/tienda'} className="rounded-xl border border-white/[.07] bg-[#0B1114] p-3 transition hover:border-[#F6C64A]/35"><b className="line-clamp-2 text-[12px] leading-5">{item.name}</b><div className="mt-2 flex items-center justify-between text-[11px] text-[#8E9BA1]"><span>{item.quantity} × {formatCLP(item.unitPrice)}</span><strong className="text-[#DDE3E5]">{formatCLP(item.subtotal)}</strong></div><span className="mt-2 block text-[9px] font-black text-[#F6C64A]">Ver producto →</span></Link>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><Info icon={MapPin} label="Entrega" value={order.shipping_address || 'Dirección no registrada'} /><Info icon={Phone} label="Contacto" value={order.customer_phone || user.email || '—'} /><Info icon={Truck} label="Despacho" value={order.shipping_fee > 0 ? formatCLP(order.shipping_fee) : 'Sin costo / incluido'} /><Info icon={ShieldCheck} label="Pago" value={order.payment_status || 'Estado en seguimiento'} /></div><div className="mt-4 rounded-xl border border-white/[.07] bg-[#0B1114] p-4"><div className="flex items-center justify-between gap-4 text-[12px] text-[#AEB8BC]"><span>Productos</span><b className="text-white">{formatCLP(order.subtotal)}</b></div><div className="mt-2 flex items-center justify-between gap-4 text-[12px] text-[#AEB8BC]"><span>Total pagado · IVA incluido</span><b className="text-lg text-[#F6C64A]">{formatCLP(order.total)}</b></div><p className="mt-2 text-[10px] leading-5 text-[#738087]">El IVA está incluido en el precio final; no se muestra un desglose tributario en esta vista comercial.</p></div><div className="mt-4 flex flex-wrap gap-3 text-[10px] font-black"><Link href="/seguimiento" className="text-[#F6C64A]">Seguimiento →</Link><Link href="/legal/cambios-y-devoluciones" className="text-[#AEB8BC]">Cambios y devoluciones →</Link></div></div></details>)}</div>}</section>

        <section className="mt-7 flex items-start gap-3 rounded-[1.35rem] border border-white/[.08] bg-[#11191D] p-4"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#F6C64A]" /><div><p className="text-[12px] font-black">Cuenta protegida</p><p className="mt-1 text-[11px] leading-5 text-[#829096]">Tu historial se consulta con tu sesión de cliente. La foto se almacena en Cloudinary y los datos de entrega no se publican en tu perfil público.</p></div></section>
      </main>
      <StoreBottomNav />
    </div>
  );
}

function ProfileField({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#9AA6AB]">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-h-12 rounded-xl border border-white/10 bg-[#0B1114] px-4 text-[15px] text-white outline-none placeholder:text-[#56646A] focus:border-[#F6C64A]/55" /></label>;
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div className="flex gap-3 rounded-xl border border-white/[.06] bg-[#0B1114] p-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#F6C64A]" /><div><span className="block text-[9px] font-black uppercase tracking-[.12em] text-[#738087]">{label}</span><b className="mt-1 block text-[11px] leading-5 text-[#CDD5D8]">{value}</b></div></div>;
}
