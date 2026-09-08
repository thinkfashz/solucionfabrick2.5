'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {MessageCircle,PackageCheck,ReceiptText,ShieldCheck,Truck} from 'lucide-react';
import {buildWhatsAppLink} from '@/lib/whatsapp';
import CheckoutStatusTimeline from '@/components/checkout/CheckoutStatusTimeline';
type Order={name?:string;price?:string;customerName?:string;address?:string;paymentMethod?:string;nextStep?:string;orderId?:string};
const CLOUD='https://res.cloudinary.com/disghf6xc/image/upload';
const BG=`${CLOUD}/c_fill,g_auto,w_1920,h_1200/e_blur:7/q_auto:good/f_auto/v1788671813/air-bedroom-background.jpg`;
const OK=`${CLOUD}/f_auto/q_auto:good/v1788676801/payment-approved-v8.png`;
export default function AceptadaClient(){
  const[order,setOrder]=useState<Order>({});
  useEffect(()=>{try{const raw=localStorage.getItem('fabrick_order_preview');if(raw)setOrder(JSON.parse(raw))}catch{}},[]);
  const wa=buildWhatsAppLink(`Hola Soluciones Fabrick, mi compra${order.orderId?` ${order.orderId}`:''} fue confirmada y quiero consultar el despacho.`);
  return <main className="relative min-h-screen overflow-hidden bg-[#08090a] px-4 py-7 text-white">
    <div className="pointer-events-none fixed inset-0"><img src={BG} alt="" className="h-full w-full scale-[1.03] object-cover opacity-55"/><div className="absolute inset-0 bg-[#070809]/70"/><div className="absolute inset-0 shadow-[inset_0_0_220px_rgba(0,0,0,.8)]"/></div>
    <div className="relative z-10 mx-auto max-w-4xl">
      <header className="flex items-center justify-between border-b border-white/10 pb-4"><img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-11 w-auto max-w-[220px] object-contain"/>{order.orderId?<span className="text-[9px] font-bold text-white/35">#{order.orderId}</span>:null}</header>
      <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/12 bg-[#101216]/88 shadow-[0_36px_120px_rgba(0,0,0,.5)] backdrop-blur-2xl">
        <div className="grid gap-3 p-6 text-center sm:p-9">
          <img src={OK} alt="" className="mx-auto h-36 w-36 object-contain sm:h-44 sm:w-44"/>
          <p className="text-[9px] font-black uppercase tracking-[.2em] text-emerald-400">Pago aprobado</p>
          <h1 className="mx-auto max-w-[13ch] text-4xl font-black leading-[.95] tracking-[-.055em] sm:text-5xl">Tu compra quedó confirmada.</h1>
          <p className="mx-auto max-w-lg text-xs leading-6 text-white/45">La orden fue registrada correctamente. El pago ya está confirmado y ahora continúa la preparación y coordinación de entrega.</p>
        </div>
        <div className="px-5 pb-5 sm:px-8 sm:pb-8"><CheckoutStatusTimeline outcome="accepted"/></div>
        <div className="grid border-t border-white/10 md:grid-cols-[1.15fr_.85fr]">
          <section className="p-5 sm:p-7">
            <div className="flex items-center gap-3"><ReceiptText className="h-5 w-5 text-[#F6A54E]"/><div><b>Resumen de la orden</b><p className="text-[9px] text-white/32">Información disponible al regresar del pago</p></div></div>
            <div className="mt-4 divide-y divide-white/8">{[['Producto',order.name||'Compra Soluciones Fabrick'],['Total pagado',order.price||'Confirmado por la pasarela'],['Cliente',order.customerName||'Datos registrados'],['Entrega',order.address||'Por coordinar'],['Método',order.paymentMethod||'Mercado Pago']].map(([l,v])=><div key={l} className="flex items-start justify-between gap-5 py-3 text-xs"><span className="text-white/32">{l}</span><b className="max-w-[65%] text-right">{v}</b></div>)}</div>
          </section>
          <section className="border-t border-white/10 p-5 md:border-l md:border-t-0 sm:p-7">
            <div className="grid grid-cols-3 gap-2">{[[ShieldCheck,'Pago protegido'],[PackageCheck,'Orden registrada'],[Truck,'Entrega coordinada']].map(([Icon,label])=>{const C=Icon as typeof ShieldCheck;return <div key={label as string} className="rounded-xl border border-white/8 bg-white/[.035] p-3 text-center"><C className="mx-auto h-4 w-4 text-[#F6A54E]"/><b className="mt-2 block text-[8px] leading-4 text-white/48">{label as string}</b></div>})}</div>
            <div className="mt-5 grid gap-2"><Link href="/mi-cuenta" className="flex min-h-12 items-center justify-center rounded-full bg-[#F58B24] px-5 text-sm font-black text-[#111214]">Ver mi pedido</Link><a href={wa} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[.05] px-5 text-sm font-black"><MessageCircle size={17}/>Consultar por WhatsApp</a><Link href="/tienda" className="flex min-h-10 items-center justify-center text-xs font-bold text-[#FFC27A]">Seguir comprando</Link></div>
          </section>
        </div>
      </section>
    </div>
  </main>
}
