'use client';

declare global { interface Window { grapesjs?: any } }

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, ExternalLink, Loader2, Save, Send } from 'lucide-react';

type PageData = { id:number; slug:string; title:string; niche:string; client_name:string; client_phone:string; status:string; project_json:any; html:string; css:string; js:string; seo_json:any; public_url:string };

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.body.appendChild(s);
  });
}

export function WebPageEditorClient({ id }: { id: string }) {
  const editorRef = useRef<any>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { (async()=>{ setLoading(true); const res=await fetch(`/api/admin/web-pages/${id}`,{cache:'no-store'}); const json=await res.json(); if(!res.ok||!json.ok||!json.page){setError(json.error||'No se encontró la página'); setLoading(false); return;} setPage(json.page); setLoading(false); })(); }, [id]);

  useEffect(() => {
    if (!page || !canvasRef.current || editorRef.current) return;
    let cancelled = false;
    async function init() {
      try {
        if (!document.querySelector('link[data-grapesjs]')) { const link=document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/grapesjs@0.22.13/dist/css/grapes.min.css'; link.dataset.grapesjs='true'; document.head.appendChild(link); }
        if (!window.grapesjs) await loadScript('https://unpkg.com/grapesjs@0.22.13/dist/grapes.min.js');
        if (cancelled || !canvasRef.current || !window.grapesjs) return;
        const editor = window.grapesjs.init({
          container: canvasRef.current, height:'calc(100vh - 210px)', width:'100%', storageManager:false, fromElement:false,
          blockManager:{ blocks:[
            {id:'hero-fabrick',label:'Hero Fabrick',category:'Fabrick',content:'<section class="hero"><div class="badge">Nuevo</div><h1>Título potente</h1><p>Describe el beneficio principal para el cliente.</p><div class="btns"><a class="btn primary" href="#contacto">Contactar</a></div></section>'},
            {id:'cards-3',label:'3 beneficios',category:'Fabrick',content:'<section class="grid"><article class="card"><span>01</span><h2>Beneficio</h2><p>Explica el valor.</p></article><article class="card"><span>02</span><h2>Proceso</h2><p>Explica el orden.</p></article><article class="card"><span>03</span><h2>Garantía</h2><p>Explica seguridad.</p></article></section>'},
            {id:'cta',label:'CTA WhatsApp',category:'Fabrick',content:'<section class="contact" id="contacto"><h2>¿Listo para avanzar?</h2><p>Agenda una revisión rápida.</p><a class="btn primary" href="https://wa.me/56900000000">WhatsApp</a></section>'},
          ]}
        });
        editor.setComponents(page.html || '<main><h1>Nueva página</h1></main>'); editor.setStyle(page.css || '');
        try { if (page.project_json && Object.keys(page.project_json).length) editor.loadProjectData(page.project_json); } catch {}
        editorRef.current = editor; setReady(true);
      } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar GrapesJS'); }
    }
    void init(); return()=>{cancelled=true; editorRef.current?.destroy?.(); editorRef.current=null;};
  }, [page]);

  async function save(status?: 'draft' | 'published') {
    if (!page || !editorRef.current) return;
    setSaving(true); setError(null);
    const editor=editorRef.current;
    const payload={...page,status:status||page.status||'draft',html:editor.getHtml(),css:editor.getCss(),js:editor.getJs(),project_json:editor.getProjectData(),seo_json:page.seo_json||{title:page.title}};
    try{const res=await fetch(`/api/admin/web-pages/${page.id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const json=await res.json(); if(!res.ok||!json.ok) throw new Error(json.error||'No se pudo guardar'); setPage(json.page);}catch(err){setError(err instanceof Error?err.message:'Error al guardar');}finally{setSaving(false);}
  }

  if (loading) return <div className="grid min-h-screen place-items-center bg-black text-white"><Loader2 className="size-7 animate-spin text-amber-400"/></div>;
  if (!page) return <div className="p-8 text-red-300">{error || 'Página no encontrada'}</div>;

  return <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-white"><header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 p-3 backdrop-blur-xl sm:p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><Link href="/admin/paginas" className="mb-2 inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-white"><ArrowLeft className="size-4"/> Volver a páginas</Link><h1 className="truncate text-xl font-black sm:text-2xl">{page.title}</h1><p className="truncate text-xs text-zinc-500">/l/{page.slug}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>navigator.clipboard?.writeText(page.public_url||`${location.origin}/l/${page.slug}`)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><Copy className="mr-1 inline size-3"/>Copiar URL</button><a href={`/l/${page.slug}`} target="_blank" className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold"><ExternalLink className="mr-1 inline size-3"/>Ver</a><button onClick={()=>save('draft')} disabled={saving||!ready} className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Save className="mr-1 inline size-3"/>{saving?'Guardando...':'Guardar'}</button><button onClick={()=>save('published')} disabled={saving||!ready} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black disabled:opacity-50"><Send className="mr-1 inline size-3"/>Publicar</button></div></div>{error&&<div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-200">{error}</div>}</header><div ref={canvasRef} className="min-h-[70vh] w-full [&_.gjs-one-bg]:!bg-zinc-950 [&_.gjs-two-color]:!text-zinc-200 [&_.gjs-four-color]:!text-amber-400" /></div>;
}
