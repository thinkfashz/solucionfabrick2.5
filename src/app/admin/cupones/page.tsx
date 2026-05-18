'use client';

import { Clock, Percent, ShieldAlert, Tag, Users } from 'lucide-react';
import { AdminBaseCard, AdminBaseGrid, AdminBaseMetric, AdminBasePage } from '@/components/admin/baseui-kit';

export default function CuponesPage() {
  return (
    <AdminBasePage
      eyebrow="Operación"
      title="Cupones y descuentos"
      description="Módulo preparado visualmente, sin datos demo ni CRUD simulado. Falta crear tabla/API real antes de activar descuentos en producción."
    >
      <AdminBaseGrid cols="4">
        <AdminBaseMetric label="Estado" value="Pendiente" hint="sin tabla real" />
        <AdminBaseMetric label="Datos demo" value="0" hint="no se muestran seeds" />
        <AdminBaseMetric label="CRUD" value="No activo" hint="requiere API" />
        <AdminBaseMetric label="Producción" value="Bloqueado" hint="hasta validar reglas" />
      </AdminBaseGrid>

      <div className="rounded-[2rem] border border-yellow-300/20 bg-yellow-300/[0.05] p-6 text-center shadow-[0_20px_90px_rgba(0,0,0,0.35)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-yellow-300/30 bg-yellow-300/10">
          <Tag className="h-8 w-8 text-yellow-300" />
        </div>
        <h2 className="text-xl font-black text-white">Módulo pendiente de implementación real</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Para activar cupones en serio hace falta definir tabla, reglas de validación, límites de uso, expiración, auditoría y aplicación segura en checkout/backend.
        </p>
      </div>

      <AdminBaseGrid cols="4">
        <AdminBaseCard title="Descuento %" description="Regla porcentual aplicada desde backend, no desde frontend." icon={Percent} tone="gold" badge="futuro" />
        <AdminBaseCard title="Monto fijo" description="Descuento CLP con límites por pedido y usuario." icon={Tag} tone="emerald" badge="futuro" />
        <AdminBaseCard title="Expiración" description="Fechas y vencimiento con validación server-side." icon={Clock} tone="blue" badge="futuro" />
        <AdminBaseCard title="Uso por cliente" description="Auditoría para evitar abuso o reutilización no permitida." icon={Users} tone="purple" badge="futuro" />
      </AdminBaseGrid>

      <AdminBaseCard
        title="Pendiente técnico"
        description="No se debe activar UI de creación hasta tener endpoint real, tabla real, validaciones y pruebas de checkout."
        icon={ShieldAlert}
        tone="rose"
        badge="seguridad"
      />
    </AdminBasePage>
  );
}
