'use client';

import { useMemo, useState } from 'react';
import { BadgeCheck, Brain, ChevronDown, Copy, DatabaseZap, FileCode2, LayoutTemplate, Search, Sparkles, UploadCloud, Wand2 } from 'lucide-react';
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
  visual: string;
  sections: string[];
  cta: string;
  score: number;
};

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'dental-premium',
    label: 'Clínica dental premium',
    niche: 'Dental / salud estética',
    promise: 'Agenda online, confianza clínica, tratamientos destacados y WhatsApp directo.',
    visual: 'Blanco, dorado suave, azul clínico, fotos limpias, cards con antes/después.',
    sections: ['Hero con agenda', 'Tratamientos', 'Antes/después', 'Confianza médica', 'WhatsApp', 'Ubicación'],
    cta: 'Reservar evaluación',
    score: 94,
  },
  {
    id: 'hotel-reservas',
    label: 'Hotel / alojamiento',
    niche: 'Turismo / hotelería',
    promise: 'Transformar visitas en reservas mostrando experiencia, habitaciones y ubicación.',
    visual: 'Crema, negro premium, fotografías grandes, sensación cálida y elegante.',
    sections: ['Hero reserva', 'Habitaciones', 'Experiencias', 'Galería', 'Mapa', 'Reserva WhatsApp'],
    cta: 'Consultar disponibilidad',
    score: 90,
  },
  {
    id: 'restaurante-local',
    label: 'Restaurante local',
    niche: 'Gastronomía',
    promise: 'Mostrar platos, menú, promociones y botón de reserva o delivery.',
    visual: 'Negro, crema, fotos apetitosas, botones grandes y menú en cards.',
    sections: ['Hero de plato estrella', 'Menú destacado', 'Promos', 'Ambiente', 'Delivery', 'Reservas'],
    cta: 'Reservar mesa',
    score: 88,
  },
  {
    id: 'constructora-obras',
    label: 'Construcción / servicios',
    niche: 'Construcción / oficios',
    promise: 'Convertir confianza técnica en solicitudes de cotización y visitas a terreno.',
    visual: 'Negro, dorado, naranja lava, métricas de obra, proceso paso a paso.',
    sections: ['Problema-solución', 'Servicios', 'Trabajos', 'Proceso', 'Garantía', 'Cotización'],
    cta: 'Solicitar cotización',
    score: 92,
  },
  {
    id: 'belleza-agenda',
    label: 'Salón de belleza / estética',
    niche: 'Belleza / estética',
    promise: 'Aumentar reservas con resultados visuales, agenda y paquetes destacados.',
    visual: 'Crema, rosa suave, negro, dorado, fotos de resultados y glamour.',
    sections: ['Hero agenda', 'Servicios', 'Resultados', 'Paquetes', 'Instagram', 'Reserva'],
    cta: 'Agendar hora',
    score: 89,
  },
  {
    id: 'tienda-catalogo',
    label: 'Tienda local / catálogo',
    niche: 'Comercio local',
    promise: 'Crear catálogo simple con categorías, WhatsApp y productos destacados.',
    visual: 'Ecommerce liviano, cards limpias, filtros visuales y CTA directo.',
    sections: ['Hero oferta', 'Categorías', 'Productos', 'Beneficios', 'Ubicación', 'Compra WhatsApp'],
    cta: 'Consultar producto',
    score: 86,
  },
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
  return [
    `Plantilla: ${template.label}`,
    `Nicho: ${template.niche}`,
    `Promesa: ${template.promise}`,
    `Dirección visual: ${template.visual}`,
    `Secciones sugeridas: ${template.sections.join(', ')}`,
    `CTA principal: ${template.cta}`,
    `Score de oportunidad sugerido: ${template.score}`,
  ].join('\n');
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
    notes: `${templateBrief(template)}\n\nProblema: El prospecto necesita una propuesta visual rápida para entender el valor antes de una llamada.\nOportunidad: Generar una demo personalizada y compartirla por WhatsApp o correo.`,
    logo: '',
  };
}

function readLocalProspects(): LegacyProspect[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveProspectAndReload(prospect: LegacyProspect, setMessage: (message: string) => void, setStudioKey: (updater: (key: number) => number) => void) {
  const current = readLocalProspects().filter((item) => item.id !== prospect.id && item.brand !== prospect.brand);
  localStorage.setItem(STORAGE, JSON.stringify([prospect, ...current].slice(0, 120)));
  setMessage(`${prospect.brand} fue cargado en el editor. Puedes importar HTML, generar demo o publicar link.`);
  setStudioKey((key) => key + 1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export default function PageEngineProspectingStudioHybridClient() {
  const [studioKey, setStudioKey] = useState(0);
  const [message, setMessage] = useState('');
  const [showImporter, setShowImporter] = useState(true);
  const [showTemplates, setShowTemplates] = useState(true);
  const [templateSearch, setTemplateSearch] = useState('');

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.toLowerCase().trim();
    if (!q) return TEMPLATE_PRESETS;
    return TEMPLATE_PRESETS.filter((template) => [template.label, template.niche, template.promise, template.visual, template.sections.join(' ')].join(' ').toLowerCase().includes(q));
  }, [templateSearch]);

  function useProspectInEditor(prospect: LocalDetectedProspect) {
    saveProspectAndReload(toLegacyProspect(prospect), setMessage, setStudioKey);
  }

  function useTemplate(template: TemplatePreset) {
    saveProspectAndReload(templateToProspect(template), setMessage, setStudioKey);
  }

  async function copyTemplate(template: TemplatePreset) {
    await navigator.clipboard.writeText(templateBrief(template));
    setMessage(`Brief de ${template.label} copiado. Puedes pegarlo en el prompt IA o en notas del prospecto.`);
  }

  return <main className="min-h-screen overflow-x-hidden bg-[#050403] text-white">
    <section className="mx-auto w-full max-w-[1800px] space-y-5 px-2 py-3 sm:px-4 lg:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-yellow-300/15 bg-[radial-gradient(circle_at_top_left,rgba(253,224,71,.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))] p-4 shadow-[0_35px_120px_rgba(0,0,0,.45)] sm:p-6 lg:p-8">
        <div className="absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="relative grid gap-6 xl:grid-cols-[1fr_520px]">
          <div>
            <p className="inline-flex items-center rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200"><Sparkles className="mr-2 h-3.5 w-3.5" />Motor de Prospección IA</p>
            <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Page Engine 21stDev organizado para vender demos reales.</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/62">Importa prospectos desde JSON, HTML o texto, activa IA cuando quieras, usa plantillas por nicho y baja todo al editor actual sin romper el flujo que ya tienes.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => setShowImporter((v) => !v)} className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-black text-white/80"><UploadCloud className="mr-2 inline h-4 w-4" />{showImporter ? 'Ocultar importador' : 'Mostrar importador'}</button>
              <button onClick={() => setShowTemplates((v) => !v)} className="rounded-2xl border border-yellow-300/25 bg-yellow-300 px-4 py-3 text-sm font-black text-black"><LayoutTemplate className="mr-2 inline h-4 w-4" />{showTemplates ? 'Ocultar plantillas' : 'Ver plantillas'}</button>
              <button onClick={() => setMessage('Flujo recomendado: importa prospecto → elige plantilla → carga al editor → genera/publica link.')} className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-white/80"><Brain className="mr-2 inline h-4 w-4" />Guía rápida</button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric icon={<DatabaseZap className="h-5 w-5" />} label="BD" value="prospects" detail="Importación real" />
            <Metric icon={<LayoutTemplate className="h-5 w-5" />} label="Módulo 05" value="Plantillas" detail="Nicho + estructura" />
            <Metric icon={<FileCode2 className="h-5 w-5" />} label="HTML" value="Exacto" detail="No rompe CSS/JS" />
            <Metric icon={<Wand2 className="h-5 w-5" />} label="IA" value="ON/OFF" detail="Híbrido seguro" />
          </div>
        </div>
      </div>

      {message && <div className="rounded-[1.4rem] border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100"><BadgeCheck className="mr-2 inline h-4 w-4" />{message}</div>}

      {showImporter && <LocalProspectImportPanel onUseProspect={useProspectInEditor} onSaved={() => setMessage('Prospectos guardados en base de datos. Puedes usarlos para generar landing o seguimiento.')} />}

      {showTemplates && <section className="rounded-[1.8rem] border border-white/10 bg-black/40 p-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Módulo 05</p>
            <h2 className="text-2xl font-black">Plantillas por nicho</h2>
            <p className="mt-1 max-w-3xl text-sm text-white/45">Cada plantilla trae promesa, estructura, estilo visual y CTA para acelerar la creación de demos. Cárgala al editor o copia el brief para usarlo con IA.</p>
          </div>
          <label className="flex h-11 min-w-[250px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3">
            <Search className="h-4 w-4 text-white/35" />
            <input value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} placeholder="buscar plantilla" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </header>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredTemplates.map((template) => <article key={template.id} className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.025] p-4 transition hover:border-yellow-300/35 hover:bg-yellow-300/[0.04]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-xl font-black">{template.label}</h3>
                <p className="mt-1 text-sm text-yellow-100/70">{template.niche}</p>
              </div>
              <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-100">{template.score}%</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/62">{template.promise}</p>
            <div className="mt-3 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/50"><b className="text-yellow-200">Visual:</b> {template.visual}</div>
            <div className="mt-3 flex flex-wrap gap-2">{template.sections.map((section) => <span key={section} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">{section}</span>)}</div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button onClick={() => useTemplate(template)} className="rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-black">Usar plantilla</button>
              <button onClick={() => void copyTemplate(template)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/70"><Copy className="mr-2 inline h-4 w-4" />Copiar brief</button>
            </div>
          </article>)}
        </div>
      </section>}

      <details className="rounded-[1.8rem] border border-white/10 bg-black/35 p-4" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xl font-black">Editor completo actual <ChevronDown className="h-5 w-5 text-white/45" /></summary>
        <div className="mt-4">
          <PageEngineProspectingStudioExactClient key={studioKey} />
        </div>
      </details>
    </section>
  </main>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="rounded-[1.4rem] border border-white/10 bg-black/35 p-4">
    <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-200">{icon}</div>
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{label}</p>
    <p className="mt-1 text-2xl font-black">{value}</p>
    <p className="mt-1 text-sm text-white/45">{detail}</p>
  </div>;
}
