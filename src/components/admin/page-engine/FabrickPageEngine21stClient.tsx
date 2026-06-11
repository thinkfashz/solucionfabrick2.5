'use client';

import { useMemo, useRef, useState } from 'react';

type Device = 'phone' | 'tablet' | 'desktop' | 'wide';
type BlockType = 'hero' | 'cards' | 'split' | 'cta' | 'calculator' | 'custom';
type JsonState = 'idle' | 'valid' | 'invalid' | 'applied';

type Block = {
  id: string;
  type: BlockType;
  title: string;
  text: string;
  background: string;
  textColor: string;
  accent: string;
  html?: string;
  image?: string;
  buttonText?: string;
  buttonHref?: string;
};

type PageState = { title: string; token?: string; device: Device; blocks: Block[] };
type PageDoc = { token: string; title: string; status: string; updated_at?: string | null; expires_at?: string | null };

const STORAGE = 'sf_page_engine_21stdev_v8';
const TYPES: BlockType[] = ['hero', 'cards', 'split', 'calculator', 'cta', 'custom'];
const DEVICES: Device[] = ['phone', 'tablet', 'desktop', 'wide'];

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function esc(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function text(value: unknown, fallback = '') {
  const next = typeof value === 'string' ? value.trim() : '';
  return next || fallback;
}

function color(value: unknown, fallback: string) {
  const next = text(value);
  if (/^#[0-9a-fA-F]{3,8}$/.test(next)) return next;
  return fallback;
}

function blockType(value: unknown): BlockType {
  const type = text(value) as BlockType;
  return TYPES.includes(type) ? type : 'custom';
}

function makeBlock(type: BlockType): Block {
  const base: Block = { id: uid(), type, title: 'Nuevo bloque Fabrick', text: 'Edita este contenido desde el inspector.', background: '#0d0a06', textColor: '#fff7e8', accent: '#f59e0b', buttonText: 'Solicitar presupuesto', buttonHref: '/contacto' };
  if (type === 'hero') return { ...base, title: 'Landing comercial creada con motor Fabrick', text: 'Presenta tu oferta, conecta presupuestos y comparte una URL privada con vencimiento.' };
  if (type === 'cards') return { ...base, title: 'Beneficios', text: 'Diseño rápido | Presupuesto conectado | Seguimiento comercial', background: '#fff7e9', textColor: '#17120a' };
  if (type === 'split') return { ...base, title: 'Convierte visitas en clientes', text: 'Combina página, propuesta y automatización para vender más rápido.', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80' };
  if (type === 'calculator') return { ...base, title: 'Calculadoras conectadas', text: 'Abre el motor de radier o aire acondicionado y genera presupuesto automático.' };
  if (type === 'cta') return { ...base, title: '¿Listo para cotizar?', text: 'Activa el motor y comparte un link con vencimiento.', background: '#f59e0b', textColor: '#17120a', buttonText: 'Abrir presupuestos', buttonHref: '/admin/presupuestos' };
  return { ...base, title: 'HTML personalizado', text: '', background: '#ffffff', textColor: '#111111', html: '<section><h2>Bloque personalizado</h2><p>Edita este HTML.</p></section>' };
}

function normalizeBlock(raw: unknown, index: number): Block {
  const obj = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const type = blockType(obj.type);
  const fallback = makeBlock(type);
  return {
    ...fallback,
    id: text(obj.id, fallback.id),
    type,
    title: text(obj.title ?? obj.heading ?? obj.name, fallback.title || `Bloque ${index + 1}`),
    text: text(obj.text ?? obj.description ?? obj.subtitle, fallback.text),
    background: color(obj.background ?? obj.bg ?? obj.bgColor, fallback.background),
    textColor: color(obj.textColor ?? obj.color, fallback.textColor),
    accent: color(obj.accent ?? obj.primary ?? obj.buttonColor, fallback.accent),
    html: text(obj.html ?? obj.markup, fallback.html || ''),
    image: text(obj.image ?? obj.image_url ?? obj.cover, fallback.image || ''),
    buttonText: text(obj.buttonText ?? obj.cta ?? obj.ctaText, fallback.buttonText || 'Solicitar presupuesto'),
    buttonHref: text(obj.buttonHref ?? obj.href ?? obj.url, fallback.buttonHref || '/contacto'),
  };
}

function normalizePage(raw: unknown): PageState {
  const obj = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const rawBlocks = Array.isArray(obj.blocks) ? obj.blocks : Array.isArray(obj.sections) ? obj.sections : [];
  const blocks = rawBlocks.length ? rawBlocks.map((block, index) => normalizeBlock(block, index)) : [makeBlock('hero'), makeBlock('cards'), makeBlock('cta')];
  const device = text(obj.device, 'desktop') as Device;
  return { title: text(obj.title ?? obj.name ?? obj.pageTitle, 'Landing Fabrick'), token: text(obj.token, ''), device: DEVICES.includes(device) ? device : 'desktop', blocks };
}

function parseJson(value: string) {
  try {
    const page = normalizePage(JSON.parse(value));
    if (!page.blocks.length) return { ok: false as const, message: 'El JSON no tiene bloques.' };
    return { ok: true as const, page, message: 'JSON válido. Puedes aplicarlo al preview.' };
  } catch (err) {
    return { ok: false as const, message: `JSON inválido: ${(err as Error).message}` };
  }
}

function htmlToPage(raw: string): PageState {
  const title = raw.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() || 'HTML importado';
  const body = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || raw;
  return { title, device: 'desktop', blocks: [{ ...makeBlock('custom'), title, html: body, background: '#ffffff', textColor: '#111111' }] };
}

function initialState(): PageState {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE) || window.localStorage.getItem('sf_page_engine_21stdev_v7');
      if (saved) return normalizePage(JSON.parse(saved));
    } catch {}
  }
  return { title: 'Landing Fabrick', device: 'desktop', blocks: [makeBlock('hero'), makeBlock('cards'), makeBlock('split'), makeBlock('calculator'), makeBlock('cta')] };
}

function css() {
  return `<style>*{box-sizing:border-box}body{margin:0;background:#050505;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{text-decoration:none}.block{padding:68px 42px}.kicker{display:inline-flex;border:1px solid rgba(255,190,56,.38);background:rgba(255,190,56,.12);color:#ffd777;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:1000;letter-spacing:.2em;text-transform:uppercase}h1,h2{font-size:clamp(36px,6vw,76px);line-height:.96;letter-spacing:-.06em;margin:18px 0 14px}p{font-size:18px;line-height:1.65;max-width:780px}.btn{display:inline-flex;margin-top:24px;border-radius:18px;background:var(--accent,#f59e0b);color:#111;padding:15px 20px;font-weight:1000}.cards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{border:1px solid rgba(0,0,0,.08);border-radius:26px;background:#fff;padding:24px;box-shadow:0 16px 35px rgba(20,10,0,.08)}.split-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:26px;align-items:center}.split-grid img{width:100%;border-radius:28px;min-height:280px;object-fit:cover}.calc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:24px}.calc-grid a{border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:22px;background:rgba(255,255,255,.08);color:currentColor}.calc-grid strong{display:block;font-size:24px}.center{text-align:center}.center p{margin-inline:auto}@media(max-width:720px){.block{padding:42px 22px!important}.cards-grid,.split-grid,.calc-grid{grid-template-columns:1fr}h1,h2{font-size:38px!important}}</style>`;
}

function renderBlock(block: Block, live = false) {
  const style = `style="background:${esc(block.background)};color:${esc(block.textColor)};--accent:${esc(block.accent)}"`;
  const attrs = live ? ` data-id="${esc(block.id)}"` : '';
  const buttonText = esc(block.buttonText || 'Solicitar presupuesto');
  const buttonHref = esc(block.buttonHref || '/contacto');
  if (block.type === 'hero') return `<section class="block hero"${attrs} ${style}><span class="kicker">Soluciones Fabrick</span><h1>${esc(block.title)}</h1><p>${esc(block.text)}</p><a class="btn" href="${buttonHref}">${buttonText}</a></section>`;
  if (block.type === 'cards') {
    const parts = block.text.split('|').map((v) => v.trim()).filter(Boolean);
    return `<section class="block"${attrs} ${style}><span class="kicker">Beneficios</span><h2>${esc(block.title)}</h2><div class="cards-grid">${parts.map((p, i) => `<article class="card"><b>0${i + 1}</b><h3>${esc(p)}</h3><p>Bloque editable desde el admin.</p></article>`).join('')}</div></section>`;
  }
  if (block.type === 'split') return `<section class="block"${attrs} ${style}><div class="split-grid"><div><span class="kicker">Estrategia</span><h2>${esc(block.title)}</h2><p>${esc(block.text)}</p></div>${block.image ? `<img src="${esc(block.image)}" alt="" loading="lazy" />` : ''}</div></section>`;
  if (block.type === 'calculator') return `<section class="block"${attrs} ${style}><span class="kicker">Motores conectados</span><h2>${esc(block.title)}</h2><p>${esc(block.text)}</p><div class="calc-grid"><a href="/admin/motores/radier"><strong>Radier 3D</strong><span>Cubicación + presupuesto</span></a><a href="/admin/motores/aire-acondicionado"><strong>Aire acondicionado</strong><span>BTU + equipo + instalación</span></a></div></section>`;
  if (block.type === 'cta') return `<section class="block center"${attrs} ${style}><h2>${esc(block.title)}</h2><p>${esc(block.text)}</p><a class="btn" href="${buttonHref}">${buttonText}</a></section>`;
  return `<section class="block"${attrs} ${style}>${block.html || ''}</section>`;
}

function finalHtml(state: PageState) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.title)}</title>${css()}</head><body>${state.blocks.map((b) => renderBlock(b)).join('')}</body></html>`;
}

export default function FabrickPageEngine21stClient() {
  const start = useMemo(() => initialState(), []);
  const [state, setState] = useState<PageState>(start);
  const [selectedId, setSelectedId] = useState(start.blocks[0]?.id || '');
  const [expiresHours, setExpiresHours] = useState(168);
  const [publicUrl, setPublicUrl] = useState('');
  const [status, setStatus] = useState('');
  const [jsonText, setJsonText] = useState(() => JSON.stringify(start, null, 2));
  const [jsonState, setJsonState] = useState<JsonState>('idle');
  const [jsonMessage, setJsonMessage] = useState('Pega JSON o sube un archivo para actualizar la vista previa.');
  const [saving, setSaving] = useState(false);
  const [docs, setDocs] = useState<PageDoc[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const selected = state.blocks.find((b) => b.id === selectedId) || state.blocks[0];
  const html = useMemo(() => finalHtml(state), [state]);
  const pageWidth = state.device === 'phone' ? 'max-w-[390px]' : state.device === 'tablet' ? 'max-w-[780px]' : state.device === 'wide' ? 'max-w-[1440px]' : 'max-w-[1180px]';

  function save(next: PageState) {
    const clean = normalizePage(next);
    setState(clean);
    setJsonText(JSON.stringify(clean, null, 2));
    try { window.localStorage.setItem(STORAGE, JSON.stringify(clean)); } catch {}
  }

  function patch(id: string, part: Partial<Block>) { save({ ...state, blocks: state.blocks.map((b) => b.id === id ? { ...b, ...part } : b) }); }
  function add(type: BlockType) { const block = makeBlock(type); save({ ...state, blocks: [...state.blocks, block] }); setSelectedId(block.id); }
  function remove(id: string) { const blocks = state.blocks.filter((b) => b.id !== id); save({ ...state, blocks }); setSelectedId(blocks[0]?.id || ''); }
  function move(id: string, dir: -1 | 1) { const idx = state.blocks.findIndex((b) => b.id === id); const target = idx + dir; if (idx < 0 || target < 0 || target >= state.blocks.length) return; const blocks = [...state.blocks]; [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]]; save({ ...state, blocks }); }

  function validateJson(value = jsonText) { const result = parseJson(value); setJsonState(result.ok ? 'valid' : 'invalid'); setJsonMessage(result.message); return result; }
  function applyJson() { const result = validateJson(jsonText); if (!result.ok) return; save(result.page); setSelectedId(result.page.blocks[0]?.id || ''); setJsonState('applied'); setJsonMessage('JSON aplicado. La vista previa ya está actualizada.'); }
  function pasteJson() { navigator.clipboard?.readText().then((value) => { setJsonText(value); const result = parseJson(value); setJsonState(result.ok ? 'valid' : 'invalid'); setJsonMessage(result.message); if (result.ok) { save(result.page); setSelectedId(result.page.blocks[0]?.id || ''); setJsonState('applied'); setJsonMessage('JSON pegado, validado y aplicado.'); } }).catch(() => setJsonMessage('No pude leer el portapapeles. Pega el JSON manualmente.')); }

  async function readFile(file: File) {
    setStatus(`Leyendo ${file.name}…`);
    const content = await file.text();
    if (file.name.toLowerCase().endsWith('.json')) {
      setJsonText(content);
      const result = parseJson(content);
      setJsonState(result.ok ? 'valid' : 'invalid');
      setJsonMessage(result.message);
      if (result.ok) { save(result.page); setSelectedId(result.page.blocks[0]?.id || ''); setJsonState('applied'); setStatus('Archivo JSON aplicado.'); }
      else setStatus('El archivo JSON tiene errores.');
      return;
    }
    const next = htmlToPage(content);
    save(next);
    setSelectedId(next.blocks[0]?.id || '');
    setJsonState('applied');
    setJsonMessage('HTML importado como bloque personalizado.');
    setStatus('Archivo HTML importado.');
  }

  async function loadDocs(showStatus = true) {
    setLoadingDocs(true);
    if (showStatus) setStatus('Cargando páginas guardadas…');
    try {
      const res = await fetch('/api/admin/page-engine', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setDocs(json.documents || []);
      if (showStatus) setStatus('Páginas guardadas cargadas.');
    } catch (err) { setStatus(`Error cargando páginas: ${(err as Error).message}`); }
    finally { setLoadingDocs(false); }
  }

  async function publish() {
    if (!state.title.trim()) { setStatus('Error: el título es obligatorio.'); return; }
    if (!state.blocks.length) { setStatus('Error: agrega al menos un bloque.'); return; }
    setSaving(true);
    setStatus('Guardando página en BD…');
    try {
      const res = await fetch('/api/admin/page-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: state.token, title: state.title, html, project_json: state, expires_in_hours: expiresHours, status: 'publicado' }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      save({ ...state, token: json.token });
      setPublicUrl(json.public_url || '');
      setStatus('Página publicada y guardada correctamente.');
      await loadDocs(false);
    } catch (err) { setStatus(`Error: ${(err as Error).message}`); }
    finally { setSaving(false); }
  }

  function template() {
    const next = normalizePage({ title: 'Landing de servicio Fabrick', blocks: [{ type: 'hero', title: 'Transforma tu idea en una propuesta lista para vender', text: 'Página comercial con diseño premium, CTA y link privado.', background: '#0d0a06', textColor: '#fff7e8', accent: '#f59e0b', buttonText: 'Cotizar ahora', buttonHref: '/contacto' }, { type: 'cards', title: 'Por qué funciona', text: 'Diseño rápido | Presupuesto conectado | Seguimiento comercial', background: '#fff7e9', textColor: '#17120a', accent: '#f59e0b' }, { type: 'cta', title: 'Activa tu propuesta hoy', text: 'Comparte una URL privada con vencimiento y seguimiento.', background: '#f59e0b', textColor: '#17120a', accent: '#111111', buttonText: 'Hablar ahora', buttonHref: '/contacto' }] });
    save(next); setSelectedId(next.blocks[0]?.id || ''); setJsonState('applied'); setJsonMessage('Plantilla comercial aplicada.');
  }

  return <main className="grid h-screen min-h-[760px] grid-cols-1 overflow-hidden bg-[#070503] text-white lg:grid-cols-[340px_1fr]"><input ref={fileRef} type="file" accept=".json,.html,.htm,application/json,text/html" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); event.currentTarget.value = ''; }} />
    <aside className="min-h-0 overflow-hidden border-r border-yellow-300/15 bg-[#0d0906]/95"><div className="border-b border-yellow-300/15 p-4"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Fabrick Page Engine</p><h1 className="mt-2 text-xl font-black tracking-tight">HTML / JSON Renderer</h1><p className="mt-1 text-xs leading-relaxed text-[#9f8d74]">Editor modular, validación, BD y URL temporal.</p></div><div className="flex gap-2 border-b border-yellow-300/15 p-3">{DEVICES.map((d) => <button key={d} onClick={() => save({ ...state, device: d })} className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-black ${state.device === d ? 'bg-yellow-400 text-black' : 'bg-white/[0.06] text-[#9f8d74]'}`}>{d}</button>)}</div><div className="grid gap-3 border-b border-yellow-300/15 p-3"><input value={state.title} onChange={(e) => save({ ...state, title: e.target.value })} placeholder="Título de la página" className="rounded-2xl border border-yellow-300/15 bg-black/40 px-3 py-3 text-sm outline-none focus:border-yellow-300" /><div className="grid grid-cols-2 gap-2"><button onClick={() => fileRef.current?.click()} className="rounded-2xl border border-yellow-300/20 bg-yellow-400/[0.08] px-3 py-3 text-xs font-black text-yellow-100">Subir JSON/HTML</button><button onClick={pasteJson} className="rounded-2xl border border-yellow-300/20 bg-yellow-400/[0.08] px-3 py-3 text-xs font-black text-yellow-100">Pegar JSON</button><button onClick={template} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-xs font-black">Plantilla</button><button onClick={() => void loadDocs()} className="rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-3 text-xs font-black">{loadingDocs ? 'Cargando…' : 'Guardadas'}</button></div></div><div className="grid gap-2 px-3 py-3">{TYPES.map((type) => <button key={type} onClick={() => add(type)} className="rounded-2xl border border-dashed border-yellow-300/30 bg-yellow-400/[0.07] p-3 text-left"><strong className="block text-sm text-white">+ {type}</strong><span className="text-xs text-[#9f8d74]">Agregar módulo</span></button>)}</div><div className="min-h-0 overflow-auto border-t border-yellow-300/15 p-3">{state.blocks.map((block, i) => <div key={block.id} className={`mb-2 grid grid-cols-[1fr_auto] gap-2 rounded-2xl border p-3 ${selectedId === block.id ? 'border-yellow-300/70 bg-yellow-400/10' : 'border-white/10 bg-white/[0.04]'}`}><button onClick={() => setSelectedId(block.id)} className="min-w-0 text-left"><strong className="block truncate text-sm">{i + 1}. {block.type}</strong><span className="text-xs text-[#9f8d74]">{block.title}</span></button><div className="flex gap-1"><button onClick={() => move(block.id, -1)} className="rounded-lg bg-white/10 px-2 text-xs">↑</button><button onClick={() => move(block.id, 1)} className="rounded-lg bg-white/10 px-2 text-xs">↓</button></div></div>)}</div></aside>
    <section className="grid min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[1fr_420px]"><div className="min-h-0 overflow-auto bg-[radial-gradient(circle_at_10%_0%,rgba(250,204,21,.12),transparent_24rem),linear-gradient(rgba(255,255,255,.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.026)_1px,transparent_1px)] bg-[length:auto,48px_48px,48px_48px] p-3 lg:p-6"><div className={`mx-auto overflow-hidden rounded-[2rem] bg-white text-black shadow-[0_24px_80px_rgba(0,0,0,.55)] transition-all ${pageWidth}`}><div dangerouslySetInnerHTML={{ __html: state.blocks.map((b) => renderBlock(b, true)).join('') }} onClick={(event) => { const target = (event.target as HTMLElement).closest('[data-id]') as HTMLElement | null; if (target?.dataset.id) setSelectedId(target.dataset.id); }} /></div></div><aside className="min-h-0 overflow-auto border-l border-yellow-300/15 bg-[#0d0906] p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Inspector</p><h2 className="mt-1 text-lg font-black">{selected?.type || 'Sin selección'}</h2>{selected && <div className="mt-4 grid gap-3"><Edit label="Título" value={selected.title} onChange={(v) => patch(selected.id, { title: v })} /><Area label="Texto" value={selected.text} onChange={(v) => patch(selected.id, { text: v })} />{selected.type === 'custom' && <Area label="HTML" value={selected.html || ''} onChange={(v) => patch(selected.id, { html: v })} />}<Edit label="Imagen / URL" value={selected.image || ''} onChange={(v) => patch(selected.id, { image: v })} /><Edit label="Texto botón" value={selected.buttonText || ''} onChange={(v) => patch(selected.id, { buttonText: v })} /><Edit label="URL botón" value={selected.buttonHref || ''} onChange={(v) => patch(selected.id, { buttonHref: v })} /><Color label="Fondo" value={selected.background} onChange={(v) => patch(selected.id, { background: v })} /><Color label="Texto" value={selected.textColor} onChange={(v) => patch(selected.id, { textColor: v })} /><Color label="Accent" value={selected.accent} onChange={(v) => patch(selected.id, { accent: v })} /><button onClick={() => remove(selected.id)} className="rounded-2xl bg-red-400/10 px-4 py-3 text-sm font-black text-red-300">Borrar bloque</button></div>}<div className="mt-6 grid gap-3 rounded-[1.5rem] border border-yellow-300/15 bg-white/[0.045] p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Carga JSON / HTML</p><textarea value={jsonText} onChange={(e) => { setJsonText(e.target.value); setJsonState('idle'); }} rows={8} className="rounded-2xl border border-yellow-300/15 bg-black/40 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-yellow-300" /><div className="grid grid-cols-2 gap-2"><button onClick={() => validateJson()} className="rounded-2xl border border-yellow-300/20 bg-white/10 px-4 py-3 text-xs font-black">Validar JSON</button><button onClick={applyJson} className="rounded-2xl bg-yellow-400 px-4 py-3 text-xs font-black text-black">Aplicar JSON</button></div><p className={`rounded-2xl border px-3 py-2 text-xs ${jsonState === 'invalid' ? 'border-red-400/30 bg-red-400/10 text-red-200' : jsonState === 'applied' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200' : jsonState === 'valid' ? 'border-yellow-300/30 bg-yellow-300/10 text-yellow-100' : 'border-white/10 bg-black/20 text-[#9f8d74]'}`}>{jsonMessage}</p></div><div className="mt-6 grid gap-3 rounded-[1.5rem] border border-yellow-300/15 bg-white/[0.045] p-4"><label className="grid gap-1 text-xs font-black uppercase tracking-widest text-[#9f8d74]">Vence en horas<input type="number" value={expiresHours} onChange={(e) => setExpiresHours(Number(e.target.value) || 24)} className="rounded-2xl border border-yellow-300/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-300" /></label><button onClick={publish} disabled={saving} className="rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar BD + publicar'}</button><button onClick={() => navigator.clipboard.writeText(html).then(() => setStatus('HTML copiado.'))} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black">Copiar HTML</button>{publicUrl && <a className="break-all text-sm text-yellow-300 underline" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>}{status && <p className="text-sm text-zinc-300">{status}</p>}</div>{docs.length > 0 && <div className="mt-6 grid gap-2 rounded-[1.5rem] border border-yellow-300/15 bg-white/[0.045] p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Páginas recientes</p>{docs.slice(0, 6).map((doc) => <a key={doc.token} href={`/w/${doc.token}`} target="_blank" rel="noreferrer" className="rounded-2xl border border-white/10 bg-black/25 p-3 text-xs hover:border-yellow-300/40"><b className="block text-white">{doc.title}</b><span className="text-[#9f8d74]">/{doc.token} · {doc.status}</span></a>)}</div>}</aside></section>
  </main>;
}

function Edit({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-widest text-[#9f8d74]">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-yellow-300/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-300" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-widest text-[#9f8d74]">{label}<textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} className="rounded-2xl border border-yellow-300/15 bg-black/40 px-3 py-2.5 text-xs text-white outline-none focus:border-yellow-300" /></label>; }
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-widest text-[#9f8d74]">{label}<input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-2xl border border-yellow-300/15 bg-black/40 p-1" /></label>; }
