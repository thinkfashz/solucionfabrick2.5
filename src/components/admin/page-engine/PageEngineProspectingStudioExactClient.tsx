'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Clock3,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  Eye,
  Facebook,
  FileText,
  FileUp,
  ImagePlus,
  Instagram,
  Link2,
  Loader2,
  Mail,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  Wand2,
  X,
} from 'lucide-react';

type Prospect = {
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

type Asset = { id?: string; public_id: string; url: string; width?: number; height?: number; format?: string };
type Doc = { token: string; title: string; status: string; expires_at?: string | null; created_at?: string; updated_at?: string };
type Tab = 'prospecto' | 'html' | 'css' | 'js' | 'imagenes' | 'ajustes';
type Device = 'mobile' | 'tablet' | 'desktop';

const STORAGE = 'sf_page_engine_prospects_v3';
const starterProspect: Prospect = {
  id: 'demo-prospecto',
  brand: 'Marca Prospecto',
  client: '',
  account: '@marca',
  followers: '0',
  instagram: '',
  facebook: '',
  whatsapp: '',
  website: '',
  location: 'Chile',
  notes: '',
  logo: '',
};
const starterHtml = `<main class="sf-demo">
  <section class="sf-card">
    <p class="sf-kicker">Demo privada</p>
    <h1>{{brand}} puede convertir mejor sus seguidores.</h1>
    <p>Presentación digital para ordenar confianza, redes sociales, WhatsApp, agenda y venta.</p>
    <img src="{{heroImage}}" alt="Imagen principal" />
    <a class="sf-button" href="{{instagram}}" target="_blank">Ver Instagram</a>
  </section>
</main>`;
const defaultCss = `body{margin:0;background:#060606;color:#fff7e8;font-family:Inter,system-ui,sans-serif}.sf-demo{min-height:100vh;padding:24px;display:grid;place-items:center;background:radial-gradient(circle at 80% 0%,rgba(245,197,71,.22),transparent 28rem),#060606}.sf-card{width:min(960px,100%);border:1px solid rgba(245,197,71,.24);border-radius:32px;background:rgba(255,255,255,.065);padding:34px;box-shadow:0 30px 100px rgba(0,0,0,.45);backdrop-filter:blur(18px)}.sf-kicker{color:#f5c547;text-transform:uppercase;letter-spacing:.28em;font-weight:900;font-size:12px}h1{font-size:clamp(42px,8vw,82px);line-height:.92;letter-spacing:-.07em;margin:16px 0}p{max-width:720px;color:#d7cbb8;line-height:1.65}.sf-card img{width:100%;max-height:420px;object-fit:cover;border-radius:24px;margin:20px 0}.sf-button{display:inline-flex;border-radius:999px;background:#f5c547;color:#111;padding:14px 20px;font-weight:900;text-decoration:none}`;

function uid() { return Math.random().toString(36).slice(2, 9); }
function esc(v: unknown) { return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;'); }
function safeRegExp(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function replaceAllLiteral(source: string, oldValue: string, nextValue: string) {
  if (!oldValue || oldValue === nextValue) return source;
  return source.replace(new RegExp(safeRegExp(oldValue), 'g'), nextValue);
}
function isFullHtml(raw: string) { return /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i.test(raw); }
function normalizeHost(url: string) { return url.replace(/^https?:\/\//i, '').replace(/\/+$/, ''); }
function withProtocol(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('@')) return `https://instagram.com/${url.slice(1)}`;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(url)) return `https://${url}`;
  return url;
}
function whatsappUrl(phone: string, msg: string) {
  const digits = phone.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(msg)}` : '';
}
function expiryLabel(hours: number, neverExpire: boolean) {
  if (neverExpire) return 'Sin desactivación';
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d (${hours}h)`;
}
function loadProspects(): Prospect[] {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE) || '[]') as Prospect[];
    return data.length ? data : [starterProspect];
  } catch {
    return [starterProspect];
  }
}
function saveProspects(list: Prospect[]) { localStorage.setItem(STORAGE, JSON.stringify(list.slice(0, 120))); }
function firstMatch(source: string, regex: RegExp) { return source.match(regex)?.[1]?.trim() || ''; }
function folderOf(publicId: string) {
  const parts = publicId.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : 'raíz';
}
function detectProspect(raw: string): Partial<Prospect> {
  const title = firstMatch(raw, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/Demo Comercial Premium\s*[·-]\s*/i, '').trim();
  const instagram = firstMatch(raw, /href=["'](https?:\/\/(?:www\.)?instagram\.com\/[^"']+)["']/i);
  const facebook = firstMatch(raw, /href=["'](https?:\/\/(?:www\.)?facebook\.com\/[^"']+)["']/i);
  const whatsappDigits = firstMatch(raw, /wa\.me\/([0-9]+)/i);
  const account = firstMatch(raw, /(@[a-zA-Z0-9._-]+)/);
  const followers = firstMatch(raw, /([0-9]{1,3}(?:[.,][0-9])?\s*K|[0-9]{3,}\s*seguidores)/i);
  const website = firstMatch(raw, /href=["'](https?:\/\/(?!images\.unsplash|fonts\.google|wa\.me|(?:www\.)?instagram|(?:www\.)?facebook)[^"']+)["']/i);
  const logo = firstMatch(raw, /<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  return { brand: title || undefined, instagram: instagram || undefined, facebook: facebook || undefined, whatsapp: whatsappDigits ? `+${whatsappDigits}` : undefined, account: account || undefined, followers: followers || undefined, website: website || undefined, logo: logo || undefined };
}
function applyProspectData(raw: string, prospect: Prospect, detected: Partial<Prospect>, hero: string) {
  let out = raw;
  out = out
    .replaceAll('{{brand}}', esc(prospect.brand))
    .replaceAll('{{client}}', esc(prospect.client))
    .replaceAll('{{account}}', esc(prospect.account))
    .replaceAll('{{followers}}', esc(prospect.followers))
    .replaceAll('{{instagram}}', esc(prospect.instagram))
    .replaceAll('{{facebook}}', esc(prospect.facebook))
    .replaceAll('{{whatsapp}}', esc(prospect.whatsapp))
    .replaceAll('{{website}}', esc(prospect.website))
    .replaceAll('{{heroImage}}', esc(hero));
  out = replaceAllLiteral(out, detected.brand || '', prospect.brand);
  out = replaceAllLiteral(out, detected.instagram || '', prospect.instagram);
  out = replaceAllLiteral(out, detected.facebook || '', prospect.facebook);
  out = replaceAllLiteral(out, detected.account || '', prospect.account);
  out = replaceAllLiteral(out, detected.followers || '', prospect.followers);
  out = replaceAllLiteral(out, detected.website || '', prospect.website);
  out = replaceAllLiteral(out, detected.logo || '', hero);
  if (detected.whatsapp && prospect.whatsapp) {
    out = replaceAllLiteral(out, detected.whatsapp.replace(/\D/g, ''), prospect.whatsapp.replace(/\D/g, ''));
    out = replaceAllLiteral(out, detected.whatsapp, prospect.whatsapp);
  }
  return out;
}
function injectBeforeBodyClose(doc: string, content: string) {
  return /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${content}</body>`) : `${doc}${content}`;
}
function injectHead(doc: string, content: string) {
  if (!content.trim()) return doc;
  if (/<\/head>/i.test(doc)) return doc.replace(/<\/head>/i, `${content}</head>`);
  if (/<html[^>]*>/i.test(doc)) return doc.replace(/<html[^>]*>/i, (m) => `${m}<head>${content}</head>`);
  return `<!doctype html><html lang="es"><head>${content}</head><body>${doc}</body></html>`;
}
function buildHtml(raw: string, css: string, js: string, prospect: Prospect, detected: Partial<Prospect>, images: string[], hours: number, neverExpire: boolean, exact: boolean) {
  const hero = images[0] || prospect.logo || 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=85';
  const dataApplied = applyProspectData(raw, prospect, detected, hero);
  const countdown = neverExpire ? '' : `<div data-sf-expiry style="position:fixed;left:16px;right:16px;bottom:16px;z-index:99999;border:1px solid rgba(245,197,71,.28);border-radius:22px;padding:14px 16px;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);color:#fff;font-family:Inter,system-ui,sans-serif;box-shadow:0 20px 70px rgba(0,0,0,.35)"><strong style="color:#f5c547;letter-spacing:.18em;text-transform:uppercase;font-size:10px">Demo temporal</strong><div style="font-weight:900;margin-top:4px">Acceso disponible por ${expiryLabel(hours, false)}</div></div>`;
  const extraStyle = css.trim() ? `<style id="sf-extra-css">${css}</style>` : '';
  const extraScript = js.trim() ? `<script id="sf-extra-js">${js.replace(/<\/script/gi, '<\\/script')}<\/script>` : '';
  if (exact || isFullHtml(dataApplied)) return injectBeforeBodyClose(injectHead(dataApplied, extraStyle), `${countdown}${extraScript}`);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(prospect.brand)} | Demo digital</title><style>${css.trim() || defaultCss}</style></head><body>${dataApplied}${countdown}${extraScript}</body></html>`;
}
function deviceClass(device: Device) {
  if (device === 'mobile') return 'mx-auto h-[680px] w-[min(360px,100%)] rounded-[2.2rem]';
  if (device === 'tablet') return 'mx-auto h-[720px] w-[min(720px,100%)] rounded-[2rem]';
  return 'h-[760px] w-full rounded-[1.8rem]';
}
function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PageEngineProspectingStudioExactClient() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [activeId, setActiveId] = useState('');
  const [tab, setTab] = useState<Tab>('prospecto');
  const [device, setDevice] = useState<Device>('mobile');
  const [html, setHtml] = useState(starterHtml);
  const [css, setCss] = useState(defaultCss);
  const [js, setJs] = useState('');
  const [exactHtml, setExactHtml] = useState(false);
  const [detected, setDetected] = useState<Partial<Prospect>>({});
  const [images, setImages] = useState<string[]>([]);
  const [cloudAssets, setCloudAssets] = useState<Asset[]>([]);
  const [folder, setFolder] = useState('soluciones-fabrick/page-engine');
  const [assetSearch, setAssetSearch] = useState('');
  const [hours, setHours] = useState(720);
  const [neverExpire, setNeverExpire] = useState(false);
  const [rightOpen, setRightOpen] = useState(true);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [lastUrl, setLastUrl] = useState('');

  useEffect(() => {
    const list = loadProspects();
    setProspects(list);
    setActiveId(list[0]?.id || '');
    void loadDocs();
    void loadCloudinary();
  }, []);

  const activeProspect = useMemo(() => prospects.find((p) => p.id === activeId) || prospects[0] || starterProspect, [prospects, activeId]);
  const filteredProspects = useMemo(() => {
    const t = query.toLowerCase().trim();
    return t ? prospects.filter((p) => `${p.brand} ${p.client} ${p.account} ${p.location} ${p.notes}`.toLowerCase().includes(t)) : prospects;
  }, [prospects, query]);
  const folders = useMemo(() => Array.from(new Set(cloudAssets.map((asset) => folderOf(asset.public_id)))).slice(0, 16), [cloudAssets]);
  const filteredAssets = useMemo(() => {
    const t = assetSearch.toLowerCase().trim();
    return t ? cloudAssets.filter((asset) => `${asset.public_id} ${asset.format || ''}`.toLowerCase().includes(t)) : cloudAssets;
  }, [cloudAssets, assetSearch]);
  const previewHtml = useMemo(() => buildHtml(html, css, js, activeProspect, detected, images, hours, neverExpire, exactHtml), [html, css, js, activeProspect, detected, images, hours, neverExpire, exactHtml]);
  const shareUrl = lastUrl || (docs[0]?.token ? `${typeof location !== 'undefined' ? location.origin : ''}/w/${docs[0].token}` : '');

  function updateProspect(patch: Partial<Prospect>) {
    const id = activeProspect.id || uid();
    const next = prospects.map((p) => p.id === id ? { ...p, ...patch } : p);
    setProspects(next);
    saveProspects(next);
  }
  function newProspect() {
    const p = { ...starterProspect, id: uid(), brand: 'Nueva marca prospecto' };
    const next = [p, ...prospects];
    setProspects(next);
    setActiveId(p.id);
    saveProspects(next);
    setDetected({});
    setHtml(starterHtml);
    setCss(defaultCss);
    setJs('');
    setExactHtml(false);
    setImages([]);
    setLastUrl('');
    setStatus('Prospecto nuevo creado.');
  }
  function deleteProspect(id: string) {
    if (prospects.length <= 1) return setStatus('Debes mantener al menos un prospecto.');
    if (!confirm('¿Eliminar este prospecto local? Los links publicados no se eliminan automáticamente.')) return;
    const next = prospects.filter((p) => p.id !== id);
    setProspects(next);
    setActiveId(next[0]?.id || '');
    saveProspects(next);
  }
  function saveProspect() { saveProspects(prospects); setStatus('Datos del prospecto guardados.'); }

  async function importHtmlFile(file?: File | null) {
    if (!file) return;
    const raw = await file.text();
    const found = detectProspect(raw);
    const full = isFullHtml(raw);
    setDetected(found);
    setHtml(raw);
    setExactHtml(full);
    setCss(full ? '' : defaultCss);
    setJs('');
    const patch: Partial<Prospect> = {};
    (['brand', 'instagram', 'facebook', 'whatsapp', 'account', 'followers', 'website', 'logo'] as const).forEach((key) => { if (found[key]) patch[key] = found[key] as string; });
    if (Object.keys(patch).length) updateProspect(patch);
    setImages(found.logo ? [found.logo] : []);
    setTab('html');
    setStatus(full ? `HTML completo importado sin desarmar: ${file.name}.` : `Fragmento HTML importado: ${file.name}. Se aplicó el estilo base.`);
  }
  async function loadDocs() {
    const res = await fetch('/api/admin/page-engine', { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      setDbConnected(Boolean(json.connected));
      setDocs(Array.isArray(json.documents) ? json.documents : []);
    } else setDbConnected(false);
  }
  async function loadCloudinary(nextFolder = folder) {
    setStatus('Cargando imágenes de Cloudinary…');
    const res = await fetch(`/api/admin/cloudinary?folder=${encodeURIComponent(nextFolder)}&max_results=90`, { cache: 'no-store' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(json.error || 'No pude cargar Cloudinary.'); return; }
    setCloudAssets(Array.isArray(json.assets) ? json.assets : []);
    setStatus(`Cloudinary conectado · ${Array.isArray(json.assets) ? json.assets.length : 0} imágenes disponibles.`);
  }
  async function uploadImage(file: File) {
    const form = new FormData();
    form.set('file', file);
    form.set('folder', folder || 'soluciones-fabrick/page-engine');
    setBusy(true);
    setStatus('Subiendo imagen a Cloudinary…');
    const res = await fetch('/api/admin/cloudinary', { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setStatus(json.error || 'No se pudo subir la imagen.'); return; }
    const url = json.url || json.asset?.url;
    if (url) {
      setImages((list) => [url, ...list]);
      updateProspect({ logo: activeProspect.logo || url });
      setStatus('Imagen subida e insertada.');
      void loadCloudinary();
    }
  }
  function insertImage(url: string) {
    setImages((list) => list.includes(url) ? list : [url, ...list]);
    updateProspect({ logo: activeProspect.logo || url });
    setStatus('Imagen seleccionada para hero/metadatos.');
  }
  async function publish() {
    setBusy(true);
    setStatus('Guardando HTML completo en base de datos…');
    const projectJson = {
      mode: 'html',
      exactHtml,
      allowUnsafeHtml: true,
      htmlCode: html,
      css,
      js,
      images,
      detected,
      brand: activeProspect.brand,
      shareTitle: `${activeProspect.brand} | Demo digital`,
      shareDescription: `Vista previa privada para ${activeProspect.brand}. ${activeProspect.followers || 'Prospecto'} · propuesta digital lista para revisar.`,
      shareImage: activeProspect.logo || images[0] || '',
      website: activeProspect.website,
      instagram: activeProspect.instagram,
      facebook: activeProspect.facebook,
      client: activeProspect,
      prospect: activeProspect,
      neverExpire,
      expires_in_hours: hours,
      modules: [{ type: 'prospect-demo', brand: activeProspect.brand }],
    };
    const res = await fetch('/api/admin/page-engine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `${activeProspect.brand} · Demo`, html: previewHtml, css, js, status: 'publicado', expires_in_hours: hours, project_json: projectJson }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setStatus(json.error || 'No se pudo publicar.'); return; }
    if (json.public_url) setLastUrl(json.public_url);
    await loadDocs();
    setStatus(`Publicado y copiado: ${json.public_url}`);
    if (json.public_url) await navigator.clipboard?.writeText(json.public_url).catch(() => undefined);
  }
  async function removeDoc(token: string) {
    if (!confirm('¿Eliminar este link de la base de datos?')) return;
    const res = await fetch(`/api/admin/page-engine?token=${encodeURIComponent(token)}`, { method: 'DELETE' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setStatus(json.error || 'No se pudo eliminar.'); return; }
    setDocs((list) => list.filter((d) => d.token !== token));
    if (lastUrl.includes(token)) setLastUrl('');
    setStatus('Link eliminado.');
  }
  function share(kind: 'whatsapp' | 'email' | 'facebook') {
    const url = shareUrl;
    if (!url) return setStatus('Primero publica o selecciona un link para compartir.');
    const msg = `Hola, te comparto una demo digital para ${activeProspect.brand}: ${url}`;
    if (kind === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    if (kind === 'email') window.open(`mailto:?subject=${encodeURIComponent(`Demo digital ${activeProspect.brand}`)}&body=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    if (kind === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener');
  }

  const tools = <Tools prospect={activeProspect} images={images} hours={hours} neverExpire={neverExpire} docs={docs} shareUrl={shareUrl} onRefresh={loadDocs} onRemove={removeDoc} onShare={share} onSetShareUrl={setLastUrl} />;

  return <main className="mx-auto grid w-full max-w-[1780px] gap-4 overflow-x-hidden p-2 text-white sm:p-4 xl:grid-cols-[330px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
    <aside className="min-w-0 rounded-[2rem] border border-white/10 bg-black/60 p-3 shadow-[0_24px_80px_rgba(0,0,0,.35)] backdrop-blur-xl xl:sticky xl:top-24 xl:h-[calc(100vh-120px)] xl:overflow-hidden">
      <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Prospección</p><h2 className="text-xl font-black">Demos guardadas</h2></div><button onClick={newProspect} className="grid h-10 w-10 place-items-center rounded-2xl bg-yellow-300 text-black"><Plus className="h-5 w-5" /></button></div>
      <label className="mt-3 flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3"><Search className="h-4 w-4 text-white/40" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar prospecto" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30" /></label>
      <div className="mt-3 grid max-h-[46vh] gap-2 overflow-y-auto pr-1 xl:max-h-[calc(100vh-330px)]">{filteredProspects.map((p) => <article key={p.id} className={`rounded-2xl border p-3 ${p.id === activeProspect.id ? 'border-yellow-300/45 bg-yellow-300/10' : 'border-white/10 bg-white/[0.035]'}`}><button onClick={() => setActiveId(p.id)} className="w-full text-left"><b className="block truncate text-sm">{p.brand}</b><span className="mt-1 block truncate text-xs text-white/45">{p.account} · {p.followers}</span></button><button onClick={() => deleteProspect(p.id)} className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-300/70">Eliminar prospecto</button></article>)}</div>
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs text-white/50"><Database className="mr-1 inline h-3.5 w-3.5" />{dbConnected ? 'BD conectada · page_engine_documents' : 'BD pendiente'}</div>
    </aside>

    <section className="min-w-0 overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#080807] shadow-[0_28px_100px_rgba(0,0,0,.38)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-white/[0.035] p-4"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Page Engine 21stDev</p><h1 className="truncate text-2xl font-black tracking-tight sm:text-4xl">Generador avanzado de demos</h1><p className="mt-1 text-sm text-white/45">Importa HTML exacto, edita datos del prospecto, monta imágenes y comparte links desde tu base de datos.</p></div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black"><FileUp className="mr-2 h-4 w-4" />Importar HTML<input type="file" accept=".html,.htm,.txt,text/html,text/plain" className="hidden" onChange={(e) => { void importHtmlFile(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} /></label><button onClick={() => downloadFile(`${activeProspect.brand.replace(/\W+/g, '-').toLowerCase() || 'demo'}.html`, previewHtml)} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black"><Download className="mr-2 inline h-4 w-4" />Exportar</button><button onClick={() => setMobileToolsOpen(true)} className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black xl:hidden"><PanelRightOpen className="mr-2 inline h-4 w-4" />Opciones</button><button onClick={() => setRightOpen((v) => !v)} className="hidden rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-black xl:inline-flex">{rightOpen ? <PanelRightClose className="mr-2 h-4 w-4" /> : <PanelRightOpen className="mr-2 h-4 w-4" />}Opciones</button><button onClick={publish} disabled={busy} className="rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-black disabled:opacity-60">{busy ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 inline h-4 w-4" />}Publicar</button></div></header>
      {status && <div className="mx-4 mt-4 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100">{status}</div>}
      <div className={`grid min-w-0 gap-4 p-4 ${rightOpen ? 'xl:grid-cols-[minmax(0,1fr)_390px]' : 'xl:grid-cols-1'}`}><div className="min-w-0 space-y-4"><nav className="flex gap-2 overflow-x-auto pb-1">{(['prospecto', 'html', 'css', 'js', 'imagenes', 'ajustes'] as Tab[]).map((t) => <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${tab === t ? 'border-yellow-300 bg-yellow-300 text-black' : 'border-white/10 bg-white/[0.035] text-white/60'}`}>{t}</button>)}</nav>{tab === 'prospecto' && <ProspectPanel prospect={activeProspect} detected={detected} onChange={updateProspect} onSave={saveProspect} />}{tab === 'html' && <Editor label={exactHtml ? 'HTML completo exacto' : 'HTML'} value={html} onChange={setHtml} onReset={() => { setHtml(starterHtml); setExactHtml(false); }} />}{tab === 'css' && <Editor label="CSS adicional / predeterminado" value={css} onChange={setCss} onReset={() => setCss(defaultCss)} />}{tab === 'js' && <Editor label="JavaScript adicional" value={js} onChange={setJs} onReset={() => setJs('')} />}{tab === 'imagenes' && <ImagePanel assets={filteredAssets} allAssets={cloudAssets} folders={folders} images={images} folder={folder} search={assetSearch} busy={busy} onSearch={setAssetSearch} onFolder={setFolder} onRefresh={() => loadCloudinary()} onAll={() => { setFolder(''); void loadCloudinary(''); }} onFolderSelect={(next) => { setFolder(next === 'raíz' ? '' : next); void loadCloudinary(next === 'raíz' ? '' : next); }} onInsert={insertImage} onUpload={uploadImage} onRemove={(url) => setImages((list) => list.filter((x) => x !== url))} />}{tab === 'ajustes' && <SettingsPanel hours={hours} neverExpire={neverExpire} onHours={setHours} onNever={setNeverExpire} exactHtml={exactHtml} onExact={setExactHtml} />}<section className="rounded-[1.8rem] border border-white/10 bg-black/40 p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-black"><Eye className="h-4 w-4 text-yellow-300" />Preview responsive</div><div className="flex gap-2">{(['mobile', 'tablet', 'desktop'] as Device[]).map((d) => <button key={d} onClick={() => setDevice(d)} className={`rounded-full px-3 py-1.5 text-xs font-black ${device === d ? 'bg-yellow-300 text-black' : 'bg-white/[0.06] text-white/60'}`}>{d}</button>)}</div></div><iframe title="Preview demo" srcDoc={previewHtml} sandbox="allow-scripts allow-forms allow-popups allow-same-origin" className={`${deviceClass(device)} block border border-white/10 bg-white`} /></section></div>{rightOpen && <aside className="hidden min-w-0 space-y-4 xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-130px)] xl:overflow-y-auto">{tools}</aside>}</div>
    </section>
    {mobileToolsOpen && <div className="fixed inset-0 z-[90] xl:hidden"><button className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setMobileToolsOpen(false)} aria-label="Cerrar opciones" /><aside className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-y-auto rounded-t-[2rem] border border-white/10 bg-[#080807] p-4 shadow-[0_-24px_80px_rgba(0,0,0,.45)]"><div className="mb-3 flex items-center justify-between"><b className="text-lg">Opciones y compartir</b><button onClick={() => setMobileToolsOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.05]"><X className="h-5 w-5" /></button></div>{tools}</aside></div>}
  </main>;
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <label className="block rounded-2xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full bg-transparent text-base outline-none placeholder:text-white/25" /></label>; }
function ProspectPanel({ prospect, detected, onChange, onSave }: { prospect: Prospect; detected: Partial<Prospect>; onChange: (p: Partial<Prospect>) => void; onSave: () => void }) { return <section className="grid gap-3 rounded-[1.8rem] border border-white/10 bg-black/40 p-4 md:grid-cols-2"><div className="md:col-span-2 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-sm text-yellow-100"><Wand2 className="mr-2 inline h-4 w-4" />Campos detectados del HTML: {Object.keys(detected).length ? Object.keys(detected).join(', ') : 'ninguno todavía'}.</div><Field label="Marca" value={prospect.brand} onChange={(brand) => onChange({ brand })} /><Field label="Cliente" value={prospect.client} onChange={(client) => onChange({ client })} /><Field label="Cuenta" value={prospect.account} onChange={(account) => onChange({ account })} /><Field label="Seguidores" value={prospect.followers} onChange={(followers) => onChange({ followers })} /><Field label="Instagram" value={prospect.instagram} onChange={(instagram) => onChange({ instagram })} /><Field label="Facebook" value={prospect.facebook} onChange={(facebook) => onChange({ facebook })} /><Field label="WhatsApp" value={prospect.whatsapp} onChange={(whatsapp) => onChange({ whatsapp })} /><Field label="Web visible" value={prospect.website} onChange={(website) => onChange({ website })} /><Field label="Logo / imagen" value={prospect.logo} onChange={(logo) => onChange({ logo })} /><Field label="Ubicación" value={prospect.location} onChange={(location) => onChange({ location })} /><label className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.035] p-3"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Notas</span><textarea value={prospect.notes} onChange={(e) => onChange({ notes: e.target.value })} className="mt-2 min-h-24 w-full resize-y bg-transparent outline-none" /></label><button onClick={onSave} className="md:col-span-2 rounded-2xl bg-yellow-300 px-5 py-3 font-black text-black"><Save className="mr-2 inline h-4 w-4" />Guardar prospecto</button></section>; }
function Editor({ label, value, onChange, onReset }: { label: string; value: string; onChange: (v: string) => void; onReset: () => void }) { return <section className="rounded-[1.8rem] border border-white/10 bg-black/40 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><b><Code2 className="mr-2 inline h-4 w-4 text-yellow-300" />{label}</b><div className="flex gap-2"><button onClick={() => navigator.clipboard.writeText(value)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-white/60"><Copy className="mr-1 inline h-3.5 w-3.5" />Copiar</button><button onClick={onReset} className="rounded-xl border border-red-300/20 px-3 py-2 text-xs font-black text-red-200">Limpiar</button></div></div><textarea value={value} onChange={(e) => onChange(e.target.value)} spellCheck={false} className="min-h-[420px] w-full resize-y rounded-2xl border border-white/10 bg-[#050505] p-4 font-mono text-sm leading-6 text-yellow-50 outline-none focus:border-yellow-300/45" /></section>; }
function ImagePanel({ assets, folders, images, folder, search, busy, onSearch, onFolder, onRefresh, onAll, onFolderSelect, onInsert, onUpload, onRemove }: { assets: Asset[]; allAssets: Asset[]; folders: string[]; images: string[]; folder: string; search: string; busy: boolean; onSearch: (v: string) => void; onFolder: (v: string) => void; onRefresh: () => void; onAll: () => void; onFolderSelect: (v: string) => void; onInsert: (u: string) => void; onUpload: (f: File) => void; onRemove: (u: string) => void }) { return <section className="rounded-[1.8rem] border border-white/10 bg-black/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><b>Imágenes Cloudinary</b><p className="text-xs text-white/45">Galería, carpetas, búsqueda, subida y montaje en demo.</p></div><div className="flex gap-2"><button onClick={onAll} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black">Ver todo</button><button onClick={onRefresh} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black"><RefreshCcw className="mr-1 inline h-3.5 w-3.5" />Actualizar</button></div></div><div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input value={folder} onChange={(e) => onFolder(e.target.value)} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm outline-none" placeholder="carpeta Cloudinary o vacío" /><input value={search} onChange={(e) => onSearch(e.target.value)} className="rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm outline-none" placeholder="buscar imagen" /><label className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-black"><UploadCloud className="mr-2 h-4 w-4" />Subir<input type="file" accept="image/*" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); e.currentTarget.value = ''; }} /></label></div>{folders.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2">{folders.map((name) => <button key={name} onClick={() => onFolderSelect(name)} className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black text-white/60 hover:border-yellow-300/30">{name}</button>)}</div>}{images.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-yellow-300">Imágenes montadas</p><div className="flex gap-2 overflow-x-auto pb-2">{images.map((url) => <button key={url} onClick={() => onRemove(url)} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-yellow-300/25"><img src={url} alt="Seleccionada" className="h-full w-full object-cover" /><span className="absolute inset-x-0 bottom-0 bg-black/70 py-1 text-[10px]">Quitar</span></button>)}</div></div>}<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{assets.map((asset) => <button key={asset.public_id} onClick={() => onInsert(asset.url)} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] text-left hover:border-yellow-300/35"><img src={asset.url} alt={asset.public_id} className="h-28 w-full object-cover" /><div className="p-2"><span className="block truncate text-xs font-bold text-white/70">{asset.public_id}</span><span className="text-[10px] text-white/35">{asset.width}×{asset.height}</span></div></button>)}</div></section>; }
function SettingsPanel({ hours, neverExpire, exactHtml, onHours, onNever, onExact }: { hours: number; neverExpire: boolean; exactHtml: boolean; onHours: (v: number) => void; onNever: (v: boolean) => void; onExact: (v: boolean) => void }) { return <section className="rounded-[1.8rem] border border-white/10 bg-black/40 p-4"><b><Settings2 className="mr-2 inline h-4 w-4 text-yellow-300" />Desactivación y modo HTML</b><label className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4"><span><b>Conservar HTML exacto</b><span className="block text-sm text-white/45">Mantiene head, styles, scripts y diseño original.</span></span><input type="checkbox" checked={exactHtml} onChange={(e) => onExact(e.target.checked)} /></label><label className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4"><span><b>No desactivar</b><span className="block text-sm text-white/45">Disponible hasta eliminarlo.</span></span><input type="checkbox" checked={neverExpire} onChange={(e) => onNever(e.target.checked)} /></label><label className="mt-4 block rounded-2xl border border-white/10 bg-white/[0.035] p-4"><span className="text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">Horas</span><input type="number" min={1} max={8760} disabled={neverExpire} value={hours} onChange={(e) => onHours(Math.max(1, Number(e.target.value || 1)))} className="mt-2 w-full bg-transparent text-3xl font-black outline-none disabled:opacity-35" /><span className="text-sm text-white/45">Actual: {expiryLabel(hours, neverExpire)}</span></label></section>; }
function Tools({ prospect, images, hours, neverExpire, docs, shareUrl, onRefresh, onRemove, onShare, onSetShareUrl }: { prospect: Prospect; images: string[]; hours: number; neverExpire: boolean; docs: Doc[]; shareUrl: string; onRefresh: () => void; onRemove: (token: string) => void; onShare: (kind: 'whatsapp' | 'email' | 'facebook') => void; onSetShareUrl: (url: string) => void }) { const ig = withProtocol(prospect.instagram || prospect.account); const fb = withProtocol(prospect.facebook); const wa = whatsappUrl(prospect.whatsapp, `Hola ${prospect.brand}, te comparto una demo digital.`); return <div className="space-y-4"><section className="rounded-[1.8rem] border border-white/10 bg-black/50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Resumen demo</p><h3 className="mt-2 text-2xl font-black">{prospect.brand}</h3><div className="mt-4 grid gap-2 text-sm text-white/60"><p><Users className="mr-2 inline h-4 w-4 text-yellow-300" />{prospect.client || 'Sin cliente'} · {prospect.followers}</p><p><ImagePlus className="mr-2 inline h-4 w-4 text-yellow-300" />{images.length} imágenes</p><p><Clock3 className="mr-2 inline h-4 w-4 text-yellow-300" />{expiryLabel(hours, neverExpire)}</p><p><Link2 className="mr-2 inline h-4 w-4 text-yellow-300" />{normalizeHost(prospect.website) || 'URL demo'}</p></div></section><section className="rounded-[1.8rem] border border-white/10 bg-black/50 p-4"><b><Share2 className="mr-2 inline h-4 w-4 text-yellow-300" />Compartir / redes</b><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => onShare('whatsapp')} className="rounded-2xl bg-emerald-500/15 px-3 py-3 text-sm font-black text-emerald-200">WhatsApp</button><button onClick={() => onShare('email')} className="rounded-2xl bg-white/[0.06] px-3 py-3 text-sm font-black"><Mail className="mr-1 inline h-4 w-4" />Correo</button><button onClick={() => onShare('facebook')} className="rounded-2xl bg-blue-500/15 px-3 py-3 text-sm font-black text-blue-200"><Facebook className="mr-1 inline h-4 w-4" />Facebook</button><a href={ig || '#'} target="_blank" rel="noreferrer" className="rounded-2xl bg-pink-500/15 px-3 py-3 text-center text-sm font-black text-pink-200"><Instagram className="mr-1 inline h-4 w-4" />Instagram</a>{fb && <a href={fb} target="_blank" rel="noreferrer" className="rounded-2xl bg-blue-500/15 px-3 py-3 text-center text-sm font-black text-blue-200">Abrir FB</a>}{wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-2xl bg-emerald-500/15 px-3 py-3 text-center text-sm font-black text-emerald-200">WhatsApp cliente</a>}</div>{shareUrl && <button onClick={() => navigator.clipboard.writeText(shareUrl)} className="mt-3 w-full rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-3 text-left text-xs text-yellow-100"><Copy className="mr-2 inline h-4 w-4" />{shareUrl}</button>}</section><section className="rounded-[1.8rem] border border-white/10 bg-black/50 p-4"><div className="flex items-center justify-between"><b><FileText className="mr-2 inline h-4 w-4 text-yellow-300" />Links guardados en BD</b><button onClick={onRefresh} className="rounded-xl border border-white/10 p-2"><RefreshCcw className="h-4 w-4" /></button></div><div className="mt-3 grid max-h-[430px] gap-2 overflow-y-auto pr-1">{docs.length ? docs.map((doc) => { const url = `${location.origin}/w/${doc.token}`; return <article key={doc.token} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3"><button onClick={() => onSetShareUrl(url)} className="w-full text-left"><b className="block truncate text-sm">{doc.title}</b><span className="mt-1 block truncate text-xs text-white/35">/{doc.token} · {doc.status} · {doc.expires_at ? expiryLabel(Math.max(1, Math.round((new Date(doc.expires_at).getTime() - Date.now()) / 36e5)), false) : 'sin vencimiento'}</span></button><div className="mt-3 flex gap-2"><button onClick={() => navigator.clipboard.writeText(url)} className="rounded-xl bg-white/[0.06] p-2"><Copy className="h-4 w-4" /></button><a href={url} target="_blank" rel="noreferrer" className="rounded-xl bg-white/[0.06] p-2"><ExternalLink className="h-4 w-4" /></a><button onClick={() => onRemove(doc.token)} className="rounded-xl bg-red-500/10 p-2 text-red-300"><Trash2 className="h-4 w-4" /></button></div></article>; }) : <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-white/45">Aún no hay links guardados.</p>}</div></section></div>; }
