'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {AlertTriangle,LockKeyhole,MessageCircle,RefreshCcw,ShieldCheck} from 'lucide-react';
import {buildWhatsAppLink} from '@/lib/whatsapp';
import CheckoutStatusTimeline from '@/components/checkout/CheckoutStatusTimeline';
type Stored={productId?:string;name?:string;price?:string;img?:string};
const CLOUD='https://res.cloudinary.com/disghf6xc/image/upload';
const BG=`${CLOUD}/c_fill,g_auto,w_1920,h_1200/e_blur:7/q_auto:good/f_auto/v1788671813/air-bedroom-background.jpg`;
const FAIL=`${CLOUD}/f_auto/q_auto:good/v1788676857/payment-rejected-v8.png`;
export default function FallidaClient(){
  const[retry,setRetry]=useState('/checkout');
  useEffect(()=>{try{const raw=localStorage.getItem('fabrick_order_preview');if(raw){const p=JSON.parse(raw) as Stored,q=new URLSearchParams();if(p.productId)q.set('productId',p.productId);if(p.name)q.set('name',p.name);if(p.price)q.set('price',p.price);if(p.img)q.set('img',p.img);setRetry(q.toString()?`/checkout?${q}`:'/checkout')}}catch{}},[]);
  const wa=buildWhatsAppLink('Hola Soluciones Fabrick, tuve un problema al completar mi compra y necesito ayuda.');
  return <main className="relative min-h-screen overflow-hidden bg-[#08090a] px-4 py-7 text-white">
    <div className="pointer-events-none fixed inset-0"><img src={BG} alt="" className="h-full w-full scale-[1.03] object-cover opacity-48"/><div className="absolute inset-0 bg-[#08090a]/75"/><div className="absolute inset-0 shadow-[inset_0_0_220px_rgba(0,0,0,.82)]"/></div>
    <div className="relative z-10 mx-auto max-w-3xl">
      <header className="border-b border-white/10 pb-4"><img src="/brand/soluciones-fabrick-web.svg" alt="Soluciones Fabrick" className="h-11 w-auto max-w-[220px] object-contain"/></header>
      <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/12 bg-[#101216]/90 shadow-[0_36px_120px_rgba(0,0,0,.5)] backdrop-blur-2xl">
        <div className="p-6 text-center sm:p-9"><img src={FAIL} alt="" className="mx-auto h-36 w-36 object-contain sm:h-44 sm:w-44"/><p className="mt-2 text-[9px] font-black uppercase tracking-[.2em] text-red-300">Pago no completado</p><h1 className="mx-auto mt-2 max-w-[15ch] text-4xl font-black tracking-[-.055em] sm:text-5xl">No pudimos confirmar el pago.</h1><p className="mx-auto mt-4 max-w-md text-xs leading-6 text-white/45">Tu orden puede seguir disponible para reintentar. La tienda no guarda datos de tarjeta y no debes crear una segunda compra para probar otra vez.</p></div>
        <div className="px-5 pb-5 sm:px-8"><CheckoutStatusTimeline outcome="failed"/></div>
        <section className="border-t border-white/10 p-5 sm:p-7"><h2 className="flex items-center gap-2 font-black"><AlertTriangle size={18} className="text-[#F6A54E]"/>Qué puedes hacer ahora</h2><div className="mt-3 grid gap-2 sm:grid-cols-3">{[[RefreshCcw,'Reintentar','Usa la misma orden cuando sea posible.'],[LockKeyhole,'Pago protegido','La pasarela procesa los datos sensibles.'],[ShieldCheck,'Evita duplicados','Si aparece pendiente, espera la confirmación.']].map(([Icon,title,text])=>{const C=Icon as typeof ShieldCheck;return <div key={title as string} className="rounded-xl border border-white/8 bg-white/[.035] p-4"><C className="h-4 w-4 text-[#F6A54E]"/><b className="mt-2 block text-xs">{title as string}</b><p className="mt-1 text-[9px] leading-4 text-white/35">{text as string}</p></div>})}</div>
          <div className="mt-6 grid gap-2 sm:grid-cols-2"><Link href={retry} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F58B24] px-5 text-sm font-black text-[#111214]"><RefreshCcw size={17}/>Intentar de nuevo</Link><a href={wa} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[.05] px-5 text-sm font-black"><MessageCircle size={17}/>Pedir ayuda</a></div><Link href="/tienda" className="mt-2 flex min-h-10 items-center justify-center text-xs font-bold text-[#FFC27A]">Volver a la tienda</Link>
        </section>
      </section>
    </div>
  </main>
}
