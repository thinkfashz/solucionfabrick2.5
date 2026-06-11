'use client';

import { useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { Bell, Code2, Database, Eye, Facebook, FileUp, Instagram, Mail, Menu, Monitor, Moon, Phone, Search, Send, Share2, Smartphone, Sparkles, Tablet, Wand2 } from 'lucide-react';
import { transformHtmlToPremiumPage } from './premiumHtmlTransformer';
import { buildNicheTemplate } from './premiumNicheTemplates';

type Device = 'phone' | 'tablet' | 'desktop' | 'wide';
type Preset = 'editorial-dark' | 'fabrick-lava' | 'glass-rose' | 'luxury-soft' | 'mobile-app-premium' | 'booking-beauty' | 'neo-minimal';
type Icon = ComponentType<{ className?: string }>;

type Theme = {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  glow: string;
  fontHeading: string;
  fontBody: string;
  animatedBackground: boolean;
};

type ClientData = {
  name: string;
  brand: string;
  account: string;
  phone: string;
  email: string;
  location: string;
  followers: string;
  avatar?: string;
};

type Social = { platform: string; handle: string; url?: string; followers?: string };
type Metric = { value: string; label: string };
type Plan = { name: string; price: string; features: string[] };
type Module = { id: string; type: string; title: string; text: string; items?: string[]; image?: string; cta?: string; href?: string; html?: string };
type SavedTemplate = { id: string; title: string; brand: string; updatedAt: string; data: PageState };

type PageState = {
  title: string;
  token?: string;
  device: Device;
  visualPreset: Preset;
  client: ClientData;
  theme: Theme;
  socials: Social[];
  metrics: Metric[];
  pricing: Plan[];
  modules: Module[];
};

const SAVED_KEY = 'sf_page_engine_saved_templates_v2';
const icons = { phone: Smartphone, tablet: Tablet, desktop: Monitor, wide: Monitor } satisfies Record<Device, Icon>;
const frames: Record<Device, string> = {
  phone: 'mx-auto h-[min(860px,76vh)] w-[min(430px,100%)] rounded-[44px]',
  tablet: 'mx-auto h-[min(840px,76vh)] w-[min(760px,100%)] rounded-[36px]',
  desktop: 'mx-auto h-[min(760px,74vh)] w-full rounded-[28px]',
  wide: 'mx-auto h-[min(700px,72vh)] w-full rounded-[24px]',
};
const presetLabels: Record<Preset, string> = {
  'editorial-dark': 'Golden Night',
  'fabrick-lava': 'Fabrick Lava',
  'glass-rose': 'Glass Rose',
  'luxury-soft': 'Luxury Soft',
  'mobile-app-premium': 'Mobile App Premium',
  'booking-beauty': 'Booking Beauty',
  'neo-minimal': 'Neo Minimal',
};

function uid() { return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function obj(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : typeof value === 'number' ? String(value) : fallback; }
function arr<T = unknown>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }
function esc(v: unknown) { return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function cleanHtml(v: unknown) { return String(v || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '').replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '').replace(/<embed\b[^>]*>/gi, '').replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '').replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '').replace(/javascript:/gi, ''); }
function color(value: unknown, fallback: string) { const s = text(value); return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : fallback; }
function preset(value: unknown): Preset { return Object.keys(presetLabels).includes(String(value)) ? String(value) as Preset : 'editorial-dark'; }

function defaultTheme(raw: Record<string, unknown> = {}): Theme {
  const theme = { ...obj(raw.theme), ...obj(obj(raw.brand).theme), ...obj(obj(raw.brand).colors), ...obj(raw.colors) };
  const p = color(theme.primary ?? theme.accent ?? theme.brand ?? '#d6a85f', '#d6a85f');
  const bg = color(theme.background ?? theme.bg ?? '#050403', '#050403');
  return {
    primary: p,
    secondary: color(theme.secondary ?? '#f59e0b', '#f59e0b'),
    background: bg,
    surface: color(theme.surface ?? '#120d08', '#120d08'),
    text: color(theme.text ?? '#fff7e8', '#fff7e8'),
    muted: color(theme.muted ?? '#c9b58f', '#c9b58f'),
    glow: color(theme.glow ?? p, p),
    fontHeading: text(theme.fontHeading ?? theme.headingFont, 'Georgia, serif'),
    fontBody: text(theme.fontBody ?? theme.bodyFont, 'Inter, system-ui, sans-serif'),
    animatedBackground: theme.animatedBackground !== false,
  };
}

function clientFrom(raw: Record<string, unknown>): ClientData {
  const c = { ...obj(raw.client), ...obj(raw.prospect), ...obj(raw.account), ...obj(raw.brand) };
  const socials = arr<Record<string, unknown>>(raw.socials ?? c.socials);
  const primarySocial = socials[0] || {};
  return {
    name: text(c.name ?? c.owner ?? raw.name, 'Cliente prospecto'),
    brand: text(c.brand ?? c.business ?? c.title ?? raw.title, 'Marca prospecto'),
    account: text(c.account ?? c.username ?? c.handle ?? primarySocial.handle, '@marca'),
    phone: text(c.phone ?? c.whatsapp ?? c.mobile ?? raw.phone, ''),
    email: text(c.email ?? raw.email, ''),
    location: text(c.location ?? c.city ?? raw.location, 'Chile'),
    followers: text(c.followers ?? primarySocial.followers ?? raw.followers, '0'),
    avatar: text(c.avatar ?? c.logo ?? c.image, ''),
  };
}

function socialsFrom(raw: Record<string, unknown>, client: ClientData): Social[] {
  const s = arr<Record<string, unknown>>(raw.socials ?? raw.networks ?? obj(raw.client).socials).map((item) => ({
    platform: text(item.platform ?? item.name, 'Instagram'),
    handle: text(item.handle ?? item.username ?? item.account, client.account),
    url: text(item.url ?? item.href, ''),
    followers: text(item.followers ?? item.count, ''),
  }));
  if (s.length) return s;
  return [{ platform: 'Instagram', handle: client.account, followers: client.followers }, { platform: 'WhatsApp', handle: client.phone || 'Sin número' }];
}

function metricsFrom(raw: Record<string, unknown>, client: ClientData): Metric[] {
  const input = arr<Record<string, unknown>>(raw.metrics ?? raw.stats ?? raw.kpis).map((m) => ({ value: text(m.value ?? m.number ?? m.metric, '+30%'), label: text(m.label ?? m.title ?? m.text, 'más conversión visual') }));
  if (input.length) return input;
  return [{ value: client.followers || '0', label: 'seguidores detectados' }, { value: '24/7', label: 'presentación activa' }, { value: '1 link', label: 'para prospectar' }];
}

function pricingFrom(raw: Record<string, unknown>): Plan[] {
  const input = arr<Record<string, unknown>>(raw.pricing ?? raw.plans ?? raw.packages ?? raw.paquetes).map((plan, index) => ({
    name: text(plan.name ?? plan.title, ['Base', 'Pro', 'Premium'][index] || 'Plan'),
    price: text(plan.price ?? plan.valor ?? plan.amount, index === 0 ? 'Desde $99.000' : 'A cotizar'),
    features: arr<unknown>(plan.features ?? plan.items ?? plan.benefits).map((x) => text(x)).filter(Boolean),
  }));
  return input.length ? input : [
    { name: 'Diagnóstico', price: '$49.000', features: ['Análisis de marca', 'Propuesta visual', 'Link privado'] },
    { name: 'Propuesta Pro', price: '$149.000', features: ['Landing premium', 'Datos del cliente', 'Compartir por correo'] },
    { name: 'Campaña', price: 'A cotizar', features: ['Prospección', 'Seguimiento', 'Automatización'] },
  ];
}

function modulesFrom(raw: Record<string, unknown>, client: ClientData, metrics: Metric[], pricing: Plan[]): Module[] {
  const input = arr<Record<string, unknown>>(raw.modules ?? raw.blocks ?? raw.sections).map((block, index) => ({
    id: text(block.id, uid()),
    type: text(block.type ?? block.kind, index === 0 ? 'hero' : 'custom'),
    title: text(block.title ?? block.heading ?? block.headline, `Módulo ${index + 1}`),
    text: text(block.text ?? block.description ?? block.subtitle, ''),
    items: arr<unknown>(block.items ?? block.features ?? block.benefits).map((x) => text(x)).filter(Boolean),
    image: text(block.image ?? block.cover ?? block.photo, ''),
    cta: text(block.cta ?? block.buttonText, ''),
    href: text(block.href ?? block.buttonHref, '/contacto'),
    html: cleanHtml(block.html),
  }));
  if (input.length) return input;
  return [
    { id: uid(), type: 'hero', title: `${client.brand}: una presentación que abre oportunidades`, text: `Propuesta premium para prospectar a ${client.brand}, usando sus datos, redes y estilo visual.`, cta: 'Solicitar propuesta', href: '/contacto' },
    { id: uid(), type: 'client', title: 'Datos del prospecto', text: `${client.name} · ${client.account} · ${client.phone || client.email || client.location}` },
    { id: uid(), type: 'metrics', title: 'Señales comerciales', text: 'Datos relevantes del cliente', items: metrics.map((m) => `${m.value} ${m.label}`) },
    { id: uid(), type: 'pricing', title: 'Opciones comerciales', text: 'Paquetes listos para presentar', items: pricing.map((p) => `${p.name} — ${p.price}`) },
    { id: uid(), type: 'cta', title: '¿Hablamos de tu negocio?', text: 'Enviamos esta presentación por WhatsApp, redes o correo desde la plataforma.', cta: 'Compartir propuesta', href: '/contacto' },
  ];
}

function pageFromJson(rawInput: unknown): PageState {
  const raw = obj(rawInput);
  const maybeNiche = raw.niche ?? raw.industry ?? raw.rubro ?? raw.tipo;
  const template = maybeNiche ? buildNicheTemplate(maybeNiche, raw) : null;
  const source = template ? { ...template, ...raw, hero: { ...obj(template.hero), ...obj(raw.hero) } } : raw;
  const theme = defaultTheme(source);
  const client = clientFrom(source);
  const socials = socialsFrom(source, client);
  const metrics = metricsFrom(source, client);
  const pricing = pricingFrom(source);
  const modules = modulesFrom(source, client, metrics, pricing);
  return {
    title: text(source.title ?? source.name, `${client.brand} — Presentación premium`),
    token: text(source.token, ''),
    device: ['phone', 'tablet', 'desktop', 'wide'].includes(text(source.device)) ? text(source.device) as Device : 'phone',
    visualPreset: preset(source.visualPreset ?? source.preset ?? source.template),
    client,
    theme,
    socials,
    metrics,
    pricing,
    modules,
  };
}

function pageFromHtml(content: string): PageState {
  const imported = transformHtmlToPremiumPage(content) as unknown as Record<string, unknown>;
  return pageFromJson({ ...imported, modules: imported.blocks, title: imported.title, visualPreset: imported.visualPreset });
}

function loadSaved(): SavedTemplate[] { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') as SavedTemplate[]; } catch { return []; } }
function persistSaved(list: SavedTemplate[]) { localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, 18))); }

function landingCss(t: Theme) { return `<style>*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${t.background};color:${t.text};font-family:${t.fontBody}}a{text-decoration:none;color:inherit}.page{position:relative;min-height:100vh;overflow:hidden;background:radial-gradient(circle at 82% 4%,${t.glow}40,transparent 24rem),radial-gradient(circle at 8% 20%,${t.secondary}22,transparent 22rem),${t.background};padding:34px}.page.animated:before{content:"";position:fixed;inset:-30%;background:linear-gradient(115deg,transparent,${t.primary}20,transparent);animation:glowMove 10s ease-in-out infinite;pointer-events:none}@keyframes glowMove{0%,100%{transform:translateX(-12%) rotate(0deg)}50%{transform:translateX(12%) rotate(8deg)}}.shell{position:relative;z-index:1}.hero{min-height:580px;display:grid;grid-template-columns:1.1fr .9fr;gap:34px;align-items:center;border:1px solid ${t.primary}55;border-radius:38px;padding:52px;background:linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02));backdrop-filter:blur(18px);box-shadow:0 34px 120px rgba(0,0,0,.35)}.eyebrow{font-size:12px;font-weight:900;letter-spacing:.38em;text-transform:uppercase;color:${t.primary}}h1,h2{font-family:${t.fontHeading};letter-spacing:-.06em;line-height:.95}h1{font-size:clamp(46px,8vw,90px);margin:24px 0 16px}h2{font-size:clamp(34px,5vw,64px);margin:0 0 16px}p{line-height:1.75;color:${t.muted}}.btn{display:inline-flex;border-radius:999px;background:linear-gradient(135deg,${t.primary},${t.secondary});color:#120a04;padding:15px 22px;font-weight:1000;margin-top:22px}.orb{min-height:380px;border-radius:34px;background:radial-gradient(circle at 35% 25%,${t.primary},transparent 14rem),linear-gradient(135deg,rgba(255,255,255,.15),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.14)}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}.card,.panel{border:1px solid ${t.primary}33;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.04));border-radius:28px;padding:24px;backdrop-filter:blur(16px)}.metric strong{display:block;font-size:42px;letter-spacing:-.06em;color:${t.primary}}.section{position:relative;z-index:1;margin-top:34px}.profile{display:flex;gap:16px;align-items:center}.avatar{width:64px;height:64px;border-radius:22px;background:${t.primary};display:grid;place-items:center;color:#100800;font-weight:1000}.plans{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.price{font-size:34px;font-weight:1000;color:${t.primary};margin:14px 0}.socials{display:flex;flex-wrap:wrap;gap:10px}.pill{border:1px solid ${t.primary}33;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.07);color:${t.text}}@media(max-width:760px){.page{padding:16px}.hero{grid-template-columns:1fr;padding:28px;min-height:620px}.orb{min-height:260px}.grid,.plans{grid-template-columns:1fr}.hero h1{font-size:44px}}</style>`; }
function moduleHtml(m: Module, state: PageState) { const t = state.theme; if (m.type === 'hero') return `<section class="hero"><div><div class="eyebrow">${esc(state.client.account)} · ${esc(state.client.followers)} seguidores</div><h1>${esc(m.title)}</h1><p>${esc(m.text)}</p><a class="btn" href="${esc(m.href || '#')}">${esc(m.cta || 'Solicitar propuesta')}</a></div><div class="orb"></div></section>`; if (m.type === 'client') return `<section class="section panel"><div class="profile"><div class="avatar">${esc(state.client.brand.slice(0,2).toUpperCase())}</div><div><div class="eyebrow">Datos del cliente</div><h2>${esc(state.client.brand)}</h2><p>${esc(state.client.name)} · ${esc(state.client.location)} · ${esc(state.client.phone || state.client.email)}</p><div class="socials">${state.socials.map((s) => `<span class="pill">${esc(s.platform)} ${esc(s.handle)} ${esc(s.followers || '')}</span>`).join('')}</div></div></div></section>`; if (m.type === 'metrics') return `<section class="section"><div class="eyebrow">Métricas</div><h2>${esc(m.title)}</h2><div class="grid">${state.metrics.map((x) => `<article class="card metric"><strong>${esc(x.value)}</strong><p>${esc(x.label)}</p></article>`).join('')}</div></section>`; if (m.type === 'pricing') return `<section class="section"><div class="eyebrow">Opciones</div><h2>${esc(m.title)}</h2><div class="plans">${state.pricing.map((p) => `<article class="card"><h3>${esc(p.name)}</h3><div class="price">${esc(p.price)}</div><p>${p.features.map((f) => `✓ ${esc(f)}`).join('<br>')}</p><a class="btn" href="/contacto">Enviar opción</a></article>`).join('')}</div></section>`; if (m.type === 'cta') return `<section class="section panel"><div class="eyebrow">Cierre comercial</div><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p><a class="btn" href="${esc(m.href || '#')}">${esc(m.cta || 'Contactar')}</a></section>`; if (m.html) return `<section class="section">${cleanHtml(m.html)}</section>`; return `<section class="section panel"><div class="eyebrow">${esc(m.type)}</div><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p>${m.items?.length ? `<div class="grid">${m.items.map((item) => `<article class="card">${esc(item)}</article>`).join('')}</div>` : ''}</section>`; }
function renderHtml(state: PageState) { return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.title)}</title>${landingCss(state.theme)}</head><body><main class="page ${state.theme.animatedBackground ? 'animated' : ''}"><div class="shell">${state.modules.map((m) => moduleHtml(m, state)).join('')}</div></main></body></html>`; }

export default function PremiumPageEngineClient() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<PageState>(() => pageFromJson(sampleJson));
  const [saved, setSaved] = useState<SavedTemplate[]>(() => typeof window === 'undefined' ? [] : loadSaved());
  const [publicUrl, setPublicUrl] = useState('');
  const [status, setStatus] = useState('Importa un JSON de cliente o usa la plantilla glamour.');
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('Te comparto una presentación premium preparada por Soluciones Fabrick.');
  const [sending, setSending] = useState(false);
  const pageHtml = useMemo(() => renderHtml(state), [state]);
  const frame = frames[state.device];

  function updateTheme(key: keyof Theme, value: string | boolean) { setState((s) => ({ ...s, theme: { ...s.theme, [key]: value } })); }
  function saveLocalTemplate(next = state) { const item = { id: next.token || uid(), title: next.title, brand: next.client.brand, updatedAt: new Date().toISOString(), data: next }; const list = [item, ...saved.filter((x) => x.id !== item.id)].slice(0, 18); setSaved(list); persistSaved(list); setStatus('Plantilla guardada localmente y lista para reutilizar.'); }
  async function importFile(file: File) { const content = await file.text(); if (/\.html?$|\.jhtml$/i.test(file.name)) { const next = pageFromHtml(content); setState(next); setStatus('HTML importado y transformado respetando módulos premium.'); return; } try { const next = pageFromJson(JSON.parse(content)); setState(next); setStatus(`JSON importado: ${next.client.brand}. Colores, cliente, redes y módulos aplicados.`); } catch { setStatus('Archivo inválido. Sube un .json, .html o .jhtml válido.'); } }
  async function publish() { setStatus('Guardando cliente, diseño y plantilla en BD…'); const res = await fetch('/api/admin/page-engine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: state.token, title: state.title, html: pageHtml, project_json: state, expires_in_hours: 168, status: 'publicado' }) }); const json = await res.json().catch(() => ({})); if (!res.ok) { setStatus(json.error || 'No se pudo publicar.'); return; } const next = { ...state, token: json.token }; setState(next); setPublicUrl(json.public_url || ''); saveLocalTemplate(next); setStatus('Guardado en BD, datos del cliente incluidos y link listo.'); }
  function fullPreview() { const w = window.open('', '_blank'); if (!w) return; w.document.write(pageHtml); w.document.close(); }
  function shareUrl(kind: string) { const url = encodeURIComponent(publicUrl || location.href); const txt = encodeURIComponent(`${state.title} — ${message}`); if (kind === 'whatsapp') window.open(`https://wa.me/?text=${txt}%20${url}`, '_blank'); if (kind === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank'); if (kind === 'instagram') window.open('https://www.instagram.com/', '_blank'); if (kind === 'phone') location.href = state.client.phone ? `tel:${state.client.phone}` : 'tel:'; if (kind === 'direct') navigator.clipboard?.writeText(`${state.title}\n${publicUrl || location.href}`); }
  async function sendEmail() { if (!publicUrl) { setStatus('Publica primero para generar el link público.'); return; } setSending(true); const res = await fetch('/api/admin/page-engine/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to, title: state.title, url: publicUrl, message }) }); const json = await res.json().catch(() => ({})); setSending(false); setStatus(res.ok ? `Correo enviado con Resend${json.simulated ? ' (simulado)' : ''}.` : json.error || 'No se pudo enviar el correo.'); }

  return <main className="min-h-screen overflow-x-hidden bg-[#050403] text-white"><input ref={fileRef} type="file" hidden accept=".json,.html,.htm,.jhtml" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f); e.currentTarget.value = ''; }} />
    <div className="mx-auto grid w-full max-w-[1780px] gap-4 p-3 sm:p-5 xl:grid-cols-[270px_1fr_330px]">
      <aside className="hidden rounded-[30px] border border-amber-300/15 bg-black/45 p-3 shadow-[0_30px_100px_rgba(0,0,0,.6)] backdrop-blur-2xl xl:block"><div className="mb-4 flex items-center gap-3 rounded-2xl bg-white/[.04] p-3"><Sparkles className="text-amber-300"/><b>Soluciones Fabrick</b></div>{['Editor modular','Plantillas guardadas','Componentes','Animaciones','Código','Datos cliente','Redes','Ajustes'].map((x,i)=><button key={x} className={`mb-2 flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-bold ${i===0?'border-amber-300/35 bg-amber-400/15 text-amber-100':'border-white/10 bg-white/[.035] text-white/70'}`}><Code2 className="h-4 w-4 text-amber-300"/>{x}</button>)}</aside>
      <section className="min-w-0 rounded-[32px] border border-amber-300/15 bg-[linear-gradient(180deg,rgba(10,9,8,.82),rgba(3,3,3,.97))] p-3 shadow-[0_30px_120px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:p-5"><header className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><button className="rounded-2xl border border-white/10 bg-white/[.04] p-3"><Menu className="h-5 w-5"/></button><b className="text-amber-100">Centro de control</b></div><div className="flex gap-2"><Small icon={Search}/><Small icon={Moon}/><Small icon={Bell}/></div></header>
        <section className="mb-4 rounded-[30px] border border-amber-300/20 bg-[radial-gradient(circle_at_84%_20%,rgba(245,158,11,.24),transparent_20rem),linear-gradient(135deg,rgba(255,255,255,.055),rgba(255,255,255,.018))] p-5 sm:p-8"><p className="text-[11px] font-black uppercase tracking-[.36em] text-amber-300">Editor modular</p><h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-.06em] sm:text-6xl">Diseño desde JSON de cliente</h1><p className="mt-3 text-white/62">El JSON ahora controla marca, colores, fondo animado, redes, datos y módulos.</p><div className="mt-5 flex flex-wrap gap-3"><button onClick={fullPreview} className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-100"><Eye className="h-4 w-4"/>Vista previa completa</button><button onClick={() => { setState(pageFromJson(sampleJson)); setStatus('JSON glamour de prueba aplicado.'); }} className="inline-flex items-center gap-2 rounded-2xl border border-fuchsia-300/30 bg-fuchsia-400/10 px-4 py-3 text-sm font-black text-fuchsia-100"><Wand2 className="h-4 w-4"/>Probar glamour JSON</button></div></section>
        <section className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Panel label="Proyecto"><input value={state.title} onChange={e=>setState({...state,title:e.target.value})} className="mt-2 w-full rounded-2xl border border-amber-300/15 bg-black/45 px-4 py-3 outline-none"/></Panel><Panel label="Marca"><input value={state.client.brand} onChange={e=>setState({...state,client:{...state.client,brand:e.target.value}})} className="mt-2 w-full rounded-2xl border border-amber-300/15 bg-black/45 px-4 py-3 outline-none"/></Panel><Panel label="Color primario"><input type="color" value={state.theme.primary} onChange={e=>updateTheme('primary', e.target.value)} className="mt-2 h-12 w-full rounded-2xl border border-amber-300/15 bg-black/45 p-1"/></Panel><Panel label="Dispositivo"><div className="mt-2 grid grid-cols-4 gap-2">{Object.entries(icons).map(([k,I])=><button key={k} onClick={()=>setState({...state,device:k as Device})} className={`rounded-2xl border p-3 ${state.device===k?'border-amber-300 bg-amber-400/15':'border-white/10 bg-black/35'}`}><I className="mx-auto h-5 w-5"/></button>)}</div></Panel></section>
        <section className="rounded-[30px] border border-amber-300/15 bg-black/35 p-3 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[11px] font-black uppercase tracking-[.32em] text-amber-300">Vista previa — {state.device}</p><button onClick={fullPreview} className="rounded-2xl border border-amber-300/25 px-4 py-2 text-sm font-black text-amber-100">Pantalla completa</button></div><div className={`${frame} overflow-hidden border border-amber-200/20 bg-black shadow-[0_30px_100px_rgba(0,0,0,.5),0_0_0_10px_rgba(255,255,255,.035)]`}><iframe title="Vista previa" srcDoc={pageHtml} className="h-full w-full border-0 bg-white" /></div></section>
        <section className="mt-4 rounded-[28px] border border-amber-300/15 bg-black/35 p-4"><p className="text-[11px] font-black uppercase tracking-[.32em] text-amber-300">Plantillas guardadas</p><div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{saved.length ? saved.map((item)=><button key={item.id} onClick={()=>setState(item.data)} className="rounded-2xl border border-white/10 bg-white/[.035] p-3 text-left hover:border-amber-300/35"><b>{item.brand}</b><span className="block text-xs text-white/45">{item.title}</span></button>) : <p className="text-sm text-white/45">Todavía no hay plantillas guardadas.</p>}</div></section>
        <footer className="sticky bottom-3 z-20 mt-4 grid gap-3 rounded-[26px] border border-amber-300/15 bg-black/75 p-3 backdrop-blur-xl md:grid-cols-3"><button onClick={publish} className="flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-4 font-black text-black"><Database/>Guardar BD + publicar</button><button onClick={()=>fileRef.current?.click()} className="flex items-center justify-center gap-3 rounded-2xl border border-amber-300/18 bg-white/[.045] px-5 py-4 font-black"><FileUp className="text-amber-300"/>Importar JSON / HTML</button><button onClick={()=>saveLocalTemplate()} className="flex items-center justify-center gap-3 rounded-2xl border border-amber-300/18 bg-white/[.045] px-5 py-4 font-black"><Share2 className="text-amber-300"/>Guardar plantilla</button></footer>{publicUrl && <a href={publicUrl} target="_blank" className="mt-3 block break-all rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">Link público: {publicUrl}</a>}</section>
      <aside className="rounded-[30px] border border-amber-300/15 bg-black/45 p-4 shadow-[0_30px_100px_rgba(0,0,0,.48)] backdrop-blur-2xl"><h3 className="text-[11px] font-black uppercase tracking-[.32em] text-amber-300">Datos y compartir</h3><Info label="Cliente" value={state.client.name}/><Info label="Cuenta" value={state.client.account}/><Info label="Seguidores" value={state.client.followers}/><Info label="Teléfono" value={state.client.phone || 'Sin número'}/><input value={to} onChange={e=>setTo(e.target.value)} placeholder="correo@cliente.com" className="mt-4 w-full rounded-2xl border border-amber-300/15 bg-black/45 px-4 py-3 outline-none"/><textarea value={message} onChange={e=>setMessage(e.target.value)} rows={4} className="mt-3 w-full rounded-2xl border border-amber-300/15 bg-black/45 px-4 py-3 outline-none"/><Share icon={Instagram} label="Instagram" onClick={()=>shareUrl('instagram')}/><Share icon={Phone} label="WhatsApp" onClick={()=>shareUrl('whatsapp')}/><Share icon={Facebook} label="Facebook" onClick={()=>shareUrl('facebook')}/><Share icon={Send} label="Mensaje directo" onClick={()=>shareUrl('direct')}/><button onClick={sendEmail} disabled={sending} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-left text-sm font-bold text-emerald-100"><span className="flex items-center gap-3"><Mail/>Correo electrónico</span><span className="rounded-full bg-emerald-400/15 px-2 py-1 text-[10px]">Resend</span></button><p className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-xs text-emerald-100">Al publicar, el cliente, marca, redes, métricas y módulos quedan dentro de project_json.</p></aside>
    </div></main>;
}

const sampleJson = {
  title: 'Aurora Glam Studio — Presentación premium',
  visualPreset: 'glass-rose',
  device: 'phone',
  theme: { primary: '#f48fb1', secondary: '#f59e0b', background: '#130911', surface: '#21101a', text: '#fff7fb', muted: '#e9c7d6', glow: '#f48fb1', fontHeading: 'Playfair Display, Georgia, serif', fontBody: 'Inter, system-ui, sans-serif', animatedBackground: true },
  client: { name: 'Camila Rojas', brand: 'Aurora Glam Studio', account: '@auroraglam.cl', phone: '+56912345678', email: 'contacto@auroraglam.cl', location: 'Linares, Chile', followers: '18.4K' },
  socials: [{ platform: 'Instagram', handle: '@auroraglam.cl', followers: '18.4K' }, { platform: 'Facebook', handle: 'Aurora Glam Studio', followers: '6.2K' }, { platform: 'WhatsApp', handle: '+56912345678' }],
  metrics: [{ value: '18.4K', label: 'seguidores en Instagram' }, { value: '+42%', label: 'potencial de conversión visual' }, { value: '24/7', label: 'agenda visible' }],
  pricing: [{ name: 'Base', price: '$99.000', features: ['Landing premium', 'Datos del cliente', 'Link privado'] }, { name: 'Pro', price: '$199.000', features: ['Fondo animado', 'Sección redes', 'Correo Resend'] }, { name: 'Full campaña', price: '$349.000', features: ['Prospección', 'Plantilla editable', 'Seguimiento'] }],
  modules: [{ type: 'hero', title: 'Una estética que se ve tan premium como su servicio', text: 'Creamos una presentación glamour para que Aurora convierta visitas de redes sociales en reservas reales.', cta: 'Reservar evaluación', href: '/contacto' }, { type: 'client', title: 'Datos del prospecto', text: 'Información importada desde JSON' }, { type: 'metrics', title: 'Audiencia y oportunidad', text: 'Métricas detectadas desde redes' }, { type: 'pricing', title: 'Opciones para activar la campaña', text: 'Paquetes listos para enviar' }, { type: 'cta', title: 'Enviar propuesta a la marca', text: 'Comparte esta presentación por WhatsApp, Instagram o correo usando Resend.', cta: 'Compartir ahora' }],
};

function Small({ icon: Icon }: { icon: Icon }) { return <button className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><Icon className="h-4 w-4" /></button>; }
function Panel({ label, children }: { label: string; children: ReactNode }) { return <div className="rounded-[24px] border border-amber-300/15 bg-black/35 p-4"><p className="text-[10px] font-black uppercase tracking-[.26em] text-amber-300">{label}</p>{children}</div>; }
function Share({ icon: Icon, label, onClick }: { icon: Icon; label: string; onClick: () => void }) { return <button onClick={onClick} className="mt-3 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-left text-sm text-white/80 hover:border-amber-300/25 hover:bg-amber-400/10"><span className="flex items-center gap-3"><Icon className="h-4 w-4 text-amber-300" />{label}</span><span>›</span></button>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="mt-3 rounded-2xl border border-white/10 bg-white/[.035] p-3"><p className="text-[10px] uppercase tracking-[.18em] text-amber-300">{label}</p><p className="mt-1 text-sm text-white/80">{value}</p></div>; }
