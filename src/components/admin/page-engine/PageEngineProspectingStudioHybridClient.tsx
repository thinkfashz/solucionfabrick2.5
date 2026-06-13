'use client';

import * as React from 'react';
import {
  BadgeCheck,
  Brain,
  ChevronDown,
  ClipboardList,
  Copy,
  DatabaseZap,
  Eye,
  FileCode2,
  Home,
  LayoutTemplate,
  Menu,
  PanelRight,
  Search,
  Sparkles,
  UploadCloud,
  Wand2,
  X,
} from 'lucide-react';
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
  const [studioKey, setStudioKey] = React.useState(0);
  const [message, setMessage] = React.useState('');
  const [showImporter, setShowImporter] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(true);
  const [showEditor, setShowEditor] = React.useState(false);
  const [templateSearch, setTemplateSearch] = React.useState('');
  const topRef = React.useRef<HTMLDivElement | null>(null);
  const importerRef = React.useRef<HTMLDivElement | null>(null);
  const templatesRef = React.useRef<HTMLDivElement | null>(null);
  const editorRef = React.useRef<HTMLDivElement | null>(null);

  const filteredTemplates = React.useMemo(() => {
    const q = templateSearch.toLowerCase().trim();
    if (!q) return TEMPLATE_PRESETS;
    return TEMPLATE_PRESETS.filter((template) => [template.label, template.niche, template.promise, template.visual, template.sections.join(' ')].join(' ').toLowerCase().includes(q));
  }, [templateSearch]);

  const scrollTo = React.useCallback((ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  function useProspectInEditor(prospect: LocalDetectedProspect) {
    saveProspectAndReload(toLegacyProspect(prospect), setMessage, setStudioKey);
    setShowEditor(true);
  }

  function useTemplate(template: TemplatePreset) {
    saveProspectAndReload(templateToProspect(template), setMessage, setStudioKey);
    setShowEditor(true);
  }

  async function copyTemplate(template: TemplatePreset) {
    await navigator.clipboard.writeText(templateBrief(template));
    setMessage(`Brief de ${template.label} copiado. Puedes pegarlo en el prompt IA o en notas del prospecto.`);
  }

  return <main ref={topRef} className="min-h-screen overflow-x-hidden bg-[#050403] pb-28 text-white">
    <FloatingProspectingMenu
      showImporter={showImporter}
      showTemplates={showTemplates}
      showEditor={showEditor}
      onToggleImporter={() => {
        setShowImporter((value) => !value);
        setTimeout(() => scrollTo(importerRef), 80);
      }}
      onToggleTemplates={() => {
        setShowTemplates((value) => !value);
        setTimeout(() => scrollTo(templatesRef), 80);
      }}
      onToggleEditor={() => {
        setShowEditor((value) => !value);
        setTimeout(() => scrollTo(editorRef), 80);
      }}
      onHome={() => scrollTo(topRef)}
      onTemplates={() => scrollTo(templatesRef)}
      onImporter={() => scrollTo(importerRef)}
      onEditor={() => scrollTo(editorRef)}
      onUseDental={() => useTemplate(TEMPLATE_PRESETS[0])}
      onGuide={() => setMessage('Flujo recomendado: importa prospecto → elige plantilla → carga al editor → genera/publica link → comparte por WhatsApp.')}
    />

    <section className="mx-auto w-full max-w-[1540px] space-y-4 px-3 py-3 sm:px-5 lg:px-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#090806] shadow-[0_35px_120px_rgba(0,0,0,.55)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(253,224,71,.22),transparent_34%),radial-gradient(circle_at_95%_10%,rgba(255,255,255,.10),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent" />
        <div className="relative grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:p-8">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-yellow-300/25 bg-yellow-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200"><Sparkles className="mr-2 h-3.5 w-3.5" />Motor IA</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">Page Engine 21stDev</span>
            </div>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.15rem,7vw,5.8rem)] font-black leading-[0.92] tracking-[-0.08em] text-white">Prospección premium sin desorden.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/58 sm:text-lg">Sube prospectos, elige plantilla, edita HTML exacto y publica links. Todo queda más limpio, centrado y usable en móvil.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ActionButton active={showImporter} icon={<UploadCloud className="h-4 w-4" />} onClick={() => setShowImporter((v) => !v)} label={showImporter ? 'Importador visible' : 'Importar prospectos'} />
              <ActionButton active={showTemplates} icon={<LayoutTemplate className="h-4 w-4" />} onClick={() => setShowTemplates((v) => !v)} label={showTemplates ? 'Plantillas visibles' : 'Ver plantillas'} />
              <ActionButton active={showEditor} icon={<FileCode2 className="h-4 w-4" />} onClick={() => setShowEditor((v) => !v)} label={showEditor ? 'Editor visible' : 'Abrir editor'} />
              <ActionButton icon={<Brain className="h-4 w-4" />} onClick={() => setMessage('Flujo recomendado: importa prospecto → elige plantilla → carga al editor → genera/publica link → comparte por WhatsApp.')} label="Guía rápida" />
            </div>
          </div>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Metric icon={<DatabaseZap className="h-5 w-5" />} label="BD" value="prospects" detail="Importación real" />
            <Metric icon={<LayoutTemplate className="h-5 w-5" />} label="Plantillas" value="6 nichos" detail="Brief + CTA" />
            <Metric icon={<FileCode2 className="h-5 w-5" />} label="HTML" value="Exacto" detail="CSS/JS intacto" />
            <Metric icon={<Wand2 className="h-5 w-5" />} label="IA" value="ON/OFF" detail="Híbrido seguro" />
          </div>
        </div>
      </section>

      {message && <div className="rounded-[1.4rem] border border-emerald-300/20 bg-emerald-400/10 p-3 text-sm font-semibold text-emerald-100"><BadgeCheck className="mr-2 inline h-4 w-4" />{message}</div>}

      {showImporter && <div ref={importerRef}><LocalProspectImportPanel onUseProspect={useProspectInEditor} onSaved={() => setMessage('Prospectos guardados en base de datos. Puedes usarlos para generar landing o seguimiento.')} /></div>}

      {showTemplates && <section ref={templatesRef} className="rounded-[2rem] border border-white/10 bg-black/35 p-4 shadow-[0_24px_80px_rgba(0,0,0,.35)] sm:p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Módulo 05</p>
            <h2 className="text-2xl font-black sm:text-3xl">Plantillas por nicho</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/45">Briefs listos para cargar al editor. La idea es no empezar desde cero y mantener una línea visual premium.</p>
          </div>
          <label className="flex h-12 w-full max-w-sm items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-4">
            <Search className="h-4 w-4 text-white/35" />
            <input value={templateSearch} onChange={(e) => setTemplateSearch(e.target.value)} placeholder="buscar plantilla" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
        </header>
        <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredTemplates.map((template) => <article key={template.id} className="group overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025))] p-4 transition hover:border-yellow-300/35 hover:shadow-[0_20px_80px_rgba(253,224,71,.08)]">
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

      <section ref={editorRef} className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-[0_24px_80px_rgba(0,0,0,.35)]">
        <button onClick={() => setShowEditor((value) => !value)} className="flex w-full items-center justify-between gap-3 p-4 text-left text-xl font-black sm:p-5">
          <span className="min-w-0 truncate">Editor completo actual</span>
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]"><ChevronDown className={`h-5 w-5 text-white/50 transition ${showEditor ? 'rotate-180' : ''}`} /></span>
        </button>
        {showEditor && <div className="border-t border-white/10 p-2 sm:p-4"><PageEngineProspectingStudioExactClient key={studioKey} /></div>}
      </section>
    </section>
  </main>;
}

function ActionButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition ${active ? 'border-yellow-300/35 bg-yellow-300 text-black shadow-[0_12px_40px_rgba(253,224,71,.18)]' : 'border-white/10 bg-white/[0.045] text-white/75 hover:border-yellow-300/25'}`}>{icon}{label}</button>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <div className="min-w-0 rounded-[1.45rem] border border-white/10 bg-black/35 p-4">
    <div className="mb-3 inline-grid h-10 w-10 place-items-center rounded-2xl border border-yellow-300/20 bg-yellow-300/10 text-yellow-200">{icon}</div>
    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35">{label}</p>
    <p className="mt-1 truncate text-2xl font-black">{value}</p>
    <p className="mt-1 text-sm text-white/45">{detail}</p>
  </div>;
}

function FloatingProspectingMenu({
  showImporter,
  showTemplates,
  showEditor,
  onToggleImporter,
  onToggleTemplates,
  onToggleEditor,
  onHome,
  onTemplates,
  onImporter,
  onEditor,
  onUseDental,
  onGuide,
}: {
  showImporter: boolean;
  showTemplates: boolean;
  showEditor: boolean;
  onToggleImporter: () => void;
  onToggleTemplates: () => void;
  onToggleEditor: () => void;
  onHome: () => void;
  onTemplates: () => void;
  onImporter: () => void;
  onEditor: () => void;
  onUseDental: () => void;
  onGuide: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ right: 18, bottom: 118 });
  const dragRef = React.useRef<{ startX: number; startY: number; right: number; bottom: number } | null>(null);

  function resetPosition() {
    setPos({ right: 18, bottom: 118 });
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    dragRef.current = { startX: event.clientX, startY: event.clientY, right: pos.right, bottom: pos.bottom };
    const move = (moveEvent: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const nextRight = Math.max(8, Math.min(window.innerWidth - 76, drag.right - (moveEvent.clientX - drag.startX)));
      const nextBottom = Math.max(84, Math.min(window.innerHeight - 92, drag.bottom - (moveEvent.clientY - drag.startY)));
      setPos({ right: nextRight, bottom: nextBottom });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', move);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once: true });
  }

  const itemClass = 'flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-black text-white/78 transition hover:border-yellow-300/30 hover:bg-yellow-300/10';

  return <div className="fixed z-[80]" style={{ right: pos.right, bottom: pos.bottom }}>
    {open && <div className="mb-3 w-[min(92vw,330px)] overflow-hidden rounded-[1.5rem] border border-yellow-300/20 bg-[#090806]/95 p-2 shadow-[0_28px_110px_rgba(0,0,0,.72)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Menú rápido</p>
          <p className="text-sm text-white/45">Mantén presionado el botón para moverlo</p>
        </div>
        <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.05]"><X className="h-4 w-4" /></button>
      </div>
      <div className="space-y-2 p-2">
        <button className={itemClass} onClick={onHome}><Home className="h-4 w-4 text-yellow-200" />Inicio del motor</button>
        <button className={itemClass} onClick={onToggleImporter}><UploadCloud className="h-4 w-4 text-yellow-200" />{showImporter ? 'Ocultar importador' : 'Mostrar importador'}</button>
        <button className={itemClass} onClick={onToggleTemplates}><LayoutTemplate className="h-4 w-4 text-yellow-200" />{showTemplates ? 'Ocultar plantillas' : 'Mostrar plantillas'}</button>
        <button className={itemClass} onClick={onToggleEditor}><FileCode2 className="h-4 w-4 text-yellow-200" />{showEditor ? 'Cerrar editor' : 'Abrir editor'}</button>
        <div className="grid grid-cols-3 gap-2">
          <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black text-white/60" onClick={onImporter}>Importar</button>
          <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black text-white/60" onClick={onTemplates}>Nicho</button>
          <button className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs font-black text-white/60" onClick={onEditor}>Editor</button>
        </div>
        <button className={itemClass} onClick={onUseDental}><ClipboardList className="h-4 w-4 text-yellow-200" />Cargar plantilla dental</button>
        <button className={itemClass} onClick={onGuide}><Brain className="h-4 w-4 text-yellow-200" />Ver guía rápida</button>
        <button className={itemClass} onClick={resetPosition}><PanelRight className="h-4 w-4 text-yellow-200" />Reiniciar posición</button>
      </div>
    </div>}
    <button
      onClick={() => setOpen((value) => !value)}
      onPointerDown={onPointerDown}
      className="grid h-16 w-16 touch-none place-items-center rounded-full border-4 border-white bg-black text-yellow-300 shadow-[0_20px_70px_rgba(0,0,0,.65),0_0_50px_rgba(253,224,71,.22)] active:scale-95"
      title="Menú movible"
    >
      {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
    </button>
  </div>;
}
