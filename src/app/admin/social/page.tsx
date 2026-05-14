'use client';

import Link from 'next/link';
import { Inbox, Instagram, Facebook, MessageCircle, Store, MessageSquare, ArrowRight, Wifi } from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

const CHANNELS = [
  {
    href: '/admin/social/inbox',
    icon: Inbox,
    label: 'Inbox unificado',
    description: 'Todos los mensajes de Instagram, Facebook, WhatsApp y ML en una sola vista.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    badge: 'Principal',
  },
  {
    href: '/admin/integraciones',
    icon: Instagram,
    label: 'Instagram',
    description: 'Conecta tu cuenta de Instagram Business para recibir DMs y comentarios.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10 border-pink-500/20',
  },
  {
    href: '/admin/integraciones',
    icon: Facebook,
    label: 'Facebook Messenger',
    description: 'Mensajes directos desde tu página de Facebook Business.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    href: '/admin/integraciones',
    icon: MessageSquare,
    label: 'WhatsApp Business',
    description: 'Integración vía API oficial de Meta. Requiere número de teléfono verificado.',
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
  },
  {
    href: '/admin/ml/preguntas',
    icon: Store,
    label: 'MercadoLibre Q&A',
    description: 'Preguntas de compradores en tus publicaciones de ML Chile.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
  },
  {
    href: '/admin/integraciones',
    icon: MessageCircle,
    label: 'TikTok',
    description: 'Comentarios y mensajes directos desde TikTok Business.',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
  },
];

const STATS = [
  { label: 'Sin responder', value: '—', color: 'text-orange-400' },
  { label: 'Respondidos hoy', value: '—', color: 'text-emerald-400' },
  { label: 'Canales activos', value: '—', color: 'text-blue-400' },
  { label: 'Tiempo promedio', value: '—', color: 'text-zinc-300' },
];

export default function AdminSocialPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        title="Social · Inbox"
        description="Centro unificado de mensajes de todas las redes sociales conectadas."
        icon={Wifi}
      />

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
            <div className={`text-2xl font-black ${s.color} mb-1`}>{s.value}</div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA principal */}
      <Link
        href="/admin/social/inbox"
        className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 mb-6 hover:bg-emerald-500/15 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Inbox size={18} className="text-emerald-400" />
          </div>
          <div>
            <div className="font-bold text-white">Abrir Inbox unificado</div>
            <div className="text-xs text-zinc-400">Ver todos los mensajes pendientes</div>
          </div>
        </div>
        <ArrowRight size={16} className="text-emerald-400 group-hover:translate-x-1 transition-transform" />
      </Link>

      {/* Canales */}
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500 mb-3">Canales</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {CHANNELS.map((ch) => (
          <Link
            key={ch.label}
            href={ch.href}
            className={`rounded-xl border ${ch.bg} p-4 flex items-start gap-3 hover:brightness-110 transition-all`}
          >
            <ch.icon size={18} className={`${ch.color} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-sm text-white">{ch.label}</span>
                {ch.badge && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-emerald-500 text-black px-2 py-0.5 rounded-full">
                    {ch.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{ch.description}</p>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-6 text-xs text-zinc-600 text-center">
        Para conectar canales ve a{' '}
        <Link href="/admin/integraciones" className="text-zinc-400 hover:underline">
          Centro de integraciones
        </Link>
      </p>
    </AdminPage>
  );
}
