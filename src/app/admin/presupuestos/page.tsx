'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from 'react';
import { Copy, Database, Eye, FileJson, FileText, ImagePlus, Plus, Printer, Save, Trash2 } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { MediaPicker, type MediaAsset } from '@/components/admin/cms/MediaPicker';
import PresupuestoPublicView from '@/components/presupuestos/PresupuestoPublicView';
import { baseBudgetExample, calculateBudget, createBudgetId, formatBudgetMoney, loadBudgets, normalizeBudget, saveBudgets, sanitizeBudgetHtml, slugifyBudget, type PresupuestoImagen, type PresupuestoItem, type PresupuestoPro } from '@/lib/presupuestosBuilder';

type Tab = 'datos' | 'items' | 'secciones' | 'imagenes' | 'json' | 'html' | 'preview' | 'registros';
const tabs: { id: Tab; label: string }[] = [
  { id: 'datos', label: 'Datos' }, { id: 'items', label: 'Items' }, { id: 'secciones', label: 'Secciones' }, { id: 'imagenes', label: 'Imágenes' },
  { id: 'json', label: 'JSON' }, { id: 'html', label: 'HTML' }, { id: 'preview', label: 'Vista previa' }, { id: 'registros', label: 'Registros BD' },
];

interface RegistroRow { id: string; cliente: string; numero_cliente?: string | null; empresa_cliente?: string | null; titulo?: string | null; fecha?: string | null; estado?: string | null; total_con_iva?: number | null; public_link?: string | null; generated_at?: string | null; }

function Input({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400"><span>{label}</span><input type={type} value={value} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" /></label>;
}
function Textarea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400"><span>{label}</span><textarea rows={rows} value={value} onChange={(e)=>onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" /></label>;
}
const splitLines = (v: string) => v.split('\n').map(s => s.trim()).filter(Boolean);
const joinLines = (v: string[]) => v.join('\n');

export default function PresupuestosBuilderPage() {
  const [budgets, setBudgets] = useState<PresupuestoPro[]>([baseBudgetExample]);
  const [selectedId, setSelectedId] = useState(baseBudgetExample.id);
  const [tab, setTab] = useState<Tab>('datos');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [message, setMessage] = useState('');
  const [savingDb, setSavingDb] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroRow[]>([]);
  const [registrosError, setRegistrosError] = useState('');

  useEffect(() => { const loaded = loadBudgets(); setBudgets(loaded); setSelectedId(loaded[0]?.id || baseBudgetExample.id); }, []);
  const selected = useMemo(() => calculateBudget(budgets.find(b => b.id === selectedId) || budgets[0] || baseBudgetExample), [budgets, selectedId]);
  const publicLink = typeof window !== 'undefined' ? `${window.location.origin}/presupuestos/${selected.slug}` : `/presupuestos/${selected.slug}`;
  const persist = (next: PresupuestoPro[]) => { setBudgets(next); saveBudgets(next); };
  const update = (patch: Partial<PresupuestoPro>) => persist(budgets.map(b => b.id === selected.id ? calculateBudget({ ...b, ...patch, updated_at: new Date().toISOString() }) : b));

  async function save() {
    const finalBudget = calculateBudget({ ...selected, updated_at: new Date().toISOString() });
    persist(budgets.map(b => b.id === selected.id ? finalBudget : b));
    setSavingDb(true);
    setMessage('Guardando presupuesto y registro en base de datos...');
    try {
      const res = await fetch('/api/admin/presupuestos/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presupuesto: {
            ...finalBudget,
            numero_cliente: finalBudget.telefono_whatsapp || '',
            public_link: publicLink,
            meta: {
              modulo: 'constructor_presupuestos',
              tipo_documento: 'presupuesto_comercial',
              empresa: finalBudget.empresa_cliente,
              cliente_numero: finalBudget.telefono_whatsapp || '',
              cliente_email: finalBudget.email_cliente || '',
              guardado_desde: '/admin/presupuestos',
            },
          },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; id?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setMessage(`Guardado local y registrado en BD: ${json.id || 'ok'}`);
      void loadRegistros();
    } catch (err) {
      setMessage(`Guardado local OK, pero falló BD: ${(err as Error).message}`);
    } finally {
      setSavingDb(false);
      setTimeout(()=>setMessage(''),3500);
    }
  }

  async function loadRegistros() {
    setRegistrosError('');
    try {
      const res = await fetch('/api/admin/presupuestos/registros', { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as { data?: { rows?: RegistroRow[]; data?: RegistroRow[] }; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setRegistros(json.data?.rows || json.data?.data || []);
    } catch (err) {
      setRegistrosError((err as Error).message);
    }
  }

  const nuevo = () => { const n = normalizeBudget({ ...baseBudgetExample, id: createBudgetId(), slug: slugifyBudget(`nuevo-${Date.now()}`), cliente: 'Nuevo cliente', empresa_cliente: '', email_cliente: '', titulo: 'Nuevo presupuesto', telefono_whatsapp: '', created_at: new Date().toISOString() }); persist([n, ...budgets]); setSelectedId(n.id); setTab('datos'); };
  const duplicar = () => { const d = normalizeBudget({ ...selected, id: createBudgetId(), slug: `${selected.slug}-copia-${Date.now().toString(36)}`, titulo: `${selected.titulo} — copia`, estado: 'borrador' }); persist([d, ...budgets]); setSelectedId(d.id); };
  const removeBudget = (id: string) => { const next = budgets.filter(b => b.id !== id); persist(next.length ? next : [baseBudgetExample]); setSelectedId((next[0] || baseBudgetExample).id); };
  const copyLink = async () => { await navigator.clipboard.writeText(publicLink); setMessage('Link público copiado.'); setTimeout(()=>setMessage(''),1800); };
  const importJson = () => { try { const parsed = JSON.parse(jsonText); const imported = normalizeBudget(parsed); persist([imported, ...budgets.filter(b => b.id !== imported.id)]); setSelectedId(imported.id); setJsonError(''); setMessage('JSON importado correctamente.'); } catch (e) { setJsonError(`JSON inválido: ${(e as Error).message}`); } };
  const addItem = () => update({ items: [...selected.items, { id: createBudgetId('item'), nombre: '', descripcion: '', categoria: '', cantidad: 1, unidad: 'un', precio_unitario: 0, total: 0, orden: selected.items.length + 1 }] });
  const patchItem = (id: string, patch: Partial<PresupuestoItem>) => update({ items: selected.items.map(it => it.id === id ? { ...it, ...patch } : it) });
  const addImage = () => update({ imagenes: [...selected.imagenes, { id: createBudgetId('img'), url: '', titulo: '', descripcion: '', orden: selected.imagenes.length + 1 }] });
  const patchImage = (id: string, patch: Partial<PresupuestoImagen>) => update({ imagenes: selected.imagenes.map(img => img.id === id ? { ...img, ...patch } : img) });
  const openMediaPicker = (targetId: string | null = null) => { setImageTargetId(targetId); setMediaPickerOpen(true); };
  const selectMediaAsset = (asset: MediaAsset) => {
    const title = asset.alt || asset.path?.split('/').pop()?.replace(/[-_]/g, ' ') || 'Imagen del proyecto';
    const description = `Origen: ${asset.source === 'cloudinary' ? 'Cloudinary' : 'Base de datos'}${asset.folder ? ` · Carpeta: ${asset.folder}` : ''}`;
    if (imageTargetId) update({ imagenes: selected.imagenes.map(img => img.id === imageTargetId ? { ...img, url: asset.url, titulo: img.titulo || title, descripcion: img.descripcion || description } : img) });
    else update({ imagenes: [...selected.imagenes, { id: createBudgetId('img'), url: asset.url, titulo: title, descripcion: description, orden: selected.imagenes.length + 1 }] });
    setMediaPickerOpen(false); setImageTargetId(null); setMessage('Imagen incorporada desde la biblioteca de medios.'); setTimeout(()=>setMessage(''),1800);
  };

  return <AdminPage>
    <AdminPageHeader eyebrow="Soluciones Fabris · Constructor comercial" title="Presupuestos profesionales" description="Crea propuestas editables, visuales, importables por JSON, registrables en base de datos y compartibles mediante link público." icon={FileText} />
    <AdminMotion><div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <AdminCard className="h-max"><div className="mb-4 flex gap-2"><button onClick={nuevo} className="flex-1 rounded-2xl bg-yellow-400 px-3 py-2 text-sm font-black text-black"><Plus className="mr-1 inline h-4 w-4"/>Nuevo</button><button onClick={duplicar} className="rounded-2xl border border-white/10 px-3 py-2 text-sm font-bold text-white">Duplicar</button></div><div className="space-y-2">{budgets.map(b => <button key={b.id} onClick={()=>setSelectedId(b.id)} className={`w-full rounded-2xl border p-3 text-left transition ${b.id===selected.id?'border-yellow-400/60 bg-yellow-400/10':'border-white/10 bg-black/30 hover:border-white/25'}`}><b className="block text-sm text-white">{b.cliente}</b><span className="line-clamp-2 text-xs text-zinc-400">{b.titulo}</span><span className="mt-2 block text-xs font-bold text-yellow-300">{formatBudgetMoney(calculateBudget(b).total_con_iva)}</span></button>)}</div><button onClick={()=>removeBudget(selected.id)} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-red-300"><Trash2 className="h-4 w-4"/>Eliminar seleccionado</button></AdminCard>
      <div className="space-y-5">
        <AdminCard><div className="flex flex-wrap items-center gap-2"><button onClick={()=>void save()} disabled={savingDb} className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black disabled:opacity-60"><Save className="mr-1 inline h-4 w-4"/>{savingDb ? 'Guardando...' : 'Guardar + registrar BD'}</button><button onClick={()=>setTab('preview')} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white"><Eye className="mr-1 inline h-4 w-4"/>Vista previa</button><button onClick={copyLink} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white"><Copy className="mr-1 inline h-4 w-4"/>Copiar link público</button><button onClick={()=>window.print()} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white"><Printer className="mr-1 inline h-4 w-4"/>Exportar/Imprimir PDF</button>{message && <span className="text-sm font-bold text-emerald-300">{message}</span>}</div><div className="mt-4 flex flex-wrap gap-2">{tabs.map(t => <button key={t.id} onClick={()=>{ setTab(t.id); if (t.id === 'registros') void loadRegistros(); }} className={`rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest ${tab===t.id?'bg-yellow-400 text-black':'border border-white/10 text-zinc-300'}`}>{t.label}</button>)}</div></AdminCard>
        {tab==='datos' && <AdminCard><div className="grid gap-4 md:grid-cols-2"><Input label="Proveedor" value={selected.proveedor} onChange={v=>update({proveedor:v})}/><Input label="Cliente" value={selected.cliente} onChange={v=>update({cliente:v})}/><Input label="Número cliente / WhatsApp" value={selected.telefono_whatsapp || ''} onChange={v=>update({telefono_whatsapp:v})} placeholder="+56 9..."/><Input label="Email cliente para confirmación" type="email" value={selected.email_cliente || ''} onChange={v=>update({email_cliente:v})} placeholder="cliente@empresa.cl"/><Input label="Empresa cliente" value={selected.empresa_cliente} onChange={v=>update({empresa_cliente:v})}/><Input label="Ciudad" value={selected.ciudad} onChange={v=>update({ciudad:v})}/><Input label="Título" value={selected.titulo} onChange={v=>update({titulo:v, slug: slugifyBudget(`${selected.cliente}-${v}`)})}/><Input label="Slug" value={selected.slug} onChange={v=>update({slug:slugifyBudget(v)})}/><Input label="Fecha" type="date" value={selected.fecha} onChange={v=>update({fecha:v})}/><Input label="Validez" value={selected.validez} onChange={v=>update({validez:v})}/><Input label="Plazo entrega" value={selected.plazo_entrega} onChange={v=>update({plazo_entrega:v})}/><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400"><span>Estado</span><select value={selected.estado} onChange={e=>update({estado:e.target.value as PresupuestoPro['estado']})} className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"><option value="borrador">Borrador</option><option value="enviado">Enviado</option><option value="aprobado">Aprobado</option><option value="rechazado">Rechazado</option><option value="vencido">Vencido</option></select></label><Input label="Valor neto" type="number" value={selected.valor_neto} onChange={v=>update({valor_neto:Number(v), items: []})}/><Input label="IVA %" type="number" value={selected.iva_porcentaje} onChange={v=>update({iva_porcentaje:Number(v)})}/><div className="md:col-span-2"><Textarea label="Descripción" value={selected.descripcion} onChange={v=>update({descripcion:v})}/></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-black/40 p-4"><span className="text-xs text-zinc-400">Neto</span><b className="block text-yellow-300">{formatBudgetMoney(selected.valor_neto)}</b></div><div className="rounded-2xl bg-black/40 p-4"><span className="text-xs text-zinc-400">IVA</span><b className="block text-yellow-300">{formatBudgetMoney(selected.total_iva)}</b></div><div className="rounded-2xl bg-black/40 p-4"><span className="text-xs text-zinc-400">Total</span><b className="block text-yellow-300">{formatBudgetMoney(selected.total_con_iva)}</b></div></div></AdminCard>}
        {tab==='items' && <AdminCard><button onClick={addItem} className="mb-4 rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black"><Plus className="mr-1 inline h-4 w-4"/>Agregar item</button><div className="space-y-3">{selected.items.map(item => <div key={item.id} className="grid gap-2 rounded-3xl border border-white/10 bg-black/30 p-3 md:grid-cols-8"><Input label="Nombre" value={item.nombre} onChange={v=>patchItem(item.id,{nombre:v})}/><Input label="Categoría" value={item.categoria} onChange={v=>patchItem(item.id,{categoria:v})}/><Input label="Cantidad" type="number" value={item.cantidad} onChange={v=>patchItem(item.id,{cantidad:Number(v)})}/><Input label="Unidad" value={item.unidad} onChange={v=>patchItem(item.id,{unidad:v})}/><Input label="Precio unit." type="number" value={item.precio_unitario} onChange={v=>patchItem(item.id,{precio_unitario:Number(v)})}/><Input label="Orden" type="number" value={item.orden} onChange={v=>patchItem(item.id,{orden:Number(v)})}/><div className="rounded-2xl bg-yellow-400/10 p-3 text-sm font-black text-yellow-300">{formatBudgetMoney(item.total)}</div><button onClick={()=>update({items:selected.items.filter(x=>x.id!==item.id)})} className="text-red-300"><Trash2/></button><div className="md:col-span-8"><Textarea label="Descripción" value={item.descripcion} onChange={v=>patchItem(item.id,{descripcion:v})} rows={2}/></div></div>)}</div></AdminCard>}
        {tab==='secciones' && <AdminCard><div className="grid gap-4 md:grid-cols-2"><Textarea label="Incluye · una línea por punto" value={joinLines(selected.incluye)} onChange={v=>update({incluye:splitLines(v)})} rows={8}/><Textarea label="No incluye" value={joinLines(selected.no_incluye)} onChange={v=>update({no_incluye:splitLines(v)})} rows={8}/><Textarea label="Materiales" value={joinLines(selected.materiales)} onChange={v=>update({materiales:splitLines(v)})} rows={8}/><Textarea label="Observación técnica" value={selected.observacion_tecnica} onChange={v=>update({observacion_tecnica:v})} rows={8}/></div><h3 className="mt-6 mb-3 font-black text-white">Forma de pago</h3><div className="space-y-2">{selected.forma_pago.map((p,i)=><div key={i} className="grid gap-2 md:grid-cols-[130px_1fr_50px]"><Input label="%" type="number" value={p.porcentaje} onChange={v=>update({forma_pago:selected.forma_pago.map((x,idx)=>idx===i?{...x,porcentaje:Number(v)}:x)})}/><Input label="Descripción" value={p.descripcion} onChange={v=>update({forma_pago:selected.forma_pago.map((x,idx)=>idx===i?{...x,descripcion:v}:x)})}/><button onClick={()=>update({forma_pago:selected.forma_pago.filter((_,idx)=>idx!==i)})} className="text-red-300"><Trash2/></button></div>)}</div><button onClick={()=>update({forma_pago:[...selected.forma_pago,{porcentaje:0,descripcion:'Nuevo hito de pago'}]})} className="mt-3 rounded-2xl border border-yellow-400/40 px-4 py-2 text-sm font-bold text-yellow-200">Agregar forma de pago</button></AdminCard>}
        {tab==='imagenes' && <AdminCard><div className="mb-4 flex flex-wrap gap-2"><button onClick={addImage} className="rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black"><ImagePlus className="mr-1 inline h-4 w-4"/>Agregar URL manual</button><button onClick={()=>openMediaPicker()} className="rounded-2xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-black text-yellow-200 hover:bg-yellow-400/20"><Database className="mr-1 inline h-4 w-4"/>Biblioteca / Base de datos</button></div><div className="space-y-3">{selected.imagenes.map(img=><div key={img.id} className="grid gap-3 rounded-3xl border border-white/10 bg-black/30 p-3 md:grid-cols-5"><Input label="URL externa / Cloudinary / BD" value={img.url} onChange={v=>patchImage(img.id,{url:v})}/><Input label="Título" value={img.titulo} onChange={v=>patchImage(img.id,{titulo:v})}/><Input label="Descripción" value={img.descripcion} onChange={v=>patchImage(img.id,{descripcion:v})}/><Input label="Orden" type="number" value={img.orden} onChange={v=>patchImage(img.id,{orden:Number(v)})}/><div className="flex flex-wrap items-end gap-2"><button onClick={()=>openMediaPicker(img.id)} className="rounded-xl border border-yellow-400/40 px-3 py-2 text-xs font-bold text-yellow-200">Elegir desde BD</button><button onClick={()=>update({imagenes:selected.imagenes.filter(x=>x.id!==img.id)})} className="rounded-xl border border-red-400/30 px-3 py-2 text-xs font-bold text-red-300"><Trash2 className="inline h-4 w-4"/></button></div>{img.url && <img src={img.url} alt={img.titulo || 'preview'} className="h-40 w-full rounded-2xl object-cover md:col-span-5"/>}</div>)}</div></AdminCard>}
        {tab==='json' && <AdminCard><Textarea label="Pega JSON estructurado" value={jsonText} onChange={setJsonText} rows={14}/>{jsonError && <p className="mt-2 text-sm font-bold text-red-300">{jsonError}</p>}<button onClick={importJson} className="mt-4 rounded-2xl bg-yellow-400 px-4 py-2 text-sm font-black text-black"><FileJson className="mr-1 inline h-4 w-4"/>Importar JSON</button></AdminCard>}
        {tab==='html' && <AdminCard><label className="mb-4 flex items-center gap-3 text-sm font-bold text-white"><input type="checkbox" checked={selected.usar_html_personalizado} onChange={e=>update({usar_html_personalizado:e.target.checked})}/> Usar HTML personalizado</label><Textarea label="HTML personalizado sanitizado al renderizar" value={selected.html_personalizado} onChange={v=>update({html_personalizado:v})} rows={16}/><div className="mt-3 flex gap-2"><button onClick={()=>update({html_personalizado:''})} className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-white">Limpiar HTML</button><button onClick={()=>update({html_personalizado:sanitizeBudgetHtml(selected.html_personalizado)})} className="rounded-2xl border border-yellow-400/40 px-4 py-2 text-sm font-bold text-yellow-200">Sanitizar ahora</button></div></AdminCard>}
        {tab==='preview' && <PresupuestoPublicView presupuesto={selected} publicLink={publicLink} adminPreview />}
        {tab==='registros' && <AdminCard><div className="mb-4 flex items-center justify-between gap-2"><h3 className="font-black text-white">Registros guardados en base de datos</h3><button onClick={()=>void loadRegistros()} className="rounded-2xl border border-yellow-400/40 px-4 py-2 text-sm font-bold text-yellow-200">Actualizar</button></div>{registrosError && <p className="mb-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{registrosError}</p>}<div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full text-left text-sm"><thead className="bg-white/5 text-xs uppercase tracking-widest text-zinc-400"><tr><th className="p-3">Fecha</th><th>Cliente</th><th>Número</th><th>Empresa</th><th>Total</th><th>Link</th></tr></thead><tbody>{registros.length === 0 ? <tr><td colSpan={6} className="p-5 text-center text-zinc-500">Sin registros cargados.</td></tr> : registros.map(r => <tr key={r.id} className="border-t border-white/10"><td className="p-3 text-xs text-zinc-400">{r.generated_at ? new Date(r.generated_at).toLocaleString('es-CL') : r.fecha}</td><td>{r.cliente}</td><td>{r.numero_cliente || '—'}</td><td>{r.empresa_cliente || '—'}</td><td className="font-bold text-yellow-300">{formatBudgetMoney(Number(r.total_con_iva || 0))}</td><td>{r.public_link ? <a href={r.public_link} target="_blank" rel="noreferrer" className="text-yellow-300 underline">Abrir</a> : '—'}</td></tr>)}</tbody></table></div></AdminCard>}
      </div>
    </div></AdminMotion>
    <MediaPicker open={mediaPickerOpen} onClose={()=>{ setMediaPickerOpen(false); setImageTargetId(null); }} onSelect={selectMediaAsset} defaultFolder="productos" defaultSource="insforge" />
  </AdminPage>;
}
