'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Clock, CheckCircle, Truck, XCircle, User, MapPin, MessageCircle, Instagram, Facebook, Edit3, LogOut, ShoppingBag } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { insforge } from '@/lib/insforge';
import { formatCLP, normalizeOrderRecord, orderStatusColor, orderStatusLabel, shortRecordId } from '@/lib/commerce';
import { getStoredProfile, type UserProfile } from '@/components/UserProfileModal';
import { getInitials } from '@/lib/initials';
import PushOptIn from '@/components/PushOptIn';

/* ── Status icon helper ── */
function StatusIcon({ status }: { status: string }) {
  if (status === 'entregado') return <CheckCircle className="h-4 w-4" style={{ color: orderStatusColor(status) }} />;
  if (status === 'cancelado') return <XCircle className="h-4 w-4" style={{ color: orderStatusColor(status) }} />;
  if (status === 'enviado') return <Truck className="h-4 w-4" style={{ color: orderStatusColor(status) }} />;
  return <Clock className="h-4 w-4" style={{ color: orderStatusColor(status) }} />;
}

/* ── User initials avatar ── */
function BigAvatar({ name, email }: { name?: string; email?: string }) {
  const initials = getInitials(name || email);
  return (
    <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-yellow-400 text-2xl font-black text-black shadow-[0_0_30px_rgba(250,204,21,0.35)] ring-4 ring-yellow-400/20">
      {initials || <User className="h-9 w-9" />}
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, color = '#c9a96e' }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-zinc-950/60 p-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${color}18` }}>
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      </div>
    </div>
  );
}

/* ── TikTok icon ── */
function IconTikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.52V6.78a4.85 4.85 0 01-1.02-.09z"/>
    </svg>
  );
}

type NormOrder = ReturnType<typeof normalizeOrderRecord>;

export default function MiCuentaPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [orders, setOrders] = useState<NormOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.id) {
      setProfile(getStoredProfile(user.id));
    }
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
      if (Array.isArray(data)) {
        setOrders((data as Record<string, unknown>[]).map(normalizeOrderRecord));
      }
    } catch {
      setOrders([]);
    }
    setOrdersLoading(false);
  }, [user?.email]);

  useEffect(() => {
    if (user) void loadOrders();
  }, [user, loadOrders]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile ? `${profile.nombre} ${profile.apellido}` : (user.name || user.email || 'Usuario');
  const completed = orders.filter((o) => o.status === 'entregado').length;
  const pending = orders.filter((o) => o.status !== 'entregado' && o.status !== 'cancelado').length;
  const totalSpent = orders.filter((o) => o.status !== 'cancelado').reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 pt-28 pb-20">

        {/* ── Header / profile hero ── */}
        <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(201,169,110,0.12),transparent_50%),linear-gradient(180deg,#0e0e10,#0a0a0b)] p-7">
          <div className="absolute top-0 right-0 h-32 w-64 bg-yellow-400/4 blur-[60px]" />
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <BigAvatar name={user.name || profile?.nombre} email={user.email} />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-yellow-400/70 mb-1">Panel de cliente</p>
              <h1 className="font-playfair text-2xl sm:text-3xl font-bold text-white truncate">
                Hola, {profile?.nombre || user.name || 'Cliente'} 👋
              </h1>
              <p className="mt-1 text-sm text-zinc-400 truncate">{user.email}</p>
              {profile && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  {profile.whatsapp && (
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-green-400/70" />{profile.whatsapp}
                    </span>
                  )}
                  {profile.direccion && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-yellow-400/70" />{profile.direccion}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Link
                href="/ajustes"
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400 hover:border-white/25 hover:text-white transition-all"
              >
                <Edit3 className="h-3 w-3" /> Editar
              </Link>
              <button
                onClick={() => void handleSignOut()}
                className="flex items-center gap-1.5 rounded-full border border-red-500/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-red-400/80 hover:bg-red-500/8 hover:border-red-500/40 transition-all"
              >
                <LogOut className="h-3 w-3" /> Salir
              </button>
            </div>
          </div>

          {/* Social links */}
          {profile && (profile.instagram || profile.tiktok || profile.facebook) && (
            <div className="mt-5 flex items-center gap-3">
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-pink-400 transition-colors">
                  <Instagram className="h-3.5 w-3.5" />{profile.instagram}
                </a>
              )}
              {profile.tiktok && (
                <a href={`https://tiktok.com/${profile.tiktok.replace('@', '')}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-cyan-400 transition-colors">
                  <IconTikTok className="h-3.5 w-3.5" />{profile.tiktok}
                </a>
              )}
              {profile.facebook && (
                <a href={`https://facebook.com/${profile.facebook.replace('@', '')}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-blue-400 transition-colors">
                  <Facebook className="h-3.5 w-3.5" />{profile.facebook}
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Stats row ── */}
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={ShoppingBag} label="Pedidos" value={orders.length} />
          <StatCard icon={CheckCircle} label="Entregados" value={completed} color="#22c55e" />
          <StatCard icon={Package} label="En proceso" value={pending} color="#f59e0b" />
        </div>
        {totalSpent > 0 && (
          <div className="mb-8 rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4 flex items-center justify-between">
            <p className="text-xs text-zinc-400 uppercase tracking-widest">Total invertido</p>
            <p className="text-xl font-black text-yellow-400">{formatCLP(totalSpent)}</p>
          </div>
        )}

        {/* ── Push notifications opt-in ── */}
        <div className="mb-8">
          <PushOptIn />
        </div>

        {/* ── Orders ── */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-yellow-400/70">Historial</p>
              <h2 className="text-lg font-bold text-white">Mis pedidos</h2>
            </div>
            <Link href="/tienda" className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-yellow-400 transition-colors">
              Ver tienda →
            </Link>
          </div>

          {ordersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/3 skeleton-wave" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-[2rem] border border-white/6 bg-zinc-950/50 p-10 text-center">
              <ShoppingBag className="mx-auto h-10 w-10 text-zinc-700 mb-4" />
              <p className="text-zinc-400 text-sm">Aún no tienes pedidos registrados</p>
              <Link href="/tienda" className="mt-5 inline-block rounded-full bg-yellow-400 px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black hover:bg-yellow-300 transition-all">
                Explorar tienda
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="group rounded-[1.5rem] border border-white/6 bg-zinc-950/60 p-5 transition hover:border-white/12">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs font-mono text-zinc-500">#{shortRecordId(order.id)}</p>
                      <p className="mt-1 text-sm font-semibold text-white">{displayName}</p>
                      {order.items.length > 0 && (
                        <p className="mt-1 text-xs text-zinc-500 line-clamp-1">
                          {order.items.map((i) => `${i.name} ×${i.quantity}`).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-white">{formatCLP(order.total)}</p>
                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <StatusIcon status={order.status} />
                        <span className="text-xs font-medium" style={{ color: orderStatusColor(order.status) }}>
                          {orderStatusLabel(order.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {new Date(order.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

