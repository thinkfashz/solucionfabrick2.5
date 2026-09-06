'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, CreditCard, Home, Leaf, Minus, Plus, ShoppingBag, Thermometer, Users, Volume2, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCatalogProducts } from '@/hooks/useCatalogProducts';
import { CAPS, buildAirOptions, clamp, type Capacity } from './airGameV5/model';

type RoomType = 'dormitorio' | 'living' | 'oficina' | 'cocina';
type Mode = 'frio' | 'calor' | 'ventilacion' | 'seco' | 'auto';

const CLOUD='https://res.cloudinary.com/disghf6xc/image/upload';
const BG_MOBILE=`${CLOUD}/c_fill,g_auto,w_1080,h_1920/e_blur:8/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const BG_DESKTOP=`${CLOUD}/c_fill,g_auto,w_1920,h_1080/e_blur:7/q_auto:good,f_auto/v1788671813/air-bedroom-background.jpg`;
const ROOM_FACTOR:Record<RoomType,number>={dormitorio:1,living:1.08,oficina:1.12,cocina:1.18};
const DB:Record<Capacity,number>={9000:19,12000:21,18000:24,24000:27};
const WIDTH:Record<Capacity,number>={9000:72,12000:80,18000:91,24000:100};
const CLP=new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0});

function Step({label,value,unit,min,max,step,onChange}:{label:string;value:number;unit?:string;min:number;max:number;step:number;onChange:(n:number)=>void}){
  const set=(n:number)=>onChange(Number(clamp(n,min,max).toFixed(1)));
  return <div className="rounded-2xl border border-white/10 bg-black/35 p-3 backdrop-blur-xl">
    <div className="flex items-center justify-between"><span className="text-[9px] font-bold text-white/45">{label}</span><b className="text-sm">{String(value).replace('.',',')}{unit?` ${unit}`:''}</b></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e=>set(Number(e.target.value))} className="mt-3 h-1.5 w-full accent-[#F5871F]" />
    <div className="mt-2 flex justify-end gap-1.5"><button onClick={()=>set(value-step)} className="grid h-8 w-8 place-items-center rounded-full bg-white/7"><Minus size={13}/></button><button onClick={()=>set(value+step)} className="grid h-8 w-8 place-items-center rounded-full bg-white/7"><Plus size={13}/></button></div>
  </div>;
}

function PremiumAir({cap,temp,mode,eco}:{cap:Capacity;temp:number;mode:Mode;eco:boolean}){
  const climate=mode==='calor'?{color:'#FFD166',label:'HEAT'}:mode==='frio'?{color:'#74DCFF',label:'COOL'}:mode==='seco'?{color:'#77E5C7',label:'DRY'}:mode==='auto'?{color:'#C9B7FF',label:'AUTO'}:{color:'#E6F7FF',label:'FAN'};
  return <div className="relative mx-auto transition-[width] duration-500" style={{width:`${WIDTH[cap]}%`}}>
    <div className="absolute inset-x-[9%] -bottom-6 h-14 rounded-full bg-black/45 blur-2xl"/>
    <div className="relative aspect-[3.55/1] overflow-hidden rounded-[clamp(20px,3vw,38px)] border border-white/80 bg-[linear-gradient(180deg,#fff_0%,#fafbfd_18%,#eef1f4_68%,#d9dee4_100%)] shadow-[0_35px_70px_rgba(0,0,0,.38),inset_0_2px_5px_rgba(255,255,255,.98)]">
      <div className="absolute inset-x-[4%] top-[10%] h-[2px] rounded-full bg-white/90"/>
      <div className="absolute left-[7%] top-[39%]"><p className="text-[clamp(7px,1vw,12px)] font-black tracking-[.28em] text-[#7d858e]">FABRICK</p><p className="mt-1 text-[clamp(5px,.75vw,8px)] font-bold tracking-[.2em] text-[#adb2b8]">INVERTER</p></div>
      <div className="absolute right-[8%] top-[31%] min-w-[66px] rounded-xl border border-[#7fdfff]/15 bg-[#071019]/92 px-3 py-2 text-right shadow-[0_0_18px_rgba(100,218,255,.12)]">
        <div className="font-mono text-[clamp(15px,2vw,24px)] font-black" style={{color:climate.color,textShadow:`0 0 8px ${climate.color}77`}}>{temp}°</div>
        <div className="flex justify-end gap-2 font-mono text-[6px] tracking-[.16em] text-white/40"><span>{climate.label}</span>{eco?<span className="text-[#7DE59B]">ECO</span>:null}</div>
      </div>
      <div className="absolute inset-x-[3%] bottom-[6%] h-[29%] bg-[linear-gradient(180deg,#e6eaee,#b8c0c8)] [clip-path:polygon(0_0,100%_0,98%_100%,2%_100%)]"/>
      <div className="absolute inset-x-[8%] bottom-[7%] h-[19%] overflow-hidden rounded-[10px] bg-[linear-gradient(180deg,#101419,#262d34)] shadow-[inset_0_6px_12px_rgba(0,0,0,.75)]">
        <div className="absolute inset-x-[3%] top-[20%] h-[3px] rounded-full bg-[#69737e]/70"/>
        <div className="absolute inset-x-[4%] bottom-[14%] flex h-[45%] justify-between">{Array.from({length:12}).map((_,i)=><span key={i} className="h-full w-[4px] -skew-x-[8deg] rounded-full bg-[#727c87]/70"/>)}</div>
      </div>
    </div>
  </div>;
}

export default function AirCatalogExperienceV7(){
  const router=useRouter();
  const {products,loading}=useCatalogProducts();
  const options=useMemo(()=>buildAirOptions(products),[products]);
  const [length,setLength]=useState(4.2),[width,setWidth]=useState(3.2),[height,setHeight]=useState(2.5),[people,setPeople]=useState(2);
  const [room,setRoom]=useState<RoomType>('dormitorio'),[capacity,setCapacity]=useState<Capacity>(12000),[manual,setManual]=useState(false);
  const [temp,setTemp]=useState(22),[hours,setHours]=useState(4),[fan,setFan]=useState(2),[mode,setMode]=useState<Mode>('frio'),[eco,setEco]=useState(true);
  const calc=useMemo(()=>{
    const area=length*width,volume=area*height,heightFactor=clamp(height/2.5,.88,1.35),btu=Math.ceil((area*600*heightFactor+Math.max(0,people-1)*600+900)*ROOM_FACTOR[room]);
    const recommended=(CAPS.find(c=>c>=btu)||24000) as Capacity;
    const air=options.find(x=>x.cap===capacity)||options[0];
    const load=mode==='calor'?.72:temp<=18?.82:temp<=20?.68:temp<=22?.56:temp<=24?.46:.38;
    const kwh=air.power*load*(.86+fan*.04)*(eco?.78:1)*hours*30;
    return{area,volume,btu,recommended,air,kwh,cost:kwh*263,db:DB[air.cap]+Math.max(0,fan-1)*2};
  },[length,width,height,people,room,capacity,options,temp,hours,fan,mode,eco]);
  if(!manual&&capacity!==calc.recommended) setTimeout(()=>setCapacity(calc.recommended),0);
  const product=products.find(p=>String(p.id)===String(calc.air.id));
  const live=calc.air.source==='catalogo'&&product&&Number(product.price)>0;
  const discount=product?Number(product.discount_percentage??product.discountPercentage??0):0;
  const price=product?Math.round(product.price*(1-discount/100)):0;
  const checkout=live?`/checkout?productId=${encodeURIComponent(product.id)}&name=${encodeURIComponent(product.name)}&price=${price}&quantity=1&img=${encodeURIComponent(product.image_url||product.img||'')}`:'';
  const shift=(d:-1|1)=>{const i=CAPS.indexOf(capacity);setCapacity(CAPS[(i+d+CAPS.length)%CAPS.length]);setManual(true)};
  const particle=mode==='calor'?'#FFD166':'#74DCFF';
  return <main className="relative min-h-[100svh] overflow-hidden bg-[#08090A] text-white">
    <style>{`@keyframes fall{0%{opacity:0;transform:translate3d(0,-12px,0) scale(.55)}18%{opacity:.9}100%{opacity:0;transform:translate3d(var(--dx),155px,0) scale(1.2)}}@media(prefers-reduced-motion:reduce){.flow-dot{display:none}}`}</style>
    <picture className="fixed inset-0"><source media="(min-width:900px)" srcSet={BG_DESKTOP}/><img src={BG_MOBILE} alt="" className="h-full w-full scale-[1.03] object-cover"/></picture>
    <div className="fixed inset-0 bg-[linear-gradient(90deg,rgba(5,6,7,.74),rgba(7,8,9,.20)_48%,rgba(5,6,7,.72)),linear-gradient(180deg,rgba(5,6,7,.38),rgba(5,6,7,.78))]"/>
    <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1540px] flex-col px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
      <header className="flex items-center justify-between gap-3"><button onClick={()=>router.push('/tienda')} className="grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-black/45 backdrop-blur-xl"><ArrowLeft size={18}/></button><img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-10 w-auto max-w-[190px] object-contain brightness-0 invert sm:h-12"/><div className="rounded-full border border-white/12 bg-black/45 px-3 py-2 text-[9px] font-bold text-white/55 backdrop-blur-xl">{calc.area.toFixed(1)} m² · {people} pers.</div></header>
      <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_330px]">
        <aside className="order-2 rounded-[1.8rem] border border-white/10 bg-black/48 p-4 backdrop-blur-2xl lg:order-1 lg:self-center">
          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB766]">Calculadora inteligente</p><h2 className="mt-1 text-2xl font-black">Tu espacio</h2>
          <div className="mt-3 grid grid-cols-4 gap-1.5 lg:grid-cols-2">{(['dormitorio','living','oficina','cocina'] as RoomType[]).map(r=><button key={r} onClick={()=>{setRoom(r);setManual(false)}} className={`rounded-xl px-2 py-2 text-[9px] font-bold capitalize ${room===r?'bg-[#F5871F] text-black':'bg-white/6 text-white/45'}`}>{r}</button>)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1"><Step label="Largo" value={length} unit="m" min={2.5} max={10} step={.1} onChange={v=>{setLength(v);setManual(false)}}/><Step label="Ancho" value={width} unit="m" min={2.2} max={8} step={.1} onChange={v=>{setWidth(v);setManual(false)}}/><Step label="Alto" value={height} unit="m" min={2.2} max={4} step={.1} onChange={v=>{setHeight(v);setManual(false)}}/><Step label="Personas" value={people} min={1} max={10} step={1} onChange={v=>{setPeople(Math.round(v));setManual(false)}}/></div>
          <div className="mt-3 rounded-2xl border border-[#F5871F]/25 bg-[#F5871F]/10 p-3"><span className="text-[9px] text-white/40">Recomendación</span><b className="mt-1 block text-lg text-[#FFBB70]">{calc.recommended.toLocaleString('es-CL')} BTU</b></div>
        </aside>
        <section className="order-1 relative min-h-[520px] overflow-hidden rounded-[2rem] border border-white/8 bg-black/10 lg:order-2 lg:min-h-[710px]">
          <button onClick={()=>shift(-1)} className="absolute left-3 top-[42%] z-30 grid h-12 w-12 place-items-center rounded-full border border-white/12 bg-black/45 backdrop-blur-xl"><ChevronLeft/></button><button onClick={()=>shift(1)} className="absolute right-3 top-[42%] z-30 grid h-12 w-12 place-items-center rounded-full border border-white/12 bg-black/45 backdrop-blur-xl"><ChevronRight/></button>
          <div className="absolute inset-x-0 top-[16%] px-12 sm:px-20"><PremiumAir cap={capacity} temp={temp} mode={mode} eco={eco}/><div className="pointer-events-none relative mx-auto mt-[-2px] h-[170px] w-[72%] overflow-hidden">{Array.from({length:mode==='frio'||mode==='calor'?22:9}).map((_,i)=><i key={i} className="flow-dot absolute top-0 h-1.5 w-1.5 rounded-full" style={{left:`${8+(i*17)%84}%`,background:particle,boxShadow:`0 0 12px ${particle}`,animation:`fall ${1.9+(i%6)*.22}s linear ${(i%8)*-.2}s infinite`,'--dx':`${(i%2?1:-1)*(12+(i%5)*8)}px`} as React.CSSProperties}/>)}</div></div>
          <div className="absolute inset-x-4 bottom-4 rounded-[1.7rem] border border-white/11 bg-black/58 p-4 backdrop-blur-2xl sm:inset-x-8 lg:inset-x-12"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.16em] text-[#FFB766]">{calc.air.source==='catalogo'?'Equipo de catálogo':'Referencia visual'}</p><h1 className="mt-1 truncate text-xl font-black sm:text-2xl">{calc.air.name}</h1></div><b className="shrink-0 text-2xl font-black text-[#FF9B3D]">{capacity/1000}K</b></div><div className="mt-3 grid grid-cols-4 gap-1.5 text-center"><Metric icon={<Home/>} label="Cobertura" value={`${calc.air.coverage} m²`}/><Metric icon={<Users/>} label="Personas" value={calc.air.people.replace(' personas','')}/><Metric icon={<Volume2/>} label="Ruido" value={`~${calc.db} dB`}/><Metric icon={<Leaf/>} label="Energía" value={calc.air.energy}/></div></div>
        </section>
        <aside className="order-3 rounded-[1.8rem] border border-white/10 bg-black/48 p-4 backdrop-blur-2xl lg:self-center"><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#FFB766]">Control y consumo</p><h2 className="mt-1 text-2xl font-black">{temp}°C</h2><input type="range" min={16} max={30} value={temp} onChange={e=>setTemp(Number(e.target.value))} className="mt-4 w-full accent-[#F5871F]"/><div className="mt-3 grid grid-cols-3 gap-1.5">{(['frio','calor','auto'] as Mode[]).map(m=><button key={m} onClick={()=>setMode(m)} className={`rounded-xl py-2 text-[9px] font-bold capitalize ${mode===m?'bg-white/12 text-white':'bg-white/5 text-white/40'}`}>{m}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2"><Step label="Horas/día" value={hours} unit="h" min={1} max={12} step={1} onChange={v=>setHours(Math.round(v))}/><Step label="Ventilador" value={fan} min={1} max={4} step={1} onChange={v=>setFan(Math.round(v))}/></div><button onClick={()=>setEco(v=>!v)} className={`mt-2 w-full rounded-xl py-2 text-[10px] font-black ${eco?'bg-[#256B3B]/70 text-[#BDF6C9]':'bg-white/5 text-white/40'}`}>ECO {eco?'ACTIVO':'APAGADO'}</button><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-2xl bg-white/5 p-3"><Zap size={16} className="text-[#FFB766]"/><b className="mt-2 block text-lg">{Math.round(calc.kwh)} kWh</b><span className="text-[8px] text-white/35">consumo mensual aprox.</span></div><div className="rounded-2xl bg-white/5 p-3"><CreditCard size={16} className="text-[#FFB766]"/><b className="mt-2 block text-lg">{CLP.format(calc.cost)}</b><span className="text-[8px] text-white/35">gasto energético aprox.</span></div></div>
          <div className="mt-4 border-t border-white/10 pt-4">{live?<><div className="flex items-end justify-between gap-3"><div><span className="text-[9px] text-white/35">Precio catálogo</span>{discount>0?<span className="ml-2 rounded-full bg-[#F5871F]/15 px-2 py-1 text-[8px] text-[#FFB766]">-{discount}%</span>:null}</div><b className="text-2xl">{CLP.format(price)}</b></div><button onClick={()=>router.push(checkout)} className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#F5871F] px-5 font-black text-[#111214] shadow-[0_14px_36px_rgba(245,135,31,.25)]"><ShoppingBag size={18}/>Comprar este equipo</button><p className="mt-2 text-center text-[8px] leading-4 text-white/30">Continúa al checkout real. Stock, precio, despacho e IVA se vuelven a validar en servidor antes del pago.</p></>:<><button disabled className="w-full rounded-full border border-white/10 bg-white/5 py-4 text-sm font-black text-white/32">Equipo aún no disponible para compra</button><p className="mt-2 text-center text-[8px] text-white/28">Esta capacidad se muestra como referencia y no genera una orden.</p></>}</div>
        </aside>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">{CAPS.map(c=><button key={c} onClick={()=>{setCapacity(c);setManual(true)}} className={`rounded-full px-4 py-2 text-[9px] font-black ${c===capacity?'bg-[#F5871F] text-black':'border border-white/10 bg-black/35 text-white/45'}`}>{c/1000}K</button>)}</div>
      <p className="mt-2 text-center text-[8px] text-white/25">Estimaciones de apoyo. Verifica ficha técnica y certificación SEC del modelo antes de comprar. {loading?'Sincronizando catálogo…':''}</p>
    </div>
  </main>;
}

function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-xl border border-white/7 bg-white/[.035] p-2"><span className="mx-auto block w-fit text-[#FFB766] [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span><b className="mt-1 block text-[10px]">{value}</b><span className="text-[7px] text-white/30">{label}</span></div>}
