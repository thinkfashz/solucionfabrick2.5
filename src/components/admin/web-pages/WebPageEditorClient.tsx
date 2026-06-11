'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Code2, Copy, ExternalLink, Eye, FileJson, FileUp, Loader2, Save, Send } from 'lucide-react';

type PageData = { id:number; slug:string; title:string; niche:string; client_name:string; client_phone:string; status:string; project_json:Record<string, unknown>; html:string; css:string; js:string; seo_json:Record<string, unknown>; public_url:string };
type Tab = 'preview' | 'html' | 'css' | 'js' | 'json';
type Device = 'mobile' | 'tablet' | 'desktop' | 'wide';

function pretty(value: unknown) { try { return JSON.stringify(value ?? {}, null, 2); } catch { return '{}'; } }
function extractHtmlParts(raw: string) { const styleMatches=[...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]; const scriptMatches=[...raw.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)]; const css=styleMatches.map((m)=>m[1]).join('\n\n'); const js=scriptMatches.map((m)=>m[1]).join('\n\n'); const bodyMatch=raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i); const body=bodyMatch?.[1] || raw.replace(/<!doctype[^>]*>/gi,'').replace(/<html[^>]*>|<\/html>/gi,'').replace(/<head[^>]*>[\s\S]*?<\/head>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<body[^>]*>|<\/body>/gi,''); return { html: body.trim(), css: css.trim(), js: js.trim() }; }
function widthClass(device: Device) { if (device === 'mobile') return 'max-w-[390px]'; if (device === 'tablet') return 'max-w-[768px]'; if (device === 'wide') return 'max-w-[1360px]'; return 'max-w-[1080px]'; }
function makeSrcDoc(html: string, css: string, js: string) { return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif}${css}</style></head><body>${html}${js ? `<script>${js}<\/script>` : ''}</body></html>`; }

export function WebPageEditorClient({ id }: { id: string }) {
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const [device, setDevice] = useState<Device>('desktop');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [jsonText, setJsonText] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { (async()=>{ setLoading(true); const res=await fetch(`/api/admin/web-pages/${id}`,{cache:'no-store'}); const data=await res.json(); if(!res.ok||!data.ok||!data.page){setError(data.error||'No se encontró la página'); setLoading(false); return;} const p=data.page as PageData; setPage(p); setHtml(p.html || ''); setCss(p.css || ''); setJs(p.js || ''); setJsonText(pretty(p.project_json)); setLoading(false); })(); }, [id]);

  async function onFileSelected(file: File) { const text=await file.text(); const lower=file.name.toLowerCase(); if(lower.endsWith('.json')){ try{ const parsed=JSON.parse(text); setJsonText(pretty(parsed)); if(parsed.html) setHtml(String(parsed.html)); if(parsed.css) setCss(String(parsed.css)); if(parsed.js) setJs(String(parsed.js)); setTab('preview'); } catch { setError('El archivo JSON no es válido'); } return; } const parts=extractHtmlParts(text); setHtml(parts.html); if(parts.css) setCss((prev)=>[prev,parts.css].filter(Boolean).join('\n\n')); if(parts.js) setJs((prev)=>[prev,parts.js].filter(Boolean).join('\n\n')); setTab('preview'); }

  async function save(status?: 'draft' | 'published') { if(!page) return; setSaving(true); setError(null); try{ let project_json: Record<string, unknown> = {}; try{ project_json = jsonText.trim()? JSON.parse(jsonText) as Record<string, unknown> : {}; }catch{ throw new Error('El JSON activo no es válido. Corrígelo antes de guardar.'); } const payload={...page,status:status||page.status||'draft',html,css,js,project_json,seo_json:page.seo_json||{title:page.title}}; const res=await fetch(`/api/admin/web-pages/${page.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data=await res.json(); if(!res.ok||!data.ok) throw new Error(data.error||'No se pudo guardar'); const next=data.page as PageData; setPage(next); setHtml(next.html||html); setCss(next.css||css); setJs(next.js||js); setJsonText(pretty(next.project_json||project_json)); setTab('preview'); }catch(err){ setError(err instanceof Error?err.message:'Error al guardar'); }finally{ setSaving(false); } }

  if(loading) return <div className="grid min-h-screen place-items-center bg-black text-white"><Loader2 className="size-7 animate-spin text-amber-400"/></div>;
  if(!page) return <div className="p-8 text-red-300">{error || 'Página no encontrada'}</div>;

  return <div className="min-h-screen overflow-x-hidden bg-[#080604] text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090806]/95 p-3 backdrop-blur-xl sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0"><Link href="/admin/paginas" className="mb-2 inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white"><ArrowLeft className="size-4"/> Volver a páginas</Link><h1 className="truncate text-xl font-black sm:text-3xl">{page.title}</h1><p className="truncate text-xs text-zinc-500">/l/{page.slug}</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={()=>setTab('preview')} className={`rounded-xl px-3 py-2 text-xs font-black ${tab==='preview'?'bg-amber-400 text-black':'border border-white/10'}`}><Eye className="mr-1 inline size-3"/>Vista navegador</button><button onClick={()=>setTab('html')} className={`rounded-xl px-3 py-2 text-xs font-black ${tab==='html'?'bg-amber-400 text-black':'border border-white/10'}`}><Code2 className="mr-1 inline size-3"/>HTML</button><button onClick={()=>setTab('json')} className={`rounded-xl px-3 py-2 text-xs font-black ${tab==='json'?'bg-amber-400 text-black':'border border-white/10'}`}><FileJson className="mr-1 inline size-3"/>JSON</button><label className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><FileUp className="mr-1 inline size-3"/>Subir<input type="file" accept=".html,.htm,.json,text/html,application/json" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void onFileSelected(f); e.currentTarget.value='';}} /></label><button onClick={()=>navigator.clipboard?.writeText(page.public_url||`${location.origin}/l/${page.slug}`)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><Copy className="mr-1 inline size-3"/>URL</button><a href={`/l/${page.slug}`} target="_blank" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><ExternalLink className="mr-1 inline size-3"/>Ver</a><button onClick={()=>save('draft')} disabled={saving} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Save className="mr-1 inline size-3"/>{saving?'Guardando...':'Guardar'}</button><button onClick={()=>save('published')} disabled={saving} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Send className="mr-1 inline size-3"/>Publicar</button></div>
      </div>{error&&<div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</div>}
    </header>

    <main className="grid gap-4 p-3 lg:p-5">
      <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black uppercase tracking-widest text-zinc-500">Dispositivo</span>{(['mobile','tablet','desktop','wide'] as Device[]).map((d)=><button key={d} onClick={()=>setDevice(d)} className={`rounded-full px-3 py-1.5 text-xs font-black ${device===d?'bg-amber-400 text-black':'border border-white/10 bg-white/5 text-zinc-300'}`}>{d}</button>)}<button onClick={()=>setTab('css')} className={`rounded-full px-3 py-1.5 text-xs font-black ${tab==='css'?'bg-amber-400 text-black':'border border-white/10 bg-white/5 text-zinc-300'}`}>CSS</button><button onClick={()=>setTab('js')} className={`rounded-full px-3 py-1.5 text-xs font-black ${tab==='js'?'bg-amber-400 text-black':'border border-white/10 bg-white/5 text-zinc-300'}`}>JS</button></div>
      {tab==='preview' && <section className="rounded-[2rem] border border-white/10 bg-black/35 p-2 sm:p-4"><div className={`mx-auto overflow-hidden rounded-[1.6rem] border border-amber-300/20 bg-white shadow-[0_24px_80px_rgba(0,0,0,.55)] transition-all ${widthClass(device)}`}><iframe title="Vista previa navegador" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" srcDoc={makeSrcDoc(html,css,js)} className="h-[78vh] w-full bg-white" /></div></section>}
      {tab==='html' && <textarea value={html} onChange={(e)=>setHtml(e.target.value)} spellCheck={false} className="h-[78vh] w-full resize-none rounded-2xl border border-white/10 bg-[#050505] p-4 font-mono text-xs leading-5 text-zinc-100 outline-none" placeholder="Pega aquí tu HTML..."/>}
      {tab==='css' && <textarea value={css} onChange={(e)=>setCss(e.target.value)} spellCheck={false} className="h-[78vh] w-full resize-none rounded-2xl border border-white/10 bg-[#050505] p-4 font-mono text-xs leading-5 text-zinc-100 outline-none" placeholder="Pega aquí tu CSS..."/>}
      {tab==='js' && <textarea value={js} onChange={(e)=>setJs(e.target.value)} spellCheck={false} className="h-[78vh] w-full resize-none rounded-2xl border border-white/10 bg-[#050505] p-4 font-mono text-xs leading-5 text-zinc-100 outline-none" placeholder="Pega aquí tu JS..."/>}
      {tab==='json' && <textarea value={jsonText} onChange={(e)=>setJsonText(e.target.value)} spellCheck={false} className="h-[78vh] w-full resize-none rounded-2xl border border-white/10 bg-[#050505] p-4 font-mono text-xs leading-5 text-amber-100 outline-none" placeholder="JSON activo del proyecto..."/>}
    </main>
  </div>;
}
