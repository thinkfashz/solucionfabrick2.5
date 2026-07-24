'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  Eye,
  Facebook,
  Image as ImageIcon,
  Instagram,
  Laptop,
  Loader2,
  MessageCircle,
  MonitorSmartphone,
  MousePointerClick,
  Rocket,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  WandSparkles,
  Zap,
} from 'lucide-react';

type PreviewMode = 'feed' | 'story' | 'mobile' | 'desktop';
type Stage = 'brief' | 'generating' | 'review' | 'publishing' | 'published';

type ScoreBreakdown = {
  clarity: number;
  relevance: number;
  trust: number;
  offerStrength: number;
  urgency: number;
  visualFit: number;
};

type AdVariant = {
  name: string;
  angle: string;
  primaryText: string;
  headline: string;
  description: string;
  callToAction: string;
  hook: string;
  proof: string;
  urgency: string;
  audienceInsight: string;
  visualDirection: string;
  keywords: string[];
  hashtags: string[];
  persuasionFramework: string;
  salesProbability: number;
  scoreBreakdown: ScoreBreakdown;
};

type AiResult = {
  variants: AdVariant[];
  campaignSummary?: string;
  recommendedAudience?: string;
  recommendedPlacement?: string;
  risks?: string[];
  tests?: string[];
  warning?: string;
};

type PublishResult = { adId: string; adLink: string; campaignId: string; adSetId: string };

const TODAY = new Date().toISOString().slice(0, 10);
const NEXT_MONTH = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

const LOCATIONS = [
  ['maule', 'Región del Maule'],
  ['santiago', 'Santiago'],
  ['metropolitana', 'Región Metropolitana'],
  ['valparaiso', 'Valparaíso'],
  ['bío_bío', 'Biobío'],
  ['chile', 'Todo Chile'],
] as const;

const AGES = [
  { min: 25, max: 44, label: '25–44' },
  { min: 30, max: 55, label: '30–55' },
  { min: 35, max: 64, label: '35–64' },
  { min: 18, max: 65, label: '18–65 amplio' },
];

const OBJECTIVES = [
  ['messages', 'Conversaciones por WhatsApp'],
  ['leads', 'Captación de prospectos'],
  ['sales', 'Ventas'],
  ['traffic', 'Tráfico al sitio'],
] as const;

function currency(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
}

function MetricBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.13em] text-[#756B63]"><span>{label}</span><span>{value}%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E6D4C3]"><span className="block h-full rounded-full bg-[#B6906C]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
    </div>
  );
}

function ProbabilityGauge({ value }: { value: number }) {
  const score = Math.min(95, Math.max(25, Math.round(value || 60)));
  return (
    <div className="relative grid h-36 w-36 place-items-center rounded-full" style={{ background: `conic-gradient(#B6906C ${score * 3.6}deg, #E6D4C3 0deg)` }}>
      <div className="grid h-28 w-28 place-items-center rounded-full bg-[#F8F0E9] text-center">
        <div><strong className="text-3xl font-black text-[#171820]">{score}%</strong><span className="mt-1 block text-[8px] font-black uppercase tracking-[.13em] text-[#756B63]">Potencial estimado</span></div>
      </div>
    </div>
  );
}

function MetaPreview({ mode, image, variant, brand }: { mode: PreviewMode; image: string | null; variant: AdVariant; brand: string }) {
  const story = mode === 'story';
  const desktop = mode === 'desktop';
  return (
    <div className={`mx-auto overflow-hidden bg-white text-[#171820] shadow-[0_24px_80px_rgba(23,24,32,.18)] ${story ? 'aspect-[9/16] max-h-[680px] w-[330px] rounded-[2.4rem]' : desktop ? 'w-full max-w-[760px] rounded-2xl' : 'w-full max-w-[420px] rounded-[1.8rem]'}`}>
      <div className={`flex items-center gap-3 ${story ? 'absolute z-10 w-[330px] p-4 text-white' : 'p-4'}`}>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#171820] text-[#CCB196]"><Sparkles className="h-4 w-4" /></span>
        <div className="min-w-0"><p className="truncate text-sm font-black">{brand}</p><p className={`text-[10px] ${story ? 'text-white/70' : 'text-[#756B63]'}`}>Patrocinado · Meta</p></div>
      </div>
      {!story ? <p className="px-4 pb-4 text-sm leading-6 text-[#3F3935]">{variant.primaryText}</p> : null}
      <div className={`relative overflow-hidden bg-[#E6D4C3] ${story ? 'h-full' : desktop ? 'aspect-[1.91/1]' : 'aspect-square'}`}>
        {image ? <img src={image} alt="Previsualización del anuncio" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[#895E3D]"><ImageIcon className="h-12 w-12" /></div>}
        {story ? <div className="absolute inset-0 bg-gradient-to-t from-[#171820]/90 via-transparent to-[#171820]/35" /> : null}
        {story ? <div className="absolute inset-x-5 bottom-7 text-white"><p className="text-sm font-bold leading-6">{variant.primaryText}</p><h3 className="mt-4 text-2xl font-black leading-tight">{variant.headline}</h3><button type="button" className="mt-5 w-full rounded-full bg-[#F8F0E9] px-5 py-3 text-xs font-black text-[#171820]">{variant.callToAction}</button></div> : null}
      </div>
      {!story ? <div className="flex items-center justify-between gap-4 bg-[#F8F0E9] p-4"><div className="min-w-0"><p className="truncate text-[9px] font-black uppercase tracking-[.14em] text-[#895E3D]">solucionesfabrick.com</p><h3 className="mt-1 line-clamp-2 text-base font-black leading-tight">{variant.headline}</h3><p className="mt-1 line-clamp-2 text-xs text-[#756B63]">{variant.description}</p></div><button type="button" className="shrink-0 rounded-xl bg-[#171820] px-4 py-3 text-[10px] font-black text-white">{variant.callToAction}</button></div> : null}
      {!story ? <div className="flex items-center justify-between px-4 py-3 text-[#756B63]"><span className="flex items-center gap-1 text-[10px]"><Facebook className="h-3.5 w-3.5" /> Me gusta · Comentar · Compartir</span><Instagram className="h-4 w-4" /></div> : null}
    </div>
  );
}

export default function AIAdCreatorPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('brief');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('feed');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState({
    product: '', audience: '', objective: 'messages', offer: '', location: 'maule', destinationUrl: 'https://www.solucionesfabrick.com/presupuesto', tone: 'Profesional, cercano y confiable', price: '', differentiators: '', budget: '10000', start: TODAY, end: NEXT_MONTH, ageIndex: '1', brand: 'Soluciones Fabrick',
  });

  const variant = result?.variants?.[selected] || null;
  const budget = Number(form.budget || 0);
  const forecast = useMemo(() => {
    const probability = variant?.salesProbability || 60;
    const estimatedCpc = Math.max(180, 520 - probability * 3.2);
    const clicks = budget > 0 ? Math.round(budget / estimatedCpc) : 0;
    const contacts = Math.max(0, Math.round(clicks * (probability / 100) * 0.22));
    return { estimatedCpc, clicks, contacts };
  }, [budget, variant]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function chooseImage(file?: File) {
    if (!file || !file.type.startsWith('image/')) return;
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function generate() {
    if (!form.product.trim()) return setMessage('Describe el producto o servicio que deseas anunciar.');
    setStage('generating'); setMessage(''); setProgress(12);
    const timer = window.setInterval(() => setProgress((value) => value >= 91 ? value : value + Math.max(1, Math.round((92 - value) / 8))), 420);
    try {
      const response = await fetch('/api/meta/ads/ai-draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await response.json() as AiResult & { error?: string };
      if (!response.ok) throw new Error(json.error || 'No se pudo generar la campaña.');
      setResult(json); setSelected(0); setProgress(100); setStage('review'); setMessage(json.warning || 'La IA generó dos propuestas. Selecciona, edita y previsualiza antes de publicar.');
    } catch (error) {
      setStage('brief'); setMessage(error instanceof Error ? error.message : 'No se pudo generar el anuncio.');
    } finally { window.clearInterval(timer); }
  }

  function patchVariant(patch: Partial<AdVariant>) {
    if (!result) return;
    setResult({ ...result, variants: result.variants.map((item, index) => index === selected ? { ...item, ...patch } : item) });
  }

  async function publish() {
    if (!variant) return;
    if (!imageFile) return setMessage('Selecciona una imagen antes de publicar en Meta.');
    const age = AGES[Number(form.ageIndex)];
    if (!age) return setMessage('Selecciona un rango de edad válido.');
    setStage('publishing'); setProgress(8); setMessage('Subiendo el creativo a Meta…');
    try {
      const imageData = new FormData(); imageData.append('image', imageFile);
      const uploadResponse = await fetch('/api/meta/upload', { method: 'POST', body: imageData });
      const uploadJson = await uploadResponse.json() as { hash?: string; error?: string };
      if (!uploadResponse.ok || !uploadJson.hash) throw new Error(uploadJson.error || 'No se pudo subir el creativo.');
      setProgress(52); setMessage('Creando campaña, conjunto y anuncio en Meta…');
      const createResponse = await fetch('/api/meta/ads/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          titulo: variant.headline.slice(0, 40), texto: variant.primaryText.slice(0, 125), urlDestino: form.destinationUrl, presupuestoCLP: Number(form.budget), fechaInicio: form.start, fechaFin: form.end, ubicacion: form.location, edadMin: age.min, edadMax: age.max, imageHash: uploadJson.hash,
        }),
      });
      const createJson = await createResponse.json() as { data?: PublishResult; error?: string };
      if (!createResponse.ok || !createJson.data) throw new Error(createJson.error || 'No se pudo publicar el anuncio.');
      setPublishResult(createJson.data); setProgress(100); setStage('published'); setMessage('Anuncio publicado correctamente en Meta Ads.');
    } catch (error) {
      setStage('review'); setMessage(error instanceof Error ? error.message : 'No se pudo publicar el anuncio.');
    }
  }

  return (
    <main className="min-h-screen bg-[#171820] px-4 py-8 text-[#F8F0E9] sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2.4rem] bg-[radial-gradient(circle_at_85%_0%,rgba(204,177,150,.2),transparent_30rem),linear-gradient(145deg,#242630,#171820)] p-6 shadow-2xl sm:p-8">
          <Link href="/admin/publicidad" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#CCB196]"><ArrowLeft className="h-3.5 w-3.5" /> Volver a Publicidad</Link>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div><span className="inline-flex items-center gap-2 rounded-full bg-white/7 px-4 py-2 text-[10px] font-black uppercase tracking-[.24em] text-[#E5CFBA]"><Sparkles className="h-3.5 w-3.5" /> Creador de anuncios IA</span><h1 className="mt-5 max-w-4xl text-4xl font-black leading-[.94] tracking-[-.055em] sm:text-6xl">Estrategia, copy, preview y análisis antes de publicar.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[#CFC3BA]">Construye dos enfoques de venta, compara su potencial, revisa el anuncio en Feed, Stories, móvil y escritorio, y solo después confirma el envío a Meta.</p></div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-2xl bg-white/7 p-3"><b className="block text-lg">2</b><span className="text-[8px] uppercase tracking-[.13em] text-white/45">Variantes IA</span></div><div className="rounded-2xl bg-white/7 p-3"><b className="block text-lg">4</b><span className="text-[8px] uppercase tracking-[.13em] text-white/45">Previews</span></div><div className="rounded-2xl bg-white/7 p-3"><b className="block text-lg">6</b><span className="text-[8px] uppercase tracking-[.13em] text-white/45">Señales</span></div></div></div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[420px_1fr]">
          <aside className="h-fit rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] shadow-[0_24px_80px_rgba(0,0,0,.2)] xl:sticky xl:top-6 sm:p-6">
            <h2 className="text-xl font-black">Brief comercial</h2><p className="mt-1 text-xs leading-6 text-[#756B63]">Mientras más específica sea la oferta, mejor será la propuesta.</p>
            <div className="mt-5 grid gap-4">
              <Field label="Producto o servicio"><textarea value={form.product} onChange={(event) => update('product', event.target.value)} rows={3} placeholder="Ej: ampliación Metalcon de 30 m²" /></Field>
              <Field label="Público objetivo"><textarea value={form.audience} onChange={(event) => update('audience', event.target.value)} rows={2} placeholder="Propietarios de 30 a 55 años…" /></Field>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Field label="Objetivo"><select value={form.objective} onChange={(event) => update('objective', event.target.value)}>{OBJECTIVES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field><Field label="Ubicación"><select value={form.location} onChange={(event) => update('location', event.target.value)}>{LOCATIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div>
              <Field label="Oferta"><textarea value={form.offer} onChange={(event) => update('offer', event.target.value)} rows={2} placeholder="Evaluación inicial, visita, descuento real…" /></Field>
              <Field label="Diferenciadores"><textarea value={form.differentiators} onChange={(event) => update('differentiators', event.target.value)} rows={2} placeholder="Cálculo claro, seguimiento, experiencia…" /></Field>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><Field label="Precio o rango"><input value={form.price} onChange={(event) => update('price', event.target.value)} placeholder="Ej: desde $850.000" /></Field><Field label="Presupuesto diario CLP"><input type="number" min="1000" value={form.budget} onChange={(event) => update('budget', event.target.value)} /></Field></div>
              <Field label="URL de destino"><input value={form.destinationUrl} onChange={(event) => update('destinationUrl', event.target.value)} /></Field>
              <Field label="Imagen del anuncio"><button type="button" onClick={() => fileInput.current?.click()} className="flex min-h-28 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#E6D4C3] text-center">{imagePreview ? <img src={imagePreview} alt="Creativo seleccionado" className="h-40 w-full object-cover" /> : <span><Upload className="mx-auto h-6 w-6 text-[#895E3D]" /><b className="mt-2 block text-xs">Seleccionar imagen</b></span>}</button><input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(event) => chooseImage(event.target.files?.[0])} /></Field>
              <button type="button" onClick={() => void generate()} disabled={stage === 'generating'} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#171820] px-5 text-sm font-black text-white disabled:opacity-45">{stage === 'generating' ? <Loader2 className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5 text-[#CCB196]" />} {stage === 'generating' ? 'Construyendo campaña…' : 'Crear 2 propuestas con IA'}</button>
            </div>
          </aside>

          <section className="min-w-0">
            {(stage === 'generating' || stage === 'publishing') ? <div className="rounded-[2rem] bg-[#F8F0E9] p-6 text-[#171820]"><div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin text-[#895E3D]" /><div><h2 className="font-black">{stage === 'publishing' ? 'Publicando en Meta' : 'Analizando la campaña'}</h2><p className="mt-1 text-xs text-[#756B63]">{message || 'La IA organiza el ángulo, el copy, la oferta y las señales de conversión.'}</p></div></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-[#E6D4C3]"><span className="block h-full rounded-full bg-[#B6906C] transition-all duration-500" style={{ width: `${progress}%` }} /></div></div> : null}

            {!result && stage === 'brief' ? <div className="grid min-h-[650px] place-items-center rounded-[2rem] bg-white/5 p-8 text-center"><div><Target className="mx-auto h-12 w-12 text-[#CCB196]" /><h2 className="mt-5 text-3xl font-black">Completa el brief para comenzar</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/45">Recibirás dos propuestas, análisis persuasivo, desglose de señales, previsión orientativa y vista previa en diferentes ubicaciones de Meta.</p></div></div> : null}

            {result && variant ? <div className="grid gap-6">
              <div className="grid gap-4 lg:grid-cols-2">{result.variants.map((item, index) => <button key={`${item.name}-${index}`} type="button" onClick={() => setSelected(index)} className={`rounded-[1.8rem] p-5 text-left transition ${selected === index ? 'bg-[#B6906C] text-[#171820]' : 'bg-white/7 text-white'}`}><div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[.18em] opacity-60">Propuesta {index + 1} · {item.persuasionFramework}</p><h2 className="mt-2 text-xl font-black">{item.name}</h2></div><span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${selected === index ? 'bg-[#171820] text-white' : 'bg-white/8'}`}>{item.salesProbability}%</span></div><p className="mt-3 text-xs leading-6 opacity-75">{item.angle}</p></button>)}</div>

              <div className="rounded-[2rem] bg-[#F8F0E9] p-5 text-[#171820] sm:p-7"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#895E3D]">Editor y previsualización</p><h2 className="mt-2 text-2xl font-black">Revisa antes de enviar a Meta</h2></div><div className="flex flex-wrap gap-2">{([['feed', MonitorSmartphone, 'Feed'], ['story', Smartphone, 'Stories'], ['mobile', Smartphone, 'Móvil'], ['desktop', Laptop, 'Escritorio']] as const).map(([key, Icon, label]) => <button key={key} type="button" onClick={() => setPreviewMode(key)} className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[9px] font-black ${previewMode === key ? 'bg-[#171820] text-white' : 'bg-[#E6D4C3] text-[#5E5148]'}`}><Icon className="h-3.5 w-3.5" /> {label}</button>)}</div></div>
                <div className="mt-6 grid gap-6 2xl:grid-cols-[.9fr_1.1fr]"><div className="grid gap-4"><Field label="Texto principal"><textarea value={variant.primaryText} onChange={(event) => patchVariant({ primaryText: event.target.value })} rows={6} /></Field><Field label="Titular"><input value={variant.headline} onChange={(event) => patchVariant({ headline: event.target.value })} /></Field><Field label="Descripción"><textarea value={variant.description} onChange={(event) => patchVariant({ description: event.target.value })} rows={3} /></Field><Field label="Llamado a la acción"><input value={variant.callToAction} onChange={(event) => patchVariant({ callToAction: event.target.value })} /></Field></div><div className="rounded-[1.8rem] bg-[#E6D4C3]/55 p-4"><MetaPreview mode={previewMode} image={imagePreview} variant={variant} brand={form.brand} /></div></div>
              </div>

              <div className="grid gap-6 xl:grid-cols-[.75fr_1.25fr]"><div className="rounded-[2rem] bg-[#F8F0E9] p-6 text-[#171820]"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#895E3D]">Análisis de venta</p><div className="mt-5 flex justify-center"><ProbabilityGauge value={variant.salesProbability} /></div><p className="mt-4 text-center text-xs leading-6 text-[#756B63]">Estimación editorial de IA. No es una tasa de conversión garantizada ni un dato obtenido de Meta.</p><div className="mt-6 grid gap-4"><MetricBar label="Claridad" value={variant.scoreBreakdown.clarity} /><MetricBar label="Relevancia" value={variant.scoreBreakdown.relevance} /><MetricBar label="Confianza" value={variant.scoreBreakdown.trust} /><MetricBar label="Fuerza de oferta" value={variant.scoreBreakdown.offerStrength} /><MetricBar label="Urgencia" value={variant.scoreBreakdown.urgency} /><MetricBar label="Ajuste visual" value={variant.scoreBreakdown.visualFit} /></div></div>
                <div className="grid gap-4"><div className="grid gap-4 sm:grid-cols-3"><MetricCard icon={MousePointerClick} label="Clics orientativos" value={String(forecast.clicks)} note={`CPC modelado ${currency(forecast.estimatedCpc)}`} /><MetricCard icon={MessageCircle} label="Contactos orientativos" value={String(forecast.contacts)} note="No garantiza prospectos reales" /><MetricCard icon={TrendingUp} label="Presupuesto diario" value={currency(budget)} note="Configurable antes de publicar" /></div><div className="rounded-[2rem] bg-white/7 p-6"><div className="grid gap-5 md:grid-cols-2"><InfoBlock title="Gancho" text={variant.hook} /><InfoBlock title="Prueba o confianza" text={variant.proof} /><InfoBlock title="Urgencia responsable" text={variant.urgency} /><InfoBlock title="Dirección visual" text={variant.visualDirection} /></div><div className="mt-5 flex flex-wrap gap-2">{variant.keywords.map((keyword) => <span key={keyword} className="rounded-full bg-white/8 px-3 py-1.5 text-[9px] font-black text-[#E5CFBA]">{keyword}</span>)}</div></div></div>
              </div>

              {(result.risks?.length || result.tests?.length) ? <div className="grid gap-4 md:grid-cols-2"><ListCard title="Riesgos a revisar" icon={AlertTriangle} items={result.risks || []} /><ListCard title="Pruebas A/B sugeridas" icon={Zap} items={result.tests || []} /></div> : null}

              {stage === 'published' && publishResult ? <div className="rounded-[2rem] bg-emerald-300 p-6 text-[#171820]"><Check className="h-8 w-8" /><h2 className="mt-4 text-2xl font-black">Anuncio publicado</h2><p className="mt-2 text-sm">Campaña, conjunto y anuncio fueron creados correctamente.</p><a href={publishResult.adLink} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#171820] px-5 py-3 text-xs font-black text-white">Abrir Meta Ads Manager <ChevronRight className="h-4 w-4" /></a></div> : <button type="button" onClick={() => void publish()} disabled={stage === 'publishing'} className="inline-flex min-h-16 items-center justify-center gap-3 rounded-[1.4rem] bg-[#B6906C] px-6 text-base font-black text-[#171820] disabled:opacity-45"><Rocket className="h-5 w-5" /> Confirmar y publicar esta propuesta en Meta</button>}
              {message ? <p className="rounded-2xl bg-white/7 px-4 py-3 text-xs leading-6 text-white/70">{message}</p> : null}
            </div> : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2"><span className="text-[10px] font-black uppercase tracking-[.16em] text-[#756B63]">{label}</span><div className="[&_input]:w-full [&_input]:rounded-2xl [&_input]:bg-white [&_input]:px-4 [&_input]:py-3 [&_input]:text-sm [&_input]:outline-none [&_select]:w-full [&_select]:rounded-2xl [&_select]:bg-white [&_select]:px-4 [&_select]:py-3 [&_select]:text-sm [&_select]:outline-none [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-2xl [&_textarea]:bg-white [&_textarea]:px-4 [&_textarea]:py-3 [&_textarea]:text-sm [&_textarea]:outline-none">{children}</div></label>;
}

function MetricCard({ icon: Icon, label, value, note }: { icon: typeof BarChart3; label: string; value: string; note: string }) {
  return <div className="rounded-[1.6rem] bg-[#F8F0E9] p-5 text-[#171820]"><Icon className="h-5 w-5 text-[#895E3D]" /><p className="mt-4 text-[9px] font-black uppercase tracking-[.14em] text-[#756B63]">{label}</p><strong className="mt-1 block text-2xl font-black">{value}</strong><p className="mt-2 text-[10px] leading-5 text-[#756B63]">{note}</p></div>;
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return <div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#CCB196]">{title}</p><p className="mt-2 text-xs leading-6 text-white/65">{text}</p></div>;
}

function ListCard({ title, icon: Icon, items }: { title: string; icon: typeof AlertTriangle; items: string[] }) {
  return <div className="rounded-[2rem] bg-[#F8F0E9] p-6 text-[#171820]"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#171820] text-[#CCB196]"><Icon className="h-4 w-4" /></span><h3 className="font-black">{title}</h3></div><ul className="mt-4 grid gap-2">{items.map((item) => <li key={item} className="flex gap-2 text-xs leading-6 text-[#5E5148]"><ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-[#895E3D]" /> {item}</li>)}</ul></div>;
}
