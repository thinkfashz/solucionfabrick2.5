'use client';

import { useMemo, useRef, useState } from 'react';
import { Bell, Code2, Database, Eye, Facebook, FileUp, Instagram, Mail, Menu, Monitor, Moon, Phone, Search, Send, Share2, Smartphone, Sparkles, Tablet, UploadCloud } from 'lucide-react';
import { transformHtmlToPremiumPage } from './premiumHtmlTransformer';
import { buildNicheTemplate } from './premiumNicheTemplates';

type Device = 'phone' | 'tablet' | 'desktop' | 'wide';
type Preset = 'editorial-dark' | 'fabrick-lava' | 'glass-rose' | 'luxury-soft' | 'mobile-app-premium' | 'booking-beauty' | 'neo-minimal';
type Block = { type: string; title: string; text: string; image?: string; buttonText?: string; buttonHref?: string; html?: string };
type PageState = { title: string; token?: string; device: Device; visualPreset: Preset; blocks: Block[] };

const devices: Record<Device, { label: string; icon: typeof Smartphone; frame: string }> = {
  phone: { label: 'Phone', icon: Smartphone, frame: 'mx-auto h-[min(820px,74vh)] w-[min(420px,100%)] rounded-[44px]' },
  tablet: { label: 'Tablet', icon: Tablet, frame: 'mx-auto h-[min(820px,74vh)] w-[min(760px,100%)] rounded-[36px]' },
  desktop: { label: 'Desktop', icon: Monitor, frame: 'mx-auto h-[min(760px,72vh)] w-full rounded-[28px]' },
  wide: { label: 'Wide', icon: Monitor, frame: 'mx-auto h-[min(680px,70vh)] w-full rounded-[24px]' },
};

const presets: Record<Preset, string> = {
  'editorial-dark': 'Golden Night',
  'fabrick-lava': 'Fabrick Lava',
  'glass-rose': 'Glass Rose',
  'luxury-soft': 'Luxury Soft',
  'mobile-app-premium': 'Mobile App Premium',
  'booking-beauty': 'Booking Beauty',
  'neo-minimal': 'Neo Minimal',
};

function esc(v: unknown) { return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function cleanHtml(v: unknown) { return String(v || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '').replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '').replace(/<embed\b[^>]*>/gi, '').replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '').replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '').replace(/javascript:/gi, ''); }
function preset(v: unknown): Preset { return Object.keys(presets).includes(String(v)) ? String(v) as Preset : 'editorial-dark'; }

function fromTemplate(niche = 'restaurante'): PageState {
  const t = buildNicheTemplate(niche, { title: 'Cafetería Aurora', visualPreset: 'editorial-dark' }) || buildNicheTemplate('restaurante', {})!;
  return { title: String(t.title || 'Cafetería Aurora'), device: 'phone', visualPreset: preset(t.visualPreset), blocks: [
    { type: 'hero', title: t.hero?.headline || 'Momentos que saben a hogar', text: t.hero?.subtitle || 'Presentación premium para prospectar comercios.', image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80', buttonText: t.hero?.cta || 'Conocer más', buttonHref: t.hero?.href || '/contacto' },
    { type: 'cards', title: 'Beneficios', text: (t.benefits || ['Café de especialidad', 'Repostería artesanal', 'Ambiente acogedor', 'Wi‑Fi y espacios']).join(' | ') },
    { type: 'split', title: 'Nuestra experiencia', text: 'Seleccionamos cada detalle para ofrecer una experiencia única y una propuesta comercial fácil de entender.', image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80' },
    { type: 'cta', title: t.cta?.title || '¿Hablamos de tu negocio?', text: t.cta?.text || 'Cuéntanos tu proyecto y te enviaremos una propuesta personalizada.', buttonText: t.cta?.buttonText || 'Solicitar propuesta', buttonHref: t.cta?.href || '/contacto' },
  ] };
}

function normalize(raw: any): PageState {
  if (raw?.blocks?.length) return { title: raw.title || 'Presentación Fabrick', token: raw.token, device: raw.device || 'phone', visualPreset: preset(raw.visualPreset), blocks: raw.blocks };
  if (raw?.niche || raw?.industry || raw?.rubro || raw?.tipo) return fromTemplate(raw.niche || raw.industry || raw.rubro || raw.tipo);
  return fromTemplate('restaurante');
}

function landingCss() { return `<style>*{box-sizing:border-box}body{margin:0;background:#050403;color:#fff;font-family:Inter,system-ui,sans-serif}a{text-decoration:none;color:inherit}.page{min-height:100vh;background:radial-gradient(circle at 78% 4%,rgba(245,158,11,.18),transparent 24rem),#050403;padding:30px}.hero{min-height:520px;display:grid;align-items:center;border:1px solid rgba(214,168,95,.25);border-radius:34px;padding:46px;background:linear-gradient(135deg,rgba(0,0,0,.74),rgba(0,0,0,.32)),var(--img);background-size:cover;background-position:center}.brand{font-size:12px;font-weight:900;letter-spacing:.42em;color:#d6a85f}.hero h1{font-family:Georgia,serif;font-size:clamp(42px,8vw,82px);line-height:.95;max-width:680px;margin:30px 0 16px}.hero p{max-width:520px;color:#e8dcc8;font-size:18px;line-height:1.65}.btn{display:inline-flex;margin-top:22px;border-radius:999px;background:linear-gradient(135deg,#facc15,#d97706);color:#120a04;padding:14px 20px;font-weight:900}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:-48px 28px 60px;position:relative}.card{border:1px solid rgba(214,168,95,.22);border-radius:24px;background:rgba(30,18,8,.86);backdrop-filter:blur(14px);padding:18px}.card b{color:#d6a85f}.split{display:grid;grid-template-columns:1fr .8fr;gap:26px;align-items:center;margin:0 28px 60px}.split h2,.cta h2{font-family:Georgia,serif;font-size:40px;color:#f8e7c2}.split p,.cta p{line-height:1.7;color:#cbbda7}.split img{width:100%;border-radius:24px;max-height:260px;object-fit:cover}.cta{margin:0 28px;border:1px solid rgba(214,168,95,.24);background:rgba(214,168,95,.10);border-radius:24px;padding:24px;display:flex;justify-content:space-between;gap:18px;align-items:center}@media(max-width:700px){.page{padding:14px}.hero{min-height:560px;padding:28px}.cards{grid-template-columns:repeat(2,1fr);margin:16px 0 46px}.split{grid-template-columns:1fr;margin:0 0 44px}.cta{display:block;margin:0}.hero h1{font-size:44px}}</style>`; }
function blockHtml(b: Block) { if (b.type === 'hero') return `<section class="hero" style="--img:url('${esc(b.image)}')"><div><div class="brand">AURORA</div><h1>${esc(b.title)}</h1><p>${esc(b.text)}</p><a class="btn" href="${esc(b.buttonHref || '#')}">${esc(b.buttonText || 'Conocer más')}</a></div></section>`; if (b.type === 'cards') return `<section class="cards">${b.text.split('|').slice(0,4).map(x => `<article class="card"><b>✦</b><h3>${esc(x.trim())}</h3><p>Valor destacado para tu prospecto.</p></article>`).join('')}</section>`; if (b.type === 'split') return `<section class="split"><div><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p></div>${b.image ? `<img src="${esc(b.image)}" />` : ''}</section>`; if (b.type === 'cta') return `<section class="cta"><div><h2>${esc(b.title)}</h2><p>${esc(b.text)}</p></div><a class="btn" href="${esc(b.buttonHref || '#')}">${esc(b.buttonText || 'Solicitar propuesta')}</a></section>`; return cleanHtml(b.html || ''); }
function html(state: PageState) { return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.title)}</title>${landingCss()}</head><body><main class="page">${state.blocks.map(blockHtml).join('')}</main></body></html>`; }

export default function PremiumPageEngineClient() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<PageState>(() => fromTemplate('restaurante'));
  const [publicUrl, setPublicUrl] = useState('');
  const [status, setStatus] = useState('Listo para prospectar comercios.');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('Te comparto una presentación premium preparada por Soluciones Fabrick.');
  const [sending, setSending] = useState(false);
  const pageHtml = useMemo(() => html(state), [state]);
  const frame = devices[state.device];

  async function importFile(file: File) {
    const content = await file.text();
    if (/\.html?$|\.jhtml$/i.test(file.name)) { setState({ ...normalize(transformHtmlToPremiumPage(content)), device: state.device }); setStatus('HTML importado y transformado.'); return; }
    try { setState({ ...normalize(JSON.parse(content)), device: state.device }); setStatus('JSON importado correctamente.'); } catch { setStatus('Archivo inválido. Sube .json, .html o .jhtml.'); }
  }
  async function publish() {
    setStatus('Guardando en BD…');
    const res = await fetch('/api/admin/page-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: state.token, title: state.title, html: pageHtml, project_json: state, expires_in_hours: 168, status: 'publicado' }) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(json.error || 'No se pudo publicar.'); return; }
    setState(s => ({ ...s, token: json.token })); setPublicUrl(json.public_url || ''); setStatus('Guardado en BD y publicado. Link listo.');
  }
  function fullPreview() { const w = window.open('', '_blank'); if (!w) return; w.document.write(pageHtml); w.document.close(); }
  function shareUrl(kind: string) { const url = encodeURIComponent(publicUrl || location.href); const text = encodeURIComponent(`${state.title} — ${message}`); if (kind === 'whatsapp') window.open(`https://wa.me/?text=${text}%20${url}`, '_blank'); if (kind === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank'); if (kind === 'instagram') window.open('https://www.instagram.com/', '_blank'); if (kind === 'phone') location.href = 'tel:'; if (kind === 'direct') navigator.clipboard?.writeText(`${state.title}\n${publicUrl || location.href}`); }
  async function sendEmail() { if (!publicUrl) { setStatus('Publica primero para generar el link.'); return; } setSending(true); const res = await fetch('/api/admin/page-engine/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, title: state.title, url: publicUrl, message }) }); const json = await res.json().catch(() => ({})); setSending(false); setStatus(res.ok ? `Correo enviado con Resend${json.simulated ? ' (simulado)' : ''}.` : json.error || 'No se pudo enviar.'); }

  return <main className="min-h-screen overflow-x-hidden bg-[#050403] text-white"><input ref={fileRef} type="file" hidden accept=".json,.html,.htm,.jhtml" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.currentTarget.value = ''; }} />
    <div className="mx-auto grid w-full max-w-[1740px] gap-4 p-3 sm:p-5 xl:grid-cols-[260px_1fr_320px]">
      <aside className="hidden rounded-[30px] border border-amber-300/15 bg-black/45 p-3 shadow-[0_30px_100px_rgba(0,0,0,.6)] backdrop-blur-2xl xl:block"><div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/[.04] p-3"><Sparkles className="text-amber-300"/><b>Soluciones Fabrick</b></div>{['Editor modular','Proyectos','Plantillas','Componentes','Medios','Animaciones','Datos','Ajustes'].map((x,i)=><button key={x} className={`mb-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-bold ${i===0?'border-amber-300/35 bg-amber-400/15 text-amber-100':'border-white/10 bg-white/[.035] text-white/70'}`}><Code2 className="h-4 w-4 text-amber-300"/>{x}</button>)}</aside>
      <section className="min-w-0 rounded-[32px] border border-amber-300/15 bg-[linear-gradient(180deg,rgba(10,9,8,.82),rgba(3,3,3,.97))] p-3 shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:p-5"><header className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><button className="rounded-2xl border border-white/10 bg-white/[.04] p-3"><Menu className="h-5 w-5"/></button><b className="text-amber-100">Centro de control</b></div><div className="flex gap-2"><Small icon={Search}/><Small icon={Moon}/><Small icon={Bell}/></div></header>
        <section className="mb-4 rounded-[30px] border border-amber-300/20 bg-[radial-gradient(circle_at_84%_20%,rgba(245,158,11,.24),transparent_20rem),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-5 sm:p-8"><p className="text-[11px] font-black uppercase tracking-[.36em] text-amber-300">Editor modular</p><h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-.06em] sm:text-6xl">Crea presentaciones que venden</h1><p className="mt-3 text-white/62">Presentación premium para prospectar comercios.</p><button onClick={fullPreview} className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100"><Eye className="h-4 w-4"/>Vista previa completa</button></section>
        <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Panel label="Proyecto"><input value={state.title} onChange={e=>setState({...state,title:e.target.value})} className="mt-2 w-full rounded-2xl border border-amber-300/15 bg-black/45 px-4 py-3 outline-none"/></Panel><Panel label="Preset visual"><select value={state.visualPreset} onChange={e=>setState({...state,visualPreset:e.target.value as Preset})} className="mt-2 w-full rounded-2xl border border-amber-300/15 bg-black/45 px-4 py-3 outline-none">{Object.entries(presets).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></Panel><Panel label="Dispositivo"><div className="mt-2 grid grid-cols-4 gap-2">{Object.entries(devices).map(([k,v])=>{const I=v.icon;return <button key={k} onClick={()=>setState({...state,device:k as Device})} className={`rounded-2xl border p-3 ${state.device===k?'border-amber-300 bg-amber-400/15':'border-white/10 bg-black/35'}`}><I className="mx-auto h-5 w-5"/></button>})}</div></Panel><Panel label="Estado"><p className="mt-3 text-sm text-emerald-200">● JSON válido</p><p className="text-xs text-white/45">{status}</p></Panel></section>
        <section className="rounded-[30px] border border-amber-300/15 bg-black/35 p-3 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] font-black uppercase tracking-[.32em] text-amber-300">Vista previa — {frame.label}</p><button onClick={fullPreview} className="rounded-2xl border border-amber-300/25 px-4 py-2 text-sm font-black text-amber-100">Pantalla completa</button></div><div className={`${frame.frame} overflow-hidden border border-amber-200/20 bg-black shadow-[0_30px_100px_rgba(0,0,0,.5),0_0_0_10px_rgba(255,255,255,.035)]`}><iframe title="Vista previa" srcDoc={pageHtml} className="h-full w-full border-0 bg-white" /></div></section>
        <footer className="sticky bottom-3 z-20 mt-4 grid gap-3 rounded-[26px] border border-amber-300/15 bg-black/75 p-3 backdrop-blur-xl md:grid-cols-3"><button onClick={publish} className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-4 font-black text-black"><Database/>Guardar BD + publicar</button><button onClick={()=>fileRef.current?.click()} className="flex items-center justify-center gap-3 rounded-2xl border border-amber-300/18 bg-white/[.045] px-5 py-4 font-black"><FileUp className="text-amber-300"/>Importar JSON / HTML</button><button onClick={()=>shareUrl('direct')} className="flex items-center justify-center gap-3 rounded-2xl border border-amber-300/18 bg-white/[.045] px-5 py-4 font-black"><Share2 className="text-amber-300"/>Compartir propuesta</button></footer>{publicUrl && <a href={publicUrl} target="_blank" className="mt-3 block break-all rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">Link público: {publicUrl}</a>}</section>
      <aside className="rounded-[30px] border border-amber-300/15 bg-black/45 p-4 shadow-[0_30px_100px_rgba(0,0,0,.48)] backdrop-blur-2xl"><h3 className="text-[11px] font-black uppercase tracking-[.32em] text-amber-300">Compartir propuesta</h3><input value={to} onChange={e=>setTo(e.target.value)} placeholder="correo@cliente.com" className="mt-4 w-full rounded-2xl border border-amber-300/15 bg-black/45 px-4 py-3 outline-none"/><textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} className="mt-3 w-full rounded-2xl border border-amber-300/15 bg-black/45 px-4 py-3 outline-none"/><Share icon={Instagram} label="Instagram" onClick={()=>shareUrl('instagram')}/><Share icon={Phone} label="WhatsApp" onClick={()=>shareUrl('whatsapp')}/><Share icon={Facebook} label="Facebook" onClick={()=>shareUrl('facebook')}/><Share icon={Phone} label="Teléfono" onClick={()=>shareUrl('phone')}/><Share icon={Send} label="Mensaje directo" onClick={()=>shareUrl('direct')}/><button onClick={sendEmail} disabled={sending} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-left text-sm font-bold text-emerald-100"><span className="flex items-center gap-3"><Mail/>Correo electrónico</span><span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px]">Resend</span></button><p className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">Resend API conectado. Los correos se envían desde tu plataforma.</p></aside>
    </div></main>;
}
function Small({icon:Icon}:{icon:typeof Search}){return <button className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><Icon className="h-4 w-4"/></button>}
function Panel({label,children}:{label:string;children:React.ReactNode}){return <div className="rounded-[24px] border border-amber-300/15 bg-black/35 p-4"><p className="text-[10px] font-black uppercase tracking-[.26em] text-amber-300">{label}</p>{children}</div>}
function Share({icon:Icon,label,onClick}:{icon:typeof Instagram;label:string;onClick:()=>void}){return <button onClick={onClick} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-left text-sm text-white/80 hover:border-amber-300/25 hover:bg-amber-400/10"><span className="flex items-center gap-3"><Icon className="h-4 w-4 text-amber-300"/>{label}</span><span>›</span></button>}
