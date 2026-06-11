'use client';

import { useMemo, useState } from 'react';

type Device = 'phone' | 'tablet' | 'desktop' | 'wide';
type BlockType = 'hero' | 'cards' | 'split' | 'cta' | 'calculator' | 'custom';

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
};

type PageState = { title: string; token?: string; device: Device; blocks: Block[] };

const STORAGE = 'sf_page_engine_21stdev_v7';

function uid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function esc(value: unknown) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function makeBlock(type: BlockType): Block {
  const base: Block = { id: uid(), type, title: 'Nuevo bloque Fabrick', text: 'Edita este contenido desde el inspector.', background: '#0d0a06', textColor: '#fff7e8', accent: '#f59e0b' };
  if (type === 'hero') return { ...base, title: 'Landing comercial creada con motor 21st.dev', text: 'Presenta tu oferta, conecta presupuestos y comparte una URL privada con vencimiento.' };
  if (type === 'cards') return { ...base, title: 'Beneficios', text: 'Diseño rápido | Presupuesto conectado | Seguimiento comercial', background: '#fff7e9', textColor: '#17120a' };
  if (type === 'split') return { ...base, title: 'Convierte visitas en clientes', text: 'Combina página, propuesta y automatización para vender más rápido.', image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80' };
  if (type === 'calculator') return { ...base, title: 'Calculadoras conectadas', text: 'Abre el motor de radier o aire acondicionado y genera presupuesto automático.' };
  if (type === 'cta') return { ...base, title: '¿Listo para cotizar?', text: 'Activa el motor y comparte un link con vencimiento.', background: '#f59e0b', textColor: '#17120a' };
  return { ...base, title: 'HTML personalizado', text: '', background: '#ffffff', textColor: '#111111', html: '<section><h2>Bloque personalizado</h2><p>Edita este HTML.</p></section>' };
}

function initialState(): PageState {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(STORAGE);
      if (saved) return JSON.parse(saved) as PageState;
    } catch {}
  }
  return { title: 'Landing Fabrick', device: 'desktop', blocks: [makeBlock('hero'), makeBlock('cards'), makeBlock('split'), makeBlock('calculator'), makeBlock('cta')] };
}

function css() {
  return `<style>*{box-sizing:border-box}body{margin:0;background:#050505;color:#fff;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{text-decoration:none}.block{padding:68px 42px}.kicker{display:inline-flex;border:1px solid rgba(255,190,56,.38);background:rgba(255,190,56,.12);color:#ffd777;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:1000;letter-spacing:.2em;text-transform:uppercase}h1,h2{font-size:clamp(36px,6vw,76px);line-height:.96;letter-spacing:-.06em;margin:18px 0 14px}p{font-size:18px;line-height:1.65;max-width:780px}.btn{display:inline-flex;margin-top:24px;border-radius:18px;background:var(--accent,#f59e0b);color:#111;padding:15px 20px;font-weight:1000}.cards-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{border:1px solid rgba(0,0,0,.08);border-radius:26px;background:#fff;padding:24px;box-shadow:0 16px 35px rgba(20,10,0,.08)}.split-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:26px;align-items:center}.split-grid img{width:100%;border-radius:28px;min-height:280px;object-fit:cover}.calc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:24px}.calc-grid a{border:1px solid rgba(255,255,255,.14);border-radius:24px;padding:22px;background:rgba(255,255,255,.08);color:currentColor}.calc-grid strong{display:block;font-size:24px}.center{text-align:center}.center p{margin-inline:auto}@media(max-width:720px){.block{padding:42px 22px!important}.cards-grid,.split-grid,.calc-grid{grid-template-columns:1fr}h1,h2{font-size:38px!important}}</style>`;
}

function renderBlock(block: Block, live = false) {
  const style = `style="background:${esc(block.background)};color:${esc(block.textColor)};--accent:${esc(block.accent)}"`;
  const attrs = live ? ` data-id="${block.id}"` : '';
  if (block.type === 'hero') return `<section class="block hero"${attrs} ${style}><span class="kicker">Soluciones Fabrick</span><h1>${esc(block.title)}</h1><p>${esc(block.text)}</p><a class="btn" href="/contacto">Solicitar presupuesto</a></section>`;
  if (block.type === 'cards') {
    const parts = block.text.split('|').map((v) => v.trim()).filter(Boolean);
    return `<section class="block"${attrs} ${style}><span class="kicker">Beneficios</span><h2>${esc(block.title)}</h2><div class="cards-grid">${parts.map((p, i) => `<article class="card"><b>0${i + 1}</b><h3>${esc(p)}</h3><p>Bloque editable desde el admin.</p></article>`).join('')}</div></section>`;
  }
  if (block.type === 'split') return `<section class="block"${attrs} ${style}><div class="split-grid"><div><span class="kicker">Estrategia</span><h2>${esc(block.title)}</h2><p>${esc(block.text)}</p></div><img src="${esc(block.image)}" alt="" loading="lazy" /></div></section>`;
  if (block.type === 'calculator') return `<section class="block"${attrs} ${style}><span class="kicker">Motores conectados</span><h2>${esc(block.title)}</h2><p>${esc(block.text)}</p><div class="calc-grid"><a href="/admin/motores/radier"><strong>Radier 3D</strong><span>Cubicación + presupuesto</span></a><a href="/admin/motores/aire-acondicionado"><strong>Aire acondicionado</strong><span>BTU + equipo + instalación</span></a></div></section>`;
  if (block.type === 'cta') return `<section class="block center"${attrs} ${style}><h2>${esc(block.title)}</h2><p>${esc(block.text)}</p><a class="btn" href="/admin/presupuestos">Abrir presupuestos</a></section>`;
  return `<section class="block"${attrs} ${style}>${block.html || ''}</section>`;
}

function finalHtml(state: PageState) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.title)}</title>${css()}</head><body>${state.blocks.map((b) => renderBlock(b)).join('')}</body></html>`;
}

export default function FabrickPageEngine21stClient() {
  const [state, setState] = useState<PageState>(initialState);
  const [selectedId, setSelectedId] = useState(state.blocks[0]?.id || '');
  const [expiresHours, setExpiresHours] = useState(168);
  const [publicUrl, setPublicUrl] = useState('');
  const [status, setStatus] = useState('');
  const selected = state.blocks.find((b) => b.id === selectedId) || state.blocks[0];
  const html = useMemo(() => finalHtml(state), [state]);
  const pageWidth = state.device === 'phone' ? 'max-w-[390px]' : state.device === 'tablet' ? 'max-w-[780px]' : state.device === 'wide' ? 'max-w-[1440px]' : 'max-w-[1180px]';

  function save(next: PageState) {
    setState(next);
    window.localStorage.setItem(STORAGE, JSON.stringify(next));
  }

  function patch(id: string, part: Partial<Block>) {
    save({ ...state, blocks: state.blocks.map((b) => b.id === id ? { ...b, ...part } : b) });
  }

  function add(type: BlockType) {
    const block = makeBlock(type);
    save({ ...state, blocks: [...state.blocks, block] });
    setSelectedId(block.id);
  }

  function remove(id: string) {
    const blocks = state.blocks.filter((b) => b.id !== id);
    save({ ...state, blocks });
    setSelectedId(blocks[0]?.id || '');
  }

  function move(id: string, dir: -1 | 1) {
    const idx = state.blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= state.blocks.length) return;
    const blocks = [...state.blocks];
    [blocks[idx], blocks[target]] = [blocks[target], blocks[idx]];
    save({ ...state, blocks });
  }

  async function publish() {
    setStatus('Guardando página…');
    try {
      const res = await fetch('/api/admin/page-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: state.token, title: state.title, html, project_json: state, expires_in_hours: expiresHours, status: 'publicado' }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      save({ ...state, token: json.token });
      setPublicUrl(json.public_url || '');
      setStatus('Página publicada.');
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    }
  }

  return (
    <main className="grid h-screen min-h-[720px] grid-cols-1 overflow-hidden bg-[#050505] text-white lg:grid-cols-[300px_1fr]">
      <aside className="min-h-0 overflow-hidden border-r border-white/10 bg-zinc-950/95">
        <div className="border-b border-white/10 p-4"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">21st.dev inspired</p><h1 className="mt-2 text-xl font-black tracking-tight">Fabrick Page Engine</h1><p className="mt-1 text-xs leading-relaxed text-zinc-500">Editor modular, responsive, BD y URL temporal.</p></div>
        <div className="flex gap-2 border-b border-white/10 p-3">{(['phone','tablet','desktop','wide'] as Device[]).map((d) => <button key={d} onClick={() => save({ ...state, device: d })} className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-black ${state.device === d ? 'bg-amber-400 text-black' : 'bg-white/[0.06] text-zinc-400'}`}>{d}</button>)}</div>
        <div className="grid gap-3 p-3"><input value={state.title} onChange={(e) => save({ ...state, title: e.target.value })} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-amber-300" /></div>
        <div className="grid gap-2 px-3 pb-3">{(['hero','cards','split','calculator','cta','custom'] as BlockType[]).map((type) => <button key={type} onClick={() => add(type)} className="rounded-2xl border border-dashed border-amber-300/30 bg-amber-400/[0.07] p-3 text-left"><strong className="block text-sm text-white">+ {type}</strong><span className="text-xs text-zinc-500">Agregar módulo</span></button>)}</div>
        <div className="min-h-0 overflow-auto border-t border-white/10 p-3">{state.blocks.map((block, i) => <div key={block.id} className={`mb-2 grid grid-cols-[1fr_auto] gap-2 rounded-2xl border p-3 ${selectedId === block.id ? 'border-amber-300/70 bg-amber-400/10' : 'border-white/10 bg-white/[0.04]'}`}><button onClick={() => setSelectedId(block.id)} className="min-w-0 text-left"><strong className="block truncate text-sm">{i + 1}. {block.type}</strong><span className="text-xs text-zinc-500">{block.title}</span></button><div className="flex gap-1"><button onClick={() => move(block.id, -1)} className="rounded-lg bg-white/10 px-2 text-xs">↑</button><button onClick={() => move(block.id, 1)} className="rounded-lg bg-white/10 px-2 text-xs">↓</button></div></div>)}</div>
      </aside>
      <section className="grid min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[1fr_380px]">
        <div className="min-h-0 overflow-auto bg-[linear-gradient(rgba(255,255,255,.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.026)_1px,transparent_1px)] bg-[length:48px_48px] p-3 lg:p-6"><div className={`mx-auto overflow-hidden rounded-[2rem] bg-white text-black shadow-[0_24px_80px_rgba(0,0,0,.55)] transition-all ${pageWidth}`}><div dangerouslySetInnerHTML={{ __html: state.blocks.map((b) => renderBlock(b, true)).join('') }} onClick={(event) => { const target = (event.target as HTMLElement).closest('[data-id]') as HTMLElement | null; if (target?.dataset.id) setSelectedId(target.dataset.id); }} /></div></div>
        <aside className="min-h-0 overflow-auto border-l border-white/10 bg-zinc-950 p-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">Inspector</p><h2 className="mt-1 text-lg font-black">{selected?.type || 'Sin selección'}</h2>{selected && <div className="mt-4 grid gap-3"><Edit label="Título" value={selected.title} onChange={(v) => patch(selected.id, { title: v })} /><Area label="Texto" value={selected.text} onChange={(v) => patch(selected.id, { text: v })} />{selected.type === 'custom' && <Area label="HTML" value={selected.html || ''} onChange={(v) => patch(selected.id, { html: v })} />}<Color label="Fondo" value={selected.background} onChange={(v) => patch(selected.id, { background: v })} /><Color label="Texto" value={selected.textColor} onChange={(v) => patch(selected.id, { textColor: v })} /><Color label="Accent" value={selected.accent} onChange={(v) => patch(selected.id, { accent: v })} /><button onClick={() => remove(selected.id)} className="rounded-2xl bg-red-400/10 px-4 py-3 text-sm font-black text-red-300">Borrar bloque</button></div>}<div className="mt-6 grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4"><label className="grid gap-1 text-xs font-black uppercase tracking-widest text-zinc-500">Vence en horas<input type="number" value={expiresHours} onChange={(e) => setExpiresHours(Number(e.target.value) || 24)} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300" /></label><button onClick={publish} className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-black">Guardar BD + publicar</button><button onClick={() => navigator.clipboard.writeText(html).then(() => setStatus('HTML copiado.'))} className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black">Copiar HTML</button>{publicUrl && <a className="break-all text-sm text-amber-300 underline" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>}{status && <p className="text-sm text-zinc-300">{status}</p>}</div></aside>
      </section>
    </main>
  );
}

function Edit({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-widest text-zinc-500">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300" /></label>; }
function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-widest text-zinc-500">{label}<textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-300" /></label>; }
function Color({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="grid gap-1 text-xs font-black uppercase tracking-widest text-zinc-500">{label}<input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-11 rounded-2xl border border-white/10 bg-black/40 p-1" /></label>; }
