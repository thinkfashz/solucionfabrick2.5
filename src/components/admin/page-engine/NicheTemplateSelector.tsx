'use client';

import { NICHE_TEMPLATE_KEYS, buildNicheTemplate } from './premiumNicheTemplates';

type Props = {
  onApply: (jsonText: string) => void;
};

const labels: Record<string, string> = {
  barberia: 'Barbería',
  estetica: 'Estética / Beauty',
  construccion: 'Construcción',
  restaurante: 'Restaurante',
  hotel: 'Hotel / Hostal',
  transporte: 'Transporte',
  ecommerce: 'Ecommerce',
  serviciotecnico: 'Servicio técnico',
  inmobiliaria: 'Inmobiliaria',
};

const hints: Record<string, string> = {
  barberia: 'Reservas, servicios y paquetes de corte.',
  estetica: 'Beauty booking, servicios y confianza visual.',
  construccion: 'Cotización, garantía y proceso por etapas.',
  restaurante: 'Menú digital, reservas y promociones.',
  hotel: 'Habitaciones, disponibilidad y reserva directa.',
  transporte: 'Rutas, tarifas y cotización rápida.',
  ecommerce: 'Catálogo, productos y venta móvil.',
  serviciotecnico: 'Diagnóstico, reparación y garantía.',
  inmobiliaria: 'Ficha, galería y agendar visita.',
};

export default function NicheTemplateSelector({ onApply }: Props) {
  function apply(key: string) {
    const template = buildNicheTemplate(key, { niche: key });
    if (!template) return;
    onApply(JSON.stringify(template, null, 2));
  }

  return (
    <section className="rounded-[1.5rem] border border-yellow-300/15 bg-white/[0.045] p-4">
      <div className="mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Plantillas por nicho</p>
        <h3 className="mt-1 text-sm font-black text-white">Carga una página completa</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#9f8d74]">
          Selecciona un rubro y el motor genera hero, beneficios, paquetes, métricas, testimonios, garantía y CTA.
        </p>
      </div>

      <div className="grid gap-2">
        {NICHE_TEMPLATE_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => apply(key)}
            className="group rounded-2xl border border-white/10 bg-black/25 p-3 text-left transition hover:border-yellow-300/40 hover:bg-yellow-300/10"
          >
            <strong className="block text-sm text-white group-hover:text-yellow-100">{labels[key] || key}</strong>
            <span className="text-xs text-[#9f8d74]">{hints[key] || 'Plantilla comercial premium.'}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
