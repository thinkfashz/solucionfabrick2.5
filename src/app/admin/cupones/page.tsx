'use client';

import { Tag, Plus, Percent, Clock, Users, Copy, Trash2 } from 'lucide-react';

export default function CuponesPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-playfair text-4xl font-black text-white tracking-wide">Cupones y Descuentos</h1>
        <p className="text-zinc-500 text-sm">Crea y gestiona códigos de descuento para tus clientes.</p>
      </div>

      {/* Coming soon notice */}
      <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.06] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-4">
          <Tag className="w-8 h-8 text-yellow-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Módulo en desarrollo</h2>
        <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
          El sistema de cupones y descuentos estará disponible próximamente. Podrás crear códigos de descuento por porcentaje o monto fijo, con límites de uso y fechas de expiración.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {[
            { icon: Percent, label: 'Descuento %', desc: 'Por porcentaje del total' },
            { icon: Tag, label: 'Monto fijo', desc: 'Descuento en pesos' },
            { icon: Clock, label: 'Con expiración', desc: 'Válidos por tiempo limitado' },
            { icon: Users, label: 'Por cliente', desc: 'Uso único por persona' },
          ].map((f) => (
            <div key={f.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-center">
              <f.icon className="w-5 h-5 text-zinc-500 mx-auto mb-1.5" />
              <p className="text-white text-xs font-semibold">{f.label}</p>
              <p className="text-zinc-600 text-[10px] mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
