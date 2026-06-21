'use client';

import { useMemo, useState } from 'react';
import ThreeRadierViewer from '@/components/presupuestos/ThreeRadierViewer';

type Shape = 'rect' | 'L' | 'U' | 'T' | 'H' | 'I';
type R = { nombre:string; shape:Shape; largo:number; ancho:number; brazoX:number; brazoY:number; vanoW:number; vanoD:number; almaW:number; almaD:number; espesor:number; base:number; gravillaBase:number; sacosM3:number; precioSaco:number; precioArena:number; precioGravilla:number; precioBase:number; precioMoldaje:number; manoObra:number; fijo:number; margen:number; iva:number };
type C = { cliente:string; empresa:string; email:string; telefono:string; ciudad:string };

const money = new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});
const num = new Intl.NumberFormat('es-CL',{maximumFractionDigits:2});
const whole = new Intl.NumberFormat('es-CL',{maximumFractionDigits:0});
const labels: Record<Shape,string> = { rect:'Recto', L:'Tipo L', U:'Tipo U', T:'Tipo T', H:'Tipo H', I:'Tipo I' };
const desc: Record<Shape,string> = { rect:'Losa completa rectangular.', L:'Dos brazos conectados en esquina.', U:'Radier con vano interior.', T:'Barra superior con tallo central.', H:'Dos franjas laterales con puente.', I:'Cabezales y alma central.' };
const initial:R = { nombre:'Radier terraza / patio', shape:'L', largo:6, ancho:4, brazoX:3, brazoY:2, vanoW:2, vanoD:2, almaW:1.4, almaD:2.2, espesor:10, base:10, gravillaBase:5, sacosM3:7, precioSaco:8200, precioArena:38000, precioGravilla:42000, precioBase:28000, precioMoldaje:2600, manoObra:12000, fijo:45000, margen:28, iva:19 };
const client0:C = { cliente:'', empresa:'', email:'', telefono:'', ciudad:'Chile' };
const shapes:Shape[] = ['rect','L','U','T','H','I'];

function uid(p='radier'){return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}
function slug(v:string){return v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||`presupuesto-${Date.now()}`}
function clamp(n:number,min:number,max:number){return Math.max(min,Math.min(max,n))}
function n(v:number,f=1){return Number.isFinite(v)&&v>0?v:f}

function calc(r:R){
  const largo=n(r.largo), ancho=n(r.ancho), box=largo*ancho;
  let area=box, per=2*(largo+ancho), formula=`${num.format(largo)}m × ${num.format(ancho)}m`;
  if(r.shape==='L'){const bx=clamp(n(r.brazoX,largo*.55),.2,largo), by=clamp(n(r.brazoY,ancho*.55),.2,ancho), cx=largo-bx, cy=ancho-by; area=box-cx*cy; per=2*(bx+ancho+cx+by); formula=`Caja ${num.format(largo)}×${num.format(ancho)} - corte ${num.format(cx)}×${num.format(cy)}`;}
  if(r.shape==='U'){const w=clamp(n(r.vanoW,largo*.38),.2,largo*.82), d=clamp(n(r.vanoD,ancho*.55),.2,ancho*.88); area=box-w*d; per=2*(largo+ancho)+2*d+w; formula=`Caja ${num.format(largo)}×${num.format(ancho)} - vano ${num.format(w)}×${num.format(d)}`;}
  if(r.shape==='T'){const aw=clamp(n(r.almaW,largo*.3),.2,largo), ad=clamp(n(r.almaD,ancho*.55),.2,ancho), barra=Math.max(ancho-ad,ancho*.22); area=largo*barra+aw*ad; per=2*largo+2*barra+2*ad+2*aw; formula=`Barra ${num.format(largo)}×${num.format(barra)} + tallo ${num.format(aw)}×${num.format(ad)}`;}
  if(r.shape==='H'){const col=clamp(n(r.brazoX,largo*.23),.2,largo*.42), bridge=clamp(n(r.almaD,ancho*.32),.2,ancho*.7), centro=Math.max(0,largo-col*2); area=col*ancho*2+centro*bridge; per=2*(largo+ancho)+4*centro; formula=`Columnas ${num.format(col)}m + puente ${num.format(centro)}×${num.format(bridge)}`;}
  if(r.shape==='I'){const alma=clamp(n(r.almaW,largo*.28),.2,largo), head=clamp(n(r.brazoY,ancho*.22),.2,ancho*.45), centro=Math.max(0,ancho-head*2); area=largo*head*2+alma*centro; per=4*largo+2*ancho+2*centro; formula=`Cabezales ${num.format(largo)}×${num.format(head)} + alma ${num.format(alma)}×${num.format(centro)}`;}
  area=Math.max(0,area);
  const hormigon=area*(r.espesor/100), base=area*(r.base/100), gravBase=area*(r.gravillaBase/100), sacos=Math.ceil(hormigon*r.sacosM3), kg=sacos*25, arena=hormigon*.52, gravilla=hormigon*.78;
  const cemento=sacos*r.precioSaco, cArena=arena*r.precioArena, cGravilla=gravilla*r.precioGravilla, cBase=(base+gravBase)*r.precioBase, cMoldaje=per*r.precioMoldaje, cMano=area*r.manoObra;
  const costo=cemento+cArena+cGravilla+cBase+cMoldaje+cMano+r.fijo, margen=costo*(r.margen/100), neto=costo+margen, iva=neto*(r.iva/100);
  return {area,per,hormigon,base,gravBase,sacos,kg,arena,gravilla,cemento,cArena,cGravilla,cBase,cMoldaje,cMano,costo,margen,neto,iva,total:neto+iva,formula,shape:r.shape,largo:r.largo,ancho:r.ancho,brazoX:r.brazoX,brazoY:r.brazoY,vanoW:r.vanoW,vanoD:r.vanoD,almaW:r.almaW,almaD:r.almaD,espesor:r.espesor};
}

export default function RadierBudgetEngineLite(){
  const [r,setR]=useState<R>(initial), [c,setC]=useState<C>(client0), [hours,setHours]=useState(720), [saving,setSaving]=useState(false), [status,setStatus]=useState(''), [link,setLink]=useState('');
  const x=useMemo(()=>calc(r),[r]);
  const items=[
    {nombre:'Cemento 25 kg',descripcion:`${x.sacos} sacos / ${x.kg} kg para ${num.format(x.hormigon)} m³`,cantidad:x.sacos,unidad:'saco',precio:r.precioSaco,total:x.cemento},
    {nombre:'Arena hormigón',descripcion:`${num.format(x.arena)} m³`,cantidad:x.arena,unidad:'m³',precio:r.precioArena,total:x.cArena},
    {nombre:'Gravilla hormigón',descripcion:`${num.format(x.gravilla)} m³`,cantidad:x.gravilla,unidad:'m³',precio:r.precioGravilla,total:x.cGravilla},
    {nombre:'Base + gravilla base',descripcion:`${num.format(x.base+x.gravBase)} m³`,cantidad:x.base+x.gravBase,unidad:'m³',precio:r.precioBase,total:x.cBase},
    {nombre:'Moldaje perimetral',descripcion:`${num.format(x.per)} ml`,cantidad:x.per,unidad:'ml',precio:r.precioMoldaje,total:x.cMoldaje},
    {nombre:'Mano de obra radier',descripcion:`${num.format(x.area)} m²`,cantidad:x.area,unidad:'m²',precio:r.manoObra,total:x.cMano},
    {nombre:'Gestión y margen',descripcion:`Margen ${r.margen}%`,cantidad:1,unidad:'margen',precio:x.margen,total:x.margen}
  ];
  async function save(){
    setSaving(true); setStatus('Guardando presupuesto…');
    try{
      const now=new Date(), exp=new Date(now.getTime()+Math.max(1,hours)*3600_000), cliente=c.cliente.trim()||'Cliente sin nombre', titulo=`${r.nombre} · ${labels[r.shape]} · ${num.format(x.area)} m² · ${x.sacos} sacos`;
      const presupuesto={id:uid(),slug:slug(`${cliente}-${titulo}`),proveedor:'Soluciones Fabrick',cliente,empresa_cliente:c.empresa,email_cliente:c.email,telefono_whatsapp:c.telefono,titulo,descripcion:`Radier ${labels[r.shape]}: ${num.format(x.area)} m², ${num.format(x.hormigon)} m³ de hormigón, ${x.sacos} sacos de cemento de 25 kg.`,ciudad:c.ciudad,fecha:now.toISOString().slice(0,10),validez:`${hours} horas`,plazo_entrega:'Según agenda, clima y fraguado',fecha_vencimiento:exp.toISOString(),fecha_activacion:now.toISOString(),estado:'enviado',valor_neto:Math.round(x.neto),iva_porcentaje:r.iva,total_iva:Math.round(x.iva),total_con_iva:Math.round(x.total),html_personalizado:'',usar_html_personalizado:false,json_presentacion:{motor:'radier',viewer:'three-radier',forma:r.shape,inputs:r,calculo:x},imagenes:[],archivos:[],incluye:['Cubicación por forma','Visor 3D interactivo Three.js','Cálculo de sacos 25 kg','Base, gravilla, moldaje y mano de obra'],no_incluye:['Permisos municipales','Mejoramiento de terreno no declarado'],materiales:['Cemento 25 kg','Arena','Gravilla','Estabilizado','Moldaje'],forma_pago:[{porcentaje:50,descripcion:'Reserva e inicio'},{porcentaje:50,descripcion:'Contra entrega o avance'}],observacion_tecnica:'Cálculo referencial editable. Validar terreno, pendiente y compactación antes de ejecutar.',items:items.map((it,i)=>({id:uid('item'),nombre:it.nombre,descripcion:it.descripcion,categoria:'Radier',cantidad:it.cantidad,unidad:it.unidad,precio_unitario:Math.round(it.precio),total:Math.round(it.total),orden:i+1})),created_at:now.toISOString(),updated_at:now.toISOString()};
      const publicLink=`${window.location.origin}/presupuestos/${presupuesto.slug}`;
      const res=await fetch('/api/admin/presupuestos/registros',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({presupuesto:{...presupuesto,public_link:publicLink,meta:{modulo:'motor_radier_lite',public_link:publicLink,expires_at:presupuesto.fecha_vencimiento}}})});
      const j=await res.json().catch(()=>({})) as {error?:string}; if(!res.ok) throw new Error(j.error||`Error ${res.status}`);
      setLink(publicLink); setStatus('Presupuesto guardado y listo para compartir.');
    }catch(e){setStatus(`Error: ${(e as Error).message}`)}finally{setSaving(false)}
  }
  return <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,rgba(245,158,11,.18),transparent_28rem),#050403] p-3 text-white sm:p-5"><section className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[390px_1fr]">
    <aside className="grid content-start gap-4 rounded-[2rem] border border-amber-300/15 bg-black/60 p-4 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Motor radier</p><h1 className="text-3xl font-black tracking-[-.05em]">Presupuesto rápido</h1>
      <Grid><Text label="Cliente" value={c.cliente} onChange={v=>setC({...c,cliente:v})}/><Text label="WhatsApp" value={c.telefono} onChange={v=>setC({...c,telefono:v})}/><Text label="Empresa" value={c.empresa} onChange={v=>setC({...c,empresa:v})}/><NumberInput label="Vence h" value={hours} onChange={setHours}/></Grid>
      <Text label="Nombre proyecto" value={r.nombre} onChange={v=>setR({...r,nombre:v})}/>
      <div className="grid grid-cols-2 gap-2">{shapes.map(s=><button key={s} onClick={()=>setR({...r,shape:s})} className={`rounded-2xl border p-3 text-left ${r.shape===s?'border-amber-300 bg-amber-400 text-black':'border-white/10 bg-white/[.05]'}`}><Plan shape={s} mini/><b className="mt-2 block">{labels[s]}</b><span className="text-[10px] opacity-70">{desc[s]}</span></button>)}</div>
      <Grid><NumberInput label="Largo total m" value={r.largo} onChange={v=>setR({...r,largo:v})}/><NumberInput label="Ancho total m" value={r.ancho} onChange={v=>setR({...r,ancho:v})}/><NumberInput label="Brazo / columna" value={r.brazoX} onChange={v=>setR({...r,brazoX:v})}/><NumberInput label="Brazo / cabezal" value={r.brazoY} onChange={v=>setR({...r,brazoY:v})}/><NumberInput label="Vano ancho" value={r.vanoW} onChange={v=>setR({...r,vanoW:v})}/><NumberInput label="Vano fondo" value={r.vanoD} onChange={v=>setR({...r,vanoD:v})}/><NumberInput label="Alma ancho" value={r.almaW} onChange={v=>setR({...r,almaW:v})}/><NumberInput label="Alma fondo" value={r.almaD} onChange={v=>setR({...r,almaD:v})}/></Grid>
      <Grid><NumberInput label="Espesor cm" value={r.espesor} onChange={v=>setR({...r,espesor:v})}/><NumberInput label="Sacos/m³" value={r.sacosM3} onChange={v=>setR({...r,sacosM3:v})}/><NumberInput label="Precio saco" value={r.precioSaco} onChange={v=>setR({...r,precioSaco:v})}/><NumberInput label="Mano obra m²" value={r.manoObra} onChange={v=>setR({...r,manoObra:v})}/><NumberInput label="Margen %" value={r.margen} onChange={v=>setR({...r,margen:v})}/><NumberInput label="IVA %" value={r.iva} onChange={v=>setR({...r,iva:v})}/></Grid>
    </aside>
    <section className="grid gap-5">
      <header className="rounded-[2rem] border border-amber-300/20 bg-black/55 p-5 shadow-2xl sm:p-7"><p className="text-[10px] font-black uppercase tracking-[.32em] text-amber-300">Visor + cubicación</p><h2 className="mt-2 text-4xl font-black tracking-[-.06em]">Radier {labels[r.shape]}</h2><p className="mt-2 text-sm text-zinc-400">{x.formula}</p><div className="mt-5 grid gap-3 sm:grid-cols-4"><Metric label="Área" value={`${num.format(x.area)} m²`}/><Metric label="Hormigón" value={`${num.format(x.hormigon)} m³`}/><Metric label="Sacos 25 kg" value={whole.format(x.sacos)} accent/><Metric label="Total" value={money.format(x.total)} accent/></div></header>
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]"><ThreeRadierViewer {...r} area={x.area} hormigon={x.hormigon} sacos={x.sacos}/><div className="grid gap-3">{items.map(it=><div key={it.nombre} className="rounded-2xl border border-white/10 bg-white/[.045] p-3"><div className="flex justify-between gap-3"><b>{it.nombre}</b><b className="text-amber-300">{money.format(it.total)}</b></div><p className="mt-1 text-xs text-zinc-400">{it.descripcion}</p></div>)}</div></div>
      <div className="rounded-[2rem] border border-amber-300/15 bg-black/55 p-4"><button disabled={saving} onClick={save} className="rounded-full bg-amber-400 px-5 py-3 text-sm font-black text-black disabled:opacity-60">Guardar BD + link</button><button onClick={()=>navigator.clipboard.writeText(`Radier ${labels[r.shape]}\nÁrea: ${num.format(x.area)} m²\nSacos 25kg: ${x.sacos}\nTotal: ${money.format(x.total)}`)} className="ml-2 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm font-black">Copiar resumen</button>{status&&<p className="mt-3 text-sm text-amber-100">{status}</p>}{link&&<a className="mt-2 block break-all text-sm text-amber-300 underline" href={link} target="_blank" rel="noreferrer">{link}</a>}</div>
    </section>
  </section></main>
}

function Grid({children}:{children:React.ReactNode}){return <div className="grid grid-cols-2 gap-3">{children}</div>}
function Metric({label,value,accent}:{label:string;value:string;accent?:boolean}){return <div className="rounded-2xl border border-white/10 bg-white/[.055] p-4"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p><b className={`mt-1 block text-xl ${accent?'text-amber-300':'text-white'}`}>{value}</b></div>}
function Text({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="grid gap-1 text-xs font-black uppercase tracking-widest text-zinc-500">{label}<input value={value} onChange={e=>onChange(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-amber-300"/></label>}
function NumberInput({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){return <label className="grid gap-1 text-xs font-black uppercase tracking-widest text-zinc-500">{label}<input type="number" value={Number.isFinite(value)?value:0} onChange={e=>onChange(Number(e.target.value)||0)} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-sm text-white outline-none focus:border-amber-300"/></label>}
function Plan({shape,mini=false}:{shape:Shape;mini?:boolean}){const common={fill:'url(#g)',stroke:'#fbbf24',strokeWidth:mini?3:2,strokeLinejoin:'round' as const};return <svg viewBox="0 0 100 70" className={`${mini?'h-14':'h-[420px]'} w-full rounded-2xl bg-[radial-gradient(circle,rgba(251,191,36,.12),transparent_55%),#080604]`}><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#fde68a"/><stop offset="55%" stopColor="#b45309"/><stop offset="100%" stopColor="#451a03"/></linearGradient></defs>{shape==='rect'&&<rect x="12" y="12" width="76" height="46" rx="4" {...common}/>} {shape==='L'&&<path d="M12 10H44V40H88V60H12Z" {...common}/>} {shape==='U'&&<path d="M12 10H34V43H66V10H88V60H12Z" {...common}/>} {shape==='T'&&<path d="M12 10H88V30H60V60H40V30H12Z" {...common}/>} {shape==='H'&&<path d="M12 10H32V30H68V10H88V60H68V40H32V60H12Z" {...common}/>} {shape==='I'&&<path d="M18 10H82V26H62V44H82V60H18V44H38V26H18Z" {...common}/>} {!mini&&<><text x="50" y="36" textAnchor="middle" fill="rgba(0,0,0,.38)" fontSize="18" fontWeight="900">{shape}</text><text x="50" y="66" textAnchor="middle" fill="#fef3c7" fontSize="5">Visor técnico de forma / relleno y área útil</text></>}</svg>}
