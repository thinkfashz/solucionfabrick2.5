import Link from 'next/link';
import { ArrowRight, Facebook, Inbox, Instagram, MessageCircle, MessageSquare, Store, Wifi } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

const CHANNELS = [
  { href: '/admin/social/inbox', icon: Inbox, label: 'Inbox unificado', description: 'Mensajes de canales conectados en una sola bandeja.', accent: 'emerald' as const },
  { href: '/admin/integraciones', icon: Instagram, label: 'Instagram', description: 'Instagram Business mediante Meta.', accent: 'rose' as const },
  { href: '/admin/integraciones', icon: Facebook, label: 'Facebook Messenger', description: 'Mensajes de páginas de Facebook Business.', accent: 'cyan' as const },
  { href: '/admin/integraciones', icon: MessageSquare, label: 'WhatsApp Business', description: 'Cloud API con número verificado.', accent: 'emerald' as const },
  { href: '/admin/ml/preguntas', icon: Store, label: 'MercadoLibre Q&A', description: 'Preguntas reales de compradores.', accent: 'yellow' as const },
  { href: '/admin/integraciones', icon: MessageCircle, label: 'TikTok', description: 'Canal disponible cuando Business API esté conectada.', accent: 'rose' as const },
];

const actionClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3.5 text-xs font-black text-[#5f594f] transition hover:bg-white';

const accentClasses = {
  yellow: 'bg-[#ffb000]/10 text-[#a56600]',
  cyan: 'bg-cyan-500/10 text-cyan-700',
  emerald: 'bg-emerald-500/10 text-emerald-700',
  rose: 'bg-rose-500/10 text-rose-700',
};

export default function AdminSocialPage() {
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Marketing · Canales"
        title="Social Hub"
        description="Punto de acceso a mensajería y canales sociales. Las métricas permanecen vacías hasta que existan eventos reales; no se generan contadores demo."
        icon={Wifi}
        actions={
          <>
            <Link href="/admin/social/inbox" className={actionClass}>Abrir inbox <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/admin/integraciones" className={actionClass}>Integraciones</Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Sin responder" value="—" icon={Inbox} hint="Se activa con datos reales" />
        <AdminStat label="Respondidos hoy" value="—" icon={MessageSquare} accent="emerald" hint="Sin tracking simulado" />
        <AdminStat label="Canales activos" value="—" icon={Wifi} accent="cyan" hint="Depende de integraciones" />
        <AdminStat label="Tiempo promedio" value="—" icon={MessageCircle} accent="yellow" hint="Sin datos suficientes" />
      </section>

      <AdminCard className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Bandeja central</p>
            <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#171612]">Inbox unificado</h2>
            <p className="mt-1 text-xs leading-5 text-[#817a6f]">Consulta conversaciones reales cuando los proveedores estén conectados.</p>
          </div>
          <Link href="/admin/social/inbox" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white transition hover:bg-[#2b2924]">
            <Inbox className="h-4 w-4" /> Abrir bandeja
          </Link>
        </div>
      </AdminCard>

      <div>
        <div className="mb-3 border-b border-black/10 pb-3">
          <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#9b6a12]">Canales</p>
          <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#171612]">Conexiones disponibles</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <Link key={channel.label} href={channel.href} className="group flex min-h-32 items-start gap-3 rounded-[18px] border border-black/10 bg-white/60 p-4 transition hover:-translate-y-0.5 hover:bg-white sm:p-5">
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${accentClasses[channel.accent]}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm text-[#171612]">{channel.label}</strong>
                  <small className="mt-1 block text-xs leading-5 text-[#817a6f]">{channel.description}</small>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#aaa294] transition group-hover:translate-x-0.5 group-hover:text-[#8e5c00]" />
              </Link>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs leading-5 text-[#9a9388]">Las métricas se mantienen vacías hasta contar con datos reales de mensajería. Las credenciales se administran únicamente desde Integraciones.</p>
    </AdminPage>
  );
}
