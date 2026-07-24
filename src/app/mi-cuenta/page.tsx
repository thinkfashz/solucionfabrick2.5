'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  CheckCircle,
  Clock,
  Edit3,
  Facebook,
  Instagram,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import PushOptIn from '@/components/PushOptIn';
import { StoreBottomNav } from '@/components/store/StorefrontChrome';
import { useAuth } from '@/context/AuthContext';
import { insforge } from '@/lib/insforge';
import { formatCLP, normalizeOrderRecord, orderStatusColor, orderStatusLabel, shortRecordId } from '@/lib/commerce';
import { getStoredProfile, type UserProfile } from '@/components/UserProfileModal';
import { getInitials } from '@/lib/initials';

function StatusIcon({ status }: { status: string }) {
  if (status === 'entregado') return <CheckCircle className="h-4 w-4" style={{ color: orderStatusColor(status) }} />;
  if (status === 'cancelado') return <XCircle className="h-4 w-4" style={{ color: orderStatusColor(status) }} />;
  if (status === 'enviado') return <Truck className="h-4 w-4" style={{ color: orderStatusColor(status) }} />;
  return <Clock className="h-4 w-4" style={{ color: orderStatusColor(status) }} />;
}

function BigAvatar({ name, email }: { name?: string; email?: string }) {
  const initials = getInitials(name || email);
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.7rem] bg-[#b6906c] text-2xl font-black text-[#171820] shadow-[0_18px_48px_rgba(0,0,0,.24)] ring-4 ring-[#f8f0e9]/10">
      {initials || <User className="h-9 w-9" />}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent = '#b6906c' }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-[1.5rem] bg-[#fffaf5] p-4 shadow-[0_16px_48px_rgba(23,24,32,.07)] ring-1 ring-[#171820]/10">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${accent}24`, color: accent }}><Icon className="h-5 w-5" /></span>
        <div><p className="text-2xl font-black text-[#171820]">{value}</p><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#80746c]">{label}</p></div>
      </div>
    </div>
  );
}

function IconTikTok({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.52V6.78a4.85 4.85 0 01-1.02-.09z" /></svg>;
}

type NormOrder = ReturnType<typeof normalizeOrderRecord>;

export default function MiCuentaPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<NormOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.id) setProfile(getStoredProfile(user.id));
  }, [user]);

  const loadOrders = useCallback(async () => {
    if (!user?.email) { setOrdersLoading(false); return; }
    setOrdersLoading(true);
    try {
      const { data } = await insforge.database
        .from('orders')
        .select('id, customer_name, customer_email, items, subtotal, total, currency, status, created_at, updated_at, payment_id, payment_status, shipping_address, region, customer_phone, tax, shipping_fee')
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false })
        .limit(50);
      if (Array.isArray(data)) setOrders((data as Record<string, unknown>[]).map(normalizeOrderRecord));
    } catch {
      setOrders([]);
    }
    setOrdersLoading(false);
  }, [user?.email]);

  useEffect(() => { if (user) void loadOrders(); }, [user, loadOrders]);

  async function handleSignOut() {
    await signOut();
    router.replace('/');
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#f8f0e9]"><span className="h-9 w-9 animate-spin rounded-full border-2 border-[#b6906c]/30 border-t-[#171820]" /></div>;
  }
  if (!user) return null;

  const displayName = profile ? `${profile.nombre} ${profile.apellido}`.trim() : (user.name || user.email || 'Usuario');
  const completed = orders.filter((order) => order.status === 'entregado').length;
  const pending = orders.filter((order) => order.status !== 'entregado' && order.status !== 'cancelado').length;
  const totalSpent = orders.filter((order) => order.status !== 'cancelado').reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f0e9] pb-[calc(7.5rem+env(safe-area-inset-bottom))] text-[#171820] md:pb-20">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pb-8 pt-28 sm:px-6">
        <section className="relative overflow-hidden rounded-[2.25rem] bg-[#171820] p-6 text-[#f8f0e9] shadow-[0_30px_90px_rgba(23,24,32,.22)] sm:p-8">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(204,177,150,.24),transparent_25rem),linear-gradient(145deg,transparent,rgba(182,144,108,.08))]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center">
            <BigAvatar name={profile?.nombre || user.name} email={user.email} />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[.25em] text-[#ccb196]">Panel del cliente</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-.045em] sm:text-4xl">Hola, {profile?.nombre || user.name || 'cliente'}.</h1>
              <p className="mt-2 truncate text-sm text-[#c7bbb2]">{user.email}</p>
              {profile ? <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#a99d94]">{profile.whatsapp ? <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-[#ccb196]" />{profile.whatsapp}</span> : null}{profile.direccion ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#ccb196]" />{profile.direccion}</span> : null}</div> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/ajustes" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f8f0e9] px-4 text-[10px] font-black uppercase tracking-[.14em] text-[#171820] transition hover:bg-[#ccb196]"><Edit3 className="h-3.5 w-3.5" /> Editar perfil</Link>
              <button type="button" onClick={() => void handleSignOut()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/5 px-4 text-[10px] font-black uppercase tracking-[.14em] text-[#d8cbc1] ring-1 ring-white/10 transition hover:bg-red-400/10 hover:text-red-200"><LogOut className="h-3.5 w-3.5" /> Salir</button>
            </div>
          </div>
          {profile && (profile.instagram || profile.tiktok || profile.facebook) ? <div className="relative mt-6 flex flex-wrap gap-2 border-t border-white/8 pt-5">{profile.instagram ? <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-[10px] text-[#c7bbb2] ring-1 ring-white/8"><Instagram className="h-3.5 w-3.5" />{profile.instagram}</a> : null}{profile.tiktok ? <a href={`https://tiktok.com/${profile.tiktok.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-[10px] text-[#c7bbb2] ring-1 ring-white/8"><IconTikTok className="h-3.5 w-3.5" />{profile.tiktok}</a> : null}{profile.facebook ? <a href={`https://facebook.com/${profile.facebook.replace('@', '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-2 text-[10px] text-[#c7bbb2] ring-1 ring-white/8"><Facebook className="h-3.5 w-3.5" />{profile.facebook}</a> : null}</div> : null}
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={ShoppingBag} label="Pedidos" value={orders.length} />
          <StatCard icon={CheckCircle} label="Entregados" value={completed} accent="#4f8a68" />
          <StatCard icon={Package} label="En proceso" value={pending} accent="#9a6f4f" />
        </section>

        {totalSpent > 0 ? <section className="mt-5 flex flex-col gap-2 rounded-[1.6rem] bg-[#ccb196]/45 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#765438]">Inversión registrada</p><p className="mt-1 text-xs text-[#6b625c]">Suma de pedidos no cancelados.</p></div><p className="text-2xl font-black">{formatCLP(totalSpent)}</p></section> : null}

        <div className="mt-5"><PushOptIn /></div>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.23em] text-[#9a6f4f]">Historial</p><h2 className="mt-1 text-2xl font-black tracking-[-.035em]">Mis pedidos</h2></div><Link href="/tienda" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#765438]">Ver tienda <ShoppingBag className="h-3.5 w-3.5" /></Link></div>

          {ordersLoading ? (
            <div className="grid gap-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-[1.5rem] bg-[#fffaf5] ring-1 ring-[#171820]/8" />)}</div>
          ) : orders.length === 0 ? (
            <div className="rounded-[2rem] bg-[#fffaf5] p-9 text-center shadow-[0_18px_60px_rgba(23,24,32,.07)] ring-1 ring-[#171820]/10"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#171820] text-[#ccb196]"><ShoppingBag className="h-6 w-6" /></span><h3 className="mt-4 text-xl font-black">Aún no tienes pedidos</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6b625c]">Cuando compres un producto, podrás revisar aquí su estado y la información asociada.</p><Link href="/tienda" className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[#b6906c] px-6 text-xs font-black uppercase tracking-[.14em] text-[#171820] transition hover:bg-[#ccb196]">Explorar tienda</Link></div>
          ) : (
            <div className="grid gap-3">
              {orders.map((order) => (
                <article key={order.id} className="rounded-[1.6rem] bg-[#fffaf5] p-5 shadow-[0_16px_50px_rgba(23,24,32,.06)] ring-1 ring-[#171820]/10">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.15em] text-[#9a6f4f]">Pedido #{shortRecordId(order.id)}</p><p className="mt-2 font-black">{displayName}</p>{order.items.length ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#716861]">{order.items.map((item) => `${item.name} ×${item.quantity}`).join(' · ')}</p> : null}</div><div className="shrink-0 text-right"><p className="text-lg font-black">{formatCLP(order.total)}</p><div className="mt-1 flex items-center justify-end gap-1.5"><StatusIcon status={order.status} /><span className="text-xs font-bold" style={{ color: orderStatusColor(order.status) }}>{orderStatusLabel(order.status)}</span></div><p className="mt-1 text-[10px] text-[#958980]">{new Date(order.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div></div>
                  <div className="mt-4 grid gap-2 border-t border-[#171820]/8 pt-4 sm:grid-cols-2"><div className="rounded-xl bg-[#f4ebe3] p-3 text-xs leading-5 text-[#625a54]"><RotateCcw className="mb-2 h-4 w-4 text-[#9a6f4f]" /><b className="text-[#171820]">Reembolso estimado</b><br />Monto pagado menos despacho usado y costos no recuperables informados.</div><div className="rounded-xl bg-[#edf4ee] p-3 text-xs leading-5 text-[#625a54]"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-700" /><b className="text-[#171820]">Garantía</b><br />Cobertura de fabricante y fallas de origen según condiciones del producto.</div></div>
                  <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-[.11em]"><Link href="/legal/cambios-y-devoluciones" className="text-[#765438]">Reembolsos →</Link><Link href="/legal/terminos-y-condiciones" className="text-[#6b625c]">Garantía y condiciones →</Link></div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 flex items-center gap-3 rounded-[1.5rem] bg-[#171820] p-4 text-[#f8f0e9]"><BadgeCheck className="h-5 w-5 text-[#ccb196]" /><div><p className="text-xs font-black">Cuenta protegida</p><p className="mt-1 text-[10px] text-[#a99d94]">Tus datos se utilizan para pedidos, seguimiento y soporte.</p></div></section>
      </main>
      <StoreBottomNav />
    </div>
  );
}
