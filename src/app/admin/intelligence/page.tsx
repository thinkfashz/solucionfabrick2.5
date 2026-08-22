'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Bot, Boxes, Gauge, Loader2, PackageSearch, RefreshCw, ShieldCheck, ShoppingCart, Sparkles, Users } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminStat, AdminStats, AdminSurface } from '@/components/admin/AdminPage';

type Severity = 'high' | 'medium' | 'low';
type Product = { id:string; name?:string|null; stock?:number|null; image_url?:string|null; margin?:number|null };
type Payload = {
  generatedAt:string;
  periodDays:number;
  summary:{pageViews:number;visitors:number;sessions:number;contacts:number;productViews:number;addToCart:number;checkoutStarts:number;orders:number;activeProducts:number;criticalStock:number;runtimeErrorsHour:number};
  pages:Array<{name:string;value:number}>;
  sources:Array<{name:string;value:number}>;
  products:{criticalStock:Product[];incomplete:Product[];lowMargin:Product[]};
  errors:Array<{id?:string;error_message?:string|null;endpoint?:string|null;status_code?:number|null;created_at?:string|null}>;
  recommendations:Array<{severity:Severity;title:string;detail:string;href?:string}>;
  permissions:{mode:string;readOnlyAnalytics:boolean;productChangesRequireExplicitApproval:boolean;secretsAccessible:boolean;paymentCredentialsAccessible:boolean};
};

const fmt=new Intl.NumberFormat('es-CL');
function severityClass(level:Severity){return level==='high'?'bg-red-500':level==='medium'?'bg-amber-500':'bg-emerald-500';}

export default function FabrickIntelligencePage(){
  const [data,setData]=useState<Payload|null>(null);
  const [days,setDays]=useState('30');
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{const r=await fetch(`/api/admin/intelligence?days=${days}`,{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'No se pudo cargar Fabrick Intelligence.');setData(j);}catch(err){setError(err instanceof Error?err.message:'Error cargando el panel.');}finally{setLoading(false);}},[days]);
  useEffect(()=>{void load();},[load]);

  return <AdminPage>
    <AdminPageHeader eyebrow="Fabrick Intelligence" title="Centro de decisiones" description="Observa el negocio, detecta riesgos y convierte recomendaciones en acciones aprobables sin exponer credenciales ni ejecutar cambios sensibles por sorpresa." actions={<><select value={days} onChange={(e)=>setDays(e.target.value)} className="h-10 rounded-xl border border-black/10 bg-white/60 px-3 text-xs font-bold text-[#171612]"><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select><button onClick={()=>void load()} className="grid h-10 w-10 place-items-center rounded-xl bg-[#171612] text-[#ffb000]"><RefreshCw className="h-4 w-4"/></button></>}/>
    {loading?<div className="grid min-h-40 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-[#c77a00]"/></div>:null}
    {error?<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>:null}
    {data&&!loading?<>
      <AdminStats>
        <AdminStat label="Visitantes" value={fmt.format(data.summary.visitors)} note={`${fmt.format(data.summary.pageViews)} vistas`} icon={Users}/>
        <AdminStat label="Contactos" value={fmt.format(data.summary.contacts)} note="Leads y eventos de contacto" icon={Activity}/>
        <AdminStat label="Pedidos" value={fmt.format(data.summary.orders)} note={`${fmt.format(data.summary.checkoutStarts)} inicios de checkout`} icon={ShoppingCart}/>
        <AdminStat label="Errores última hora" value={fmt.format(data.summary.runtimeErrorsHour)} note="Runtime monitorizado" icon={Gauge}/>
      </AdminStats>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <AdminSurface title="Qué revisar ahora" description="Prioridades ordenadas por impacto y riesgo.">
          <div className="divide-y divide-black/10">{data.recommendations.length?data.recommendations.map((item,index)=><div key={`${item.title}-${index}`} className="flex gap-3 py-4 first:pt-0 last:pb-0"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${severityClass(item.severity)}`}/><div className="min-w-0 flex-1"><b className="text-sm text-[#171612]">{item.title}</b><p className="mt-1 text-xs leading-5 text-[#716b60]">{item.detail}</p></div>{item.href?<Link href={item.href} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-black/5 text-[#9b6a12]"><ArrowRight className="h-4 w-4"/></Link>:null}</div>):<p className="py-8 text-center text-sm text-[#817a6f]">No hay prioridades críticas en este momento.</p>}</div>
        </AdminSurface>

        <AdminSurface title="Control y permisos" description="Límites operativos del agente.">
          <div className="space-y-3 text-sm text-[#4f4a42]"><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700"/>Analítica: lectura segura</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700"/>Productos: propuesta + aprobación</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700"/>Secretos: bloqueados</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-700"/>Credenciales de pago: bloqueadas</p></div>
          <div className="mt-5 grid grid-cols-2 gap-2"><Link href="/admin/intelligence/today" className="rounded-xl bg-[#171612] px-3 py-2.5 text-center text-xs font-bold text-[#ffb000]">Prioridades de hoy</Link><Link href="/admin/intelligence/proposals" className="rounded-xl border border-black/10 px-3 py-2.5 text-center text-xs font-bold text-[#171612]">Propuestas</Link></div>
        </AdminSurface>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Rank title="Páginas más vistas" items={data.pages}/><Rank title="Principales orígenes" items={data.sources}/>
        <AdminSurface title="Salud del catálogo" description="Problemas que requieren revisión comercial."><Health label="Stock crítico" value={data.products.criticalStock.length}/><Health label="Fichas incompletas" value={data.products.incomplete.length}/><Health label="Margen bajo 25%" value={data.products.lowMargin.length}/><Link href="/admin/intelligence/operations" className="mt-4 flex items-center justify-between border-t border-black/10 pt-4 text-xs font-bold text-[#8b5a08]">Abrir operaciones <ArrowRight className="h-4 w-4"/></Link></AdminSurface>
      </div>

      <div className="grid gap-5 xl:grid-cols-2"><Products title="Stock crítico" products={data.products.criticalStock}/><Products title="Margen bajo" products={data.products.lowMargin}/></div>

      <AdminSurface title="Errores recientes" description="Eventos registrados durante la última hora.">
        {data.errors.length?<div className="divide-y divide-black/10">{data.errors.slice(0,8).map((item,index)=><div key={item.id||index} className="py-3 first:pt-0 last:pb-0"><div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-[#9b6a12]"><span>{item.status_code||'ERR'}</span><span>•</span><span>{item.endpoint||'runtime'}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#716b60]">{item.error_message||'Error sin detalle'}</p></div>)}</div>:<p className="py-6 text-sm text-emerald-800">Sin errores registrados durante la última hora.</p>}
      </AdminSurface>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 pt-4 text-[11px] text-[#8f887c]"><span>Actualizado {new Date(data.generatedAt).toLocaleString('es-CL')}</span><span>Modo {data.permissions.mode||'copiloto seguro'}</span></div>
    </>:null}
  </AdminPage>;
}

function Rank({title,items}:{title:string;items:Array<{name:string;value:number}>}){const max=Math.max(1,...items.map(i=>i.value));return <AdminSurface title={title}>{items.slice(0,7).map((item)=><div key={item.name} className="mb-3 last:mb-0"><div className="flex justify-between gap-3 text-xs"><span className="truncate text-[#716b60]">{item.name}</span><b className="text-[#171612]">{fmt.format(item.value)}</b></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/5"><span className="block h-full rounded-full bg-[#c77a00]" style={{width:`${Math.max(5,item.value/max*100)}%`}}/></div></div>)}</AdminSurface>}
function Health({label,value}:{label:string;value:number}){return <div className="flex items-center justify-between border-b border-black/10 py-3 last:border-0"><span className="text-sm text-[#716b60]">{label}</span><b className={value?'text-amber-800':'text-emerald-800'}>{value}</b></div>}
function Products({title,products}:{title:string;products:Product[]}){return <AdminSurface title={title}>{products.length?<div className="divide-y divide-black/10">{products.slice(0,8).map((product)=><Link key={product.id} href={`/admin/productos/${product.id}/editar`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">{product.image_url?<img src={product.image_url} alt="" className="h-10 w-10 rounded-lg bg-white object-contain p-1"/>:<span className="grid h-10 w-10 place-items-center rounded-lg bg-black/5"><PackageSearch className="h-4 w-4"/></span>}<span className="min-w-0 flex-1"><b className="block truncate text-sm text-[#171612]">{product.name||'Producto'}</b><span className="text-[11px] text-[#817a6f]">Stock: {product.stock??0}{typeof product.margin==='number'?` · Margen: ${product.margin}%`:''}</span></span><ArrowRight className="h-4 w-4 text-[#c77a00]"/></Link>)}</div>:<p className="py-6 text-sm text-emerald-800">Sin alertas en esta categoría.</p>}</AdminSurface>}
