'use client';

import { MessageSquare, ShieldAlert, Star, ThumbsUp, TrendingUp } from 'lucide-react';
import { AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

export default function ReviewsPage() {
  return (
    <AdminBasePage
      eyebrow="Operación"
      title="Reseñas de clientes"
      description="Módulo preparado visualmente, sin reseñas demo. Falta conectar tabla/API real para aprobar, responder y destacar opiniones."
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Estado" value="Pendiente" hint="sin tabla real" />
        <AdminBaseMetric label="Reseñas demo" value="0" hint="no se muestran seeds" />
        <AdminBaseMetric label="Moderación" value="No activa" hint="requiere API" />
        <AdminBaseMetric label="Producción" value="Bloqueado" hint="hasta validar flujo" />
      </AdminBaseGrid>

      <div className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[0.05] p-6 text-center shadow-[0_20px_90px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-300/30 bg-yellow-300/10">
          <Star className="h-8 w-8 text-yellow-300" />
        </div>
        <h2 className="text-xl font-black text-white">Módulo pendiente de implementación real</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Para activar reseñas hace falta crear tabla real, endpoints de moderación, protección anti-spam, auditoría y reglas para publicar en páginas públicas.
        </p>
      </div>

      <AdminBaseGrid cols="4">
        <AdminBaseCard title="Valoraciones" description="Sistema real de 1 a 5 estrellas con validación backend." icon={Star} tone="gold" badge="futuro" />
        <AdminBaseCard title="Respuestas" description="Responder a clientes desde admin con auditoría." icon={MessageSquare} tone="emerald" badge="futuro" />
        <AdminBaseCard title="Moderación" description="Aprobar, rechazar o destacar reseñas reales." icon={ThumbsUp} tone="blue" badge="futuro" />
        <AdminBaseCard title="Análisis" description="Tendencias, reputación y NPS cuando haya datos reales." icon={TrendingUp} tone="purple" badge="futuro" />
      </AdminBaseGrid>

      <AdminBaseCard
        title="Pendiente técnico"
        description="No se debe mostrar reseñas inventadas en admin. Primero se necesita modelo de datos, endpoints y permisos."
        icon={ShieldAlert}
        tone="rose"
        badge="seguridad"
      />
    </AdminBasePage>
  );
}
