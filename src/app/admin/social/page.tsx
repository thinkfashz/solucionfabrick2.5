'use client';

import Link from 'next/link';
import { ArrowRight, Facebook, Inbox, Instagram, MessageCircle, MessageSquare, Store, Wifi } from 'lucide-react';
import { AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

const CHANNELS = [
  {
    href: '/admin/social/inbox',
    icon: Inbox,
    label: 'Inbox unificado',
    description: 'Todos los mensajes de Instagram, Facebook, WhatsApp y MercadoLibre en una sola vista cuando sus APIs estén conectadas.',
    tone: 'emerald' as const,
    badge: 'principal',
  },
  {
    href: '/admin/integraciones',
    icon: Instagram,
    label: 'Instagram',
    description: 'Conecta Instagram Business desde el Centro de Integraciones.',
    tone: 'rose' as const,
  },
  {
    href: '/admin/integraciones',
    icon: Facebook,
    label: 'Facebook Messenger',
    description: 'Mensajes directos desde tu página de Facebook Business.',
    tone: 'blue' as const,
  },
  {
    href: '/admin/integraciones',
    icon: MessageSquare,
    label: 'WhatsApp Business',
    description: 'Integración por API oficial de Meta con número verificado.',
    tone: 'emerald' as const,
  },
  {
    href: '/admin/ml/preguntas',
    icon: Store,
    label: 'MercadoLibre Q&A',
    description: 'Preguntas de compradores en publicaciones de MercadoLibre Chile.',
    tone: 'gold' as const,
  },
  {
    href: '/admin/integraciones',
    icon: MessageCircle,
    label: 'TikTok',
    description: 'Comentarios y mensajes directos cuando TikTok Business esté conectado.',
    tone: 'purple' as const,
  },
];

export default function AdminSocialPage() {
  return (
    <AdminBasePage
      eyebrow="Marketing & IA"
      title="Social · Inbox"
      description="Centro unificado de canales sociales. No muestra métricas inventadas: los contadores se activan cuando el inbox y las integraciones devuelvan datos reales."
      actions={
        <>
          <Link href="/admin/social/inbox" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-black hover:bg-yellow-200">
            Abrir inbox <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/admin/integraciones" className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-200 hover:border-yellow-300/40 hover:text-yellow-200">
            Integraciones
          </Link>
        </>
      }
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Sin responder" value="—" hint="pendiente inbox real" />
        <AdminBaseMetric label="Respondidos hoy" value="—" hint="pendiente tracking" />
        <AdminBaseMetric label="Canales activos" value="—" hint="depende integraciones" />
        <AdminBaseMetric label="Tiempo promedio" value="—" hint="sin datos reales aún" />
      </AdminBaseGrid>

      <Link
        href="/admin/social/inbox"
        className="group flex items-center justify-between gap-4 rounded-[2rem] border border-emerald-400/25 bg-emerald-400/10 p-5 transition hover:bg-emerald-400/15"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/20 text-emerald-200">
            <Inbox className="h-5 w-5" />
          </div>
          <div>
            <div className="font-black text-white">Abrir Inbox unificado</div>
            <div className="text-xs text-zinc-400">Vista central para mensajes reales cuando los canales estén conectados.</div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-emerald-300 transition-transform group-hover:translate-x-1" />
      </Link>

      <div className="rounded-[2rem] border border-white/10 bg-black/30 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Wifi className="h-5 w-5 text-yellow-300" />
          <h2 className="text-lg font-black text-white">Canales conectables</h2>
        </div>
        <AdminBaseGrid cols="3">
          {CHANNELS.map((channel) => (
            <AdminBaseCard
              key={channel.label}
              href={channel.href}
              icon={channel.icon}
              title={channel.label}
              description={channel.description}
              tone={channel.tone}
              badge={channel.badge}
            />
          ))}
        </AdminBaseGrid>
      </div>

      <p className="text-center text-xs text-zinc-600">
        Las métricas se mantienen vacías hasta tener datos reales del inbox. Para conectar canales usa{' '}
        <Link href="/admin/integraciones" className="text-zinc-400 underline hover:text-yellow-200">/admin/integraciones</Link>.
      </p>
    </AdminBasePage>
  );
}
