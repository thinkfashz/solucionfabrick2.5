'use client';

import * as React from 'react';
import { BadgeCheck, Brain, Copy, FileCode2, LayoutTemplate, Menu, Sparkles, UploadCloud, X } from 'lucide-react';
import LocalProspectImportPanel from '@/modules/prospecting-engine/ui/LocalProspectImportPanel';
import type { LocalDetectedProspect } from '@/modules/prospecting-engine/types/import.types';
import PageEngineProspectingStudioExactClient from './PageEngineProspectingStudioExactClient';

const STORAGE = 'sf_page_engine_prospects_v3';

type LegacyProspect = {
  id: string;
  brand: string;
  client: string;
  account: string;
  followers: string;
  instagram: string;
  facebook: string;
  whatsapp: string;
  website: string;
  location: string;
  notes: string;
  logo: string;
};

type TemplatePreset = {
  id: string;
  label: string;
  niche: string;
  promise: string;
  sections: string[];
  score: number;
};

const templates: TemplatePreset[] = [
  { id: 'dental', label: 'Clínica dental premium', niche: 'Dental', promise: 'Agenda, confianza médica, tratamientos y WhatsApp.', sections: ['Hero', 'Tratamientos', 'Antes/después', 'Agenda'], score: 94 },
  { id: 'hotel', label: 'Hotel / alojamiento', niche: 'Turismo', promise: 'Habitaciones, experiencia, ubicación y reservas.', sections: ['Hero', 'Habitaciones', 'Galería', 'Reservas'], score: 90 },
  { id: 'restaurant', label: 'Restaurante local', niche: 'Gastronomía', promise: 'Menú, platos destacados, reserva y delivery.', sections: ['Hero', 'Menú', 'Promos', 'Delivery'], score: 88 },
  { id: 'build', label: 'Construcción / servicios', niche: 'Construcción', promise: 'Confianza, proceso, trabajos y cotización.', sections: ['Servicios', 'Proyectos', 'Proceso', 'Cotizar'], score: 92 },
  { id: 'beauty', label: 'Belleza / estética', niche: 'Belleza', promise: 'Resultados visuales, paquetes y agenda.', sections: ['Servicios', 'Resultados', 'Paquetes', 'Agenda'], score: 89 },
  { id: 'store', label: 'Tienda local / catálogo', niche: 'Comercio', promise: 'Catálogo simple, categorías y compra por WhatsApp.', sections: ['Productos', 'Categorías', 'Beneficios', 'Contacto'], score: 86 },
];

function instagramAccount(value?: string | null) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (clean.startsWith('@')) return clean;
  const match = clean.match(/instagram\.com\/([^/?#]+)/i);
  return match?.[1] ? `@${match[1]}` : clean;
}

function toLegacyProspect(prospect: LocalDetectedProspect): LegacyProspect {
  return {
    id: prospect.id || prospect.local_id || Math.random().toString(36).slice(2, 9),
    brand: prospect.brand || 'Prospecto importado',
    client: prospect.client_name || '',
    account: instagramAccount(prospect.instagram),
    followers: prospect.followers || '',
    instagram: prospect.instagram || '',
    facebook: prospect.facebook || '',
    whatsapp: prospect.whatsapp || '',
    website: prospect.website || '',
    location: [prospect.city, prospect.region, prospect.country].filter(Boolean).join(', ') || 'Chile',
    notes: [
      prospect.industry ? `Rubro: ${prospect.industry}` : '',
      prospect.problem_detected ? `Problema: ${prospect.problem_detected}` : '',
      prospect.opportunity ? `Oportunidad: ${prospect.opportunity}` : '',
      prospect.probability_level ? `Probabilidad: ${prospect.probability_level}` : '',
      typeof prospect.score === 'number' ? `Score: ${prospect.score}` : '',
      prospect.notes || '',
    ].filter(Boolean).join('\n'),
    logo: typeof prospect.metadata?.logo === 'string' ? prospect.metadata.logo : '',
  };
}

function templateBrief(template: TemplatePreset) {
  return `Plantilla: ${template.label}\nNicho: ${template.niche}\nPromesa: ${template.promise}\nSecciones: ${template.sections.join(', ')}\nScore: ${template.score}`;
}

function templateToProspect(template: TemplatePreset): LegacyProspect {
  return {
    id: `template_${template.id}_${Date.now().toString(36).slice(-5)}`,
    brand: `Plantilla · ${template.label}`,
    client: '',
    account: '',
    followers: '',
    instagram: '',
    facebook: '',
    whatsapp: '',
    website: '',
    location: 'Chile',
    notes: `${templateBrief(template)}\nProblema: El prospecto necesita una demo rápida y profesional.\nOportunidad: Crear landing personalizada y compartir por WhatsApp.`,
    logo: '',
  };
}

function saveProspect(prospect: LegacyProspect) {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE) || '[]');
    const current = Array.isArray(parsed) ? parsed as LegacyProspect[] : [];
    localStorage.setItem(STORAGE, JSON.stringify([prospect, ...current.filter((item) => item.id !== prospect.id)].slice(0, 120)));
  } catch {
    localStorage.setItem(STORAGE, JSON.stringify([prospect]));
  }
}

export default function PageEngineProspectingStudioHybridClient() {
  const [studioKey, setStudioKey] = React.useState(0);
  const [message, setMessage] = React.useState('');
  const [showImporter, setShowImporter] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ right: 18, bottom: 120 });
  const dragRef = React.useRef<{ x: number; y: number; right: number; bottom: number } | null>(null);

  function applyProspect(prospect: LocalDetectedProspect) {
    const legacy = toLegacyProspect(prospect);
    saveProspect(legacy);
    setStudioKey((key) => key + 1);
    setShowImporter(false);
    setMessage(`${legacy.brand} fue cargado en el editor.`);
  }

  function applyPreset(template: TemplatePreset) {
    const prospect = templateToProspect(template);
    saveProspect(prospect);
    setStudioKey((key) => key + 1);
    setMessage(`${template.label} fue cargada como plantilla base.`);
  }

  async function copyPreset(template: TemplatePreset) {
    await navigator.clipboard.writeText(templateBrief(template));
    setMessage(`Brief de ${template.label} copiado.`);
  }

  function startDrag(event: React.PointerEvent<HTMLButtonElement>) {
    dragRef.current = { x: event.clientX, y: event.clientY, right: menuPos.right, bottom: menuPos.bottom };
    const move = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      setMenuPos({
        right: Math.max(8, Math.min(window.innerWidth - 72, drag.right - (moveEvent.clientX - drag.x))),
        bottom: Math.max(86, Math.min(window.innerHeight - 90, drag.bottom - (moveEvent.clientY - drag.y))),
      });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  }

  return <main className="min-h-screen overflow-x-hidden bg-[#050403] pb-24 text-white">
    <section className="mx-auto w-full max-w-[1540px] space-y-4 px-3 py-3 sm:px-5 lg:px-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#090806] p-5 shadow-[0_35px_120px_rgba(0,0,0,.55)] sm:p-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(253,224,71,.20),transparent_34%),radial-gradient(circle_at_95%_10%,rgba(255,255,255,.10),transparent_30%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <span className="inline-flex items-center rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200"><Sparkles className="mr-2 h-3.5 w-3.5" />Motor híbrido</span>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.2rem,7vw,5.4rem)] font-black leading-[0.92] tracking-[-0.08em]">Prospección premium sin desorden.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">Importador híbrido, plantillas por nicho, editor HTML exacto y publicación real.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setShowImporter((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-black"><UploadCloud className="h-4 w-4" />{showImporter ? 'Ocultar importador' : 'Importar prospecto'}</button>
              <button onClick={() => setShowTemplates((value) => !value)} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black"><LayoutTemplate className="h-4 w-4" />{showTemplates ? 'Ocultar plantillas' : 'Ver plantillas'}</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <Stat label="BD" value="Activa" />
            <Stat label="Plantillas" value="6 nichos" />
            <Stat label="HTML" value="Exacto" />
          </div>
        </div>
      </section>

      {message && <div className="rounded-[1.4rem] border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100"><BadgeCheck className="mr-2 inline h-4 w-4" />{message}</div>}

      {showImporter && <LocalProspectImportPanel onUseProspect={applyProspect} onSaved={() => setMessage('Prospectos guardados. Puedes cargarlos al editor.')} />}

      {showTemplates && <section className="rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-[0_24px_80px_rgba(0,0,0,.35)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Plantillas rápidas</p><h2 className="text-2xl font-black">Nicho + estructura</h2></div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {templates.map((template) => <article key={template.id} className="rounded-[1.4rem] border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-lg font-black">{template.label}</h3><p className="text-sm text-yellow-100/70">{template.niche}</p></div><span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">{template.score}%</span></div>
            <p className="mt-3 text-sm leading-6 text-white/62">{template.promise}</p>
            <div className="mt-3 flex flex-wrap gap-2">{template.sections.map((section) => <span key={section} className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/55">{section}</span>)}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={() => applyPreset(template)} className="rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-black">Usar</button><button onClick={() => void copyPreset(template)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/70"><Copy className="mr-2 inline h-4 w-4" />Copiar</button></div>
          </article>)}
        </div>
      </section>}

      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,.35)]">
        <PageEngineProspectingStudioExactClient key={studioKey} />
      </section>
    </section>

    <div className="fixed z-[80]" style={{ right: menuPos.right, bottom: menuPos.bottom }}>
      {menuOpen && <div className="mb-3 w-[min(92vw,310px)] rounded-[1.5rem] border border-yellow-300/20 bg-[#090806]/95 p-3 shadow-[0_28px_110px_rgba(0,0,0,.72)] backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-between"><b>Menú rápido</b><button onClick={() => setMenuOpen(false)} className="rounded-xl border border-white/10 p-2"><X className="h-4 w-4" /></button></div>
        <div className="grid gap-2">
          <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-black" onClick={() => setShowImporter((value) => !value)}>{showImporter ? 'Ocultar importador' : 'Mostrar importador'}</button>
          <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-black" onClick={() => setShowTemplates((value) => !value)}>{showTemplates ? 'Ocultar plantillas' : 'Mostrar plantillas'}</button>
          <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-black" onClick={() => applyPreset(templates[0])}>Cargar plantilla dental</button>
          <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-black" onClick={() => setMenuPos({ right: 18, bottom: 120 })}>Reiniciar posición</button>
        </div>
      </div>}
      <button onPointerDown={startDrag} onClick={() => setMenuOpen((value) => !value)} className="grid h-16 w-16 touch-none place-items-center rounded-full border-4 border-white bg-black text-yellow-300 shadow-[0_20px_70px_rgba(0,0,0,.65)]" title="Menú movible">
        {menuOpen ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
      </button>
    </div>
  </main>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[1.35rem] border border-white/10 bg-black/30 p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{label}</p><p className="mt-1 text-xl font-black">{value}</p></div>;
}
