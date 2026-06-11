'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Code2, Copy, ExternalLink, Eye, FileJson, FileUp, Loader2, Save, Send } from 'lucide-react';

type PageData = { id:number; slug:string; title:string; niche:string; client_name:string; client_phone:string; status:string; project_json:any; html:string; css:string; js:string; seo_json:any; public_url:string };
type EditorMode = 'visual' | 'manual';
type ManualTab = 'html' | 'css' | 'js' | 'json' | 'preview';

async function loadGrapesJS() {
  const mod = await import('grapesjs');
  return mod.default ?? mod;
}

function pretty(value: unknown) {
  try { return JSON.stringify(value ?? {}, null, 2); } catch { return '{}'; }
}

function extractHtmlParts(raw: string) {
  const styleMatches = [...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const scriptMatches = [...raw.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  const css = styleMatches.map((m)=>m[1]).join('\n\n');
  const js = scriptMatches.map((m)=>m[1]).join('\n\n');
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] || raw.replace(/<!doctype[^>]*>/gi,'').replace(/<html[^>]*>|<\/html>/gi,'').replace(/<head[^>]*>[\s\S]*?<\/head>/gi,'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<body[^>]*>|<\/body>/gi,'');
  return { html: body.trim(), css: css.trim(), js: js.trim() };
}

export function WebPageEditorClient({ id }: { id: string }) {
  const editorRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<EditorMode>('visual');
  const [tab, setTab] = useState<ManualTab>('html');
  const [manualHtml, setManualHtml] = useState('');
  const [manualCss, setManualCss] = useState('');
  const [manualJs, setManualJs] = useState('');
  const [manualJson, setManualJson] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { (async()=>{ setLoading(true); const res=await fetch(`/api/admin/web-pages/${id}`,{cache:'no-store'}); const json=await res.json(); if(!res.ok||!json.ok||!json.page){setError(json.error||'No se encontró la página'); setLoading(false); return;} const p = json.page as PageData; setPage(p); setManualHtml(p.html || ''); setManualCss(p.css || ''); setManualJs(p.js || ''); setManualJson(pretty(p.project_json)); setLoading(false); })(); }, [id]);

  useEffect(() => {
    if (!page || !canvasRef.current || editorRef.current) return;
    const activePage = page;
    let cancelled = false;
    async function init() {
      try {
        const grapesjs = await loadGrapesJS();
        if (cancelled || !canvasRef.current) return;
        const editor = grapesjs.init({
          container: canvasRef.current,
          height:'calc(100vh - 230px)',
          width:'100%',
          storageManager:false,
          fromElement:false,
          blockManager:{ blocks:[
            {id:'hero-fabrick',label:'Hero Fabrick',category:'Fabrick',content:'<section class="hero"><div class="badge">Nuevo</div><h1>Título potente</h1><p>Describe el beneficio principal para el cliente.</p><div class="btns"><a class="btn primary" href="#contacto">Contactar</a></div></section>'},
            {id:'cards-3',label:'3 beneficios',category:'Fabrick',content:'<section class="grid"><article class="card"><span>01</span><h2>Beneficio</h2><p>Explica el valor.</p></article><article class="card"><span>02</span><h2>Proceso</h2><p>Explica el orden.</p></article><article class="card"><span>03</span><h2>Garantía</h2><p>Explica seguridad.</p></article></section>'},
            {id:'cta',label:'CTA WhatsApp',category:'Fabrick',content:'<section class="contact" id="contacto"><h2>¿Listo para avanzar?</h2><p>Agenda una revisión rápida.</p><a class="btn primary" href="https://wa.me/56900000000">WhatsApp</a></section>'},
          ]}
        });
        editor.setComponents(activePage.html || '<main><h1>Nueva página</h1></main>'); editor.setStyle(activePage.css || '');
        try { if (activePage.project_json && Object.keys(activePage.project_json).length) editor.loadProjectData(activePage.project_json); } catch {}
        editorRef.current = editor; setReady(true);
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar GrapesJS local'); }
    }
    void init(); return()=>{cancelled=true; editorRef.current?.destroy?.(); editorRef.current=null;};
  }, [page]);

  function syncManualFromVisual() {
    const editor = editorRef.current;
    if (!editor) return;
    setManualHtml(editor.getHtml());
    setManualCss(editor.getCss());
    setManualJs(editor.getJs());
    setManualJson(pretty(editor.getProjectData()));
    setMode('manual');
  }

  function applyManualToVisual() {
    const editor = editorRef.current;
    if (!editor) return;
    setError(null);
    try {
      editor.setComponents(manualHtml || '<main><h1>Nueva página</h1></main>');
      editor.setStyle(manualCss || '');
      const parsed = manualJson.trim() ? JSON.parse(manualJson) : {};
      if (parsed && Object.keys(parsed).length) {
        try { editor.loadProjectData(parsed); } catch {}
      }
      setMode('visual');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'JSON inválido');
    }
  }

  async function onFileSelected(file: File) {
    const text = await file.text();
    const lower = file.name.toLowerCase();
    if (lower.endsWith('.json')) {
      try {
        const parsed = JSON.parse(text);
        setManualJson(pretty(parsed));
        if (parsed.html) setManualHtml(String(parsed.html));
        if (parsed.css) setManualCss(String(parsed.css));
        if (parsed.js) setManualJs(String(parsed.js));
        setTab('json');
      } catch { setError('El archivo JSON no es válido'); }
      return;
    }
    const parts = extractHtmlParts(text);
    setManualHtml(parts.html);
    if (parts.css) setManualCss((prev)=>[prev, parts.css].filter(Boolean).join('\n\n'));
    if (parts.js) setManualJs((prev)=>[prev, parts.js].filter(Boolean).join('\n\n'));
    setTab('html');
  }

  async function save(status?: 'draft' | 'published') {
    if (!page) return;
    setSaving(true); setError(null);
    try {
      const editor = editorRef.current;
      let html = mode === 'manual' ? manualHtml : editor?.getHtml?.() || manualHtml || page.html;
      let css = mode === 'manual' ? manualCss : editor?.getCss?.() || manualCss || page.css;
      let js = mode === 'manual' ? manualJs : editor?.getJs?.() || manualJs || page.js;
      let project_json: any = {};
      try { project_json = mode === 'manual' ? JSON.parse(manualJson || '{}') : editor?.getProjectData?.() || JSON.parse(manualJson || '{}'); } catch { throw new Error('El JSON activo no es válido. Corrígelo antes de guardar.'); }
      const payload={...page,status:status||page.status||'draft',html,css,js,project_json,seo_json:page.seo_json||{title:page.title}};
      const res=await fetch(`/api/admin/web-pages/${page.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const json=await res.json();
      if(!res.ok||!json.ok) throw new Error(json.error||'No se pudo guardar');
      const next = json.page as PageData;
      setPage(next); setManualHtml(next.html || html); setManualCss(next.css || css); setManualJs(next.js || js); setManualJson(pretty(next.project_json || project_json));
    }catch(err){setError(err instanceof Error?err.message:'Error al guardar');}finally{setSaving(false);}
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-black text-white"><Loader2 className="size-7 animate-spin text-amber-400"/></div>;
  if (!page) return <div className="p-8 text-red-300">{error || 'Página no encontrada'}</div>;

  const previewSrcDoc = `<style>${manualCss}</style>${manualHtml}${manualJs ? `<script>${manualJs}<\/script>` : ''}`;

  return <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 p-3 backdrop-blur-xl sm:p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0"><Link href="/admin/paginas" className="mb-2 inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white"><ArrowLeft className="size-4"/> Volver a páginas</Link><h1 className="truncate text-xl font-black sm:text-2xl">{page.title}</h1><p className="truncate text-xs text-zinc-500">/l/{page.slug}</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={()=>setMode('visual')} className={`rounded-xl px-3 py-2 text-xs font-black ${mode==='visual'?'bg-amber-400 text-black':'border border-white/10'}`}><Eye className="mr-1 inline size-3"/>Visual</button>
          <button onClick={syncManualFromVisual} className={`rounded-xl px-3 py-2 text-xs font-black ${mode==='manual'?'bg-amber-400 text-black':'border border-white/10'}`}><Code2 className="mr-1 inline size-3"/>Manual HTML/JSON</button>
          <input ref={fileRef} type="file" accept=".html,.htm,.json,text/html,application/json" className="hidden" onChange={(e)=>{const f=e.target.files?.[0]; if(f) void onFileSelected(f); e.currentTarget.value='';}} />
          <button onClick={()=>fileRef.current?.click()} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><FileUp className="mr-1 inline size-3"/>Subir HTML/JSON</button>
          <button onClick={()=>navigator.clipboard?.writeText(page.public_url||`${location.origin}/l/${page.slug}`)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><Copy className="mr-1 inline size-3"/>Copiar URL</button>
          <a href={`/l/${page.slug}`} target="_blank" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><ExternalLink className="mr-1 inline size-3"/>Ver</a>
          <button onClick={()=>save('draft')} disabled={saving||(!ready&&mode==='visual')} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Save className="mr-1 inline size-3"/>{saving?'Guardando...':'Guardar'}</button>
          <button onClick={()=>save('published')} disabled={saving||(!ready&&mode==='visual')} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Send className="mr-1 inline size-3"/>Publicar</button>
        </div>
      </div>
      {error&&<div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</div>}
    </header>

    <section className={mode==='visual' ? 'block' : 'hidden'}><div ref={canvasRef} className="min-h-[70vh] w-full bg-white text-black [&_.gjs-one-bg]:!bg-zinc-950 [&_.gjs-two-color]:!text-zinc-200 [&_.gjs-four-color]:!text-amber-400" /></section>

    {mode==='manual' && <section className="grid gap-3 p-3 lg:grid-cols-[220px_1fr] lg:p-5">
      <aside className="rounded-2xl border border-white/10 bg-black/30 p-2"><button onClick={()=>setTab('html')} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${tab==='html'?'bg-amber-400 text-black':'text-zinc-300 hover:bg-white/5'}`}>HTML</button><button onClick={()=>setTab('css')} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${tab==='css'?'bg-amber-400 text-black':'text-zinc-300 hover:bg-white/5'}`}>CSS</button><button onClick={()=>setTab('js')} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${tab==='js'?'bg-amber-400 text-black':'text-zinc-300 hover:bg-white/5'}`}>JavaScript</button><button onClick={()=>setTab('json')} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${tab==='json'?'bg-amber-400 text-black':'text-zinc-300 hover:bg-white/5'}`}><FileJson className="mr-1 inline size-4"/>JSON activo</button><button onClick={()=>setTab('preview')} className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${tab==='preview'?'bg-amber-400 text-black':'text-zinc-300 hover:bg-white/5'}`}>Vista previa</button><button onClick={applyManualToVisual} className="mt-3 w-full rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm font-black text-amber-200">Aplicar al visual</button></aside>
      <div className="min-h-[70vh] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        {tab==='html' && <textarea value={manualHtml} onChange={(e)=>setManualHtml(e.target.value)} spellCheck={false} className="h-[72vh] w-full resize-none bg-[#050505] p-4 font-mono text-xs leading-5 text-zinc-100 outline-none" placeholder="Pega aquí tu HTML..."/>}
        {tab==='css' && <textarea value={manualCss} onChange={(e)=>setManualCss(e.target.value)} spellCheck={false} className="h-[72vh] w-full resize-none bg-[#050505] p-4 font-mono text-xs leading-5 text-zinc-100 outline-none" placeholder="Pega aquí tu CSS..."/>}
        {tab==='js' && <textarea value={manualJs} onChange={(e)=>setManualJs(e.target.value)} spellCheck={false} className="h-[72vh] w-full resize-none bg-[#050505] p-4 font-mono text-xs leading-5 text-zinc-100 outline-none" placeholder="Pega aquí tu JS..."/>}
        {tab==='json' && <textarea value={manualJson} onChange={(e)=>setManualJson(e.target.value)} spellCheck={false} className="h-[72vh] w-full resize-none bg-[#050505] p-4 font-mono text-xs leading-5 text-amber-100 outline-none" placeholder="Pega aquí el JSON activo del proyecto..."/>}
        {tab==='preview' && <iframe title="Vista previa manual" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" srcDoc={previewSrcDoc} className="h-[72vh] w-full bg-white"/>}
      </div>
    </section>}
  </div>;
}
