'use client';

import { Star, ThumbsUp, MessageSquare, TrendingUp } from 'lucide-react';

export default function ReviewsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-playfair text-4xl font-black text-white tracking-wide">Reseñas de Clientes</h1>
        <p className="text-zinc-500 text-sm">Gestiona las opiniones y valoraciones de tus clientes.</p>
      </div>

      {/* Coming soon notice */}
      <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.06] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-yellow-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Módulo en desarrollo</h2>
        <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">
          El sistema de reseñas estará disponible próximamente. Podrás ver, responder, aprobar y destacar las opiniones de tus clientes para generar más confianza.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
          {[
            { icon: Star, label: 'Valoraciones', desc: 'Sistema de 1 a 5 estrellas' },
            { icon: MessageSquare, label: 'Respuestas', desc: 'Contesta a los clientes' },
            { icon: ThumbsUp, label: 'Moderación', desc: 'Aprueba o rechaza' },
            { icon: TrendingUp, label: 'Análisis', desc: 'Tendencias y NPS' },
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
