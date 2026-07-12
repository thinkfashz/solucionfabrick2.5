import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, Calculator, CheckCircle2, MessageCircle, ShieldCheck } from 'lucide-react';

type Props = { coverUrl?: string };

const HERO_IMAGE = '/images/fabrick-construction-hero.webp';

const SOLUTION_ROUTES = [
  { number: '01', title: 'Kit prefabricado', price: 'Desde $160.000/m²', note: 'Estructura para avanzar por etapas' },
  { number: '02', title: 'Remodelación', price: 'Referencia $380.000/m²', note: 'Ampliaciones y mejoras coordinadas' },
  { number: '03', title: 'Llave en mano', price: '$540.000–$780.000/m²', note: 'Vivienda estándar terminada' },
] as const;

export default function StaticConstructionHero({ coverUrl }: Props) {
  const customCover = coverUrl?.trim();

  return (
    <section className="relative isolate min-h-[690px] overflow-hidden bg-[#080704] px-4 pb-9 pt-24 text-white sm:px-6 lg:min-h-[720px] lg:px-8 lg:pt-28">
      {customCover ? (
        // CMS covers can come from Cloudinary or other approved remote sources.
        <img src={customCover} alt="Proyecto residencial Soluciones Fabrick en construcción" className="absolute inset-0 -z-30 h-full w-full object-cover object-[66%_center]" />
      ) : (
        <Image src={HERO_IMAGE} alt="Vivienda residencial en construcción con estructura Metalcon" className="-z-30 object-cover object-[68%_center] lg:object-center" fill priority quality={88} sizes="100vw" />
      )}
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(5,5,4,.97),rgba(5,5,4,.82)_48%,rgba(5,5,4,.28)),linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.84))]" />
      <div className="absolute inset-0 -z-10 opacity-25 [background-image:linear-gradient(rgba(255,255,255,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.09)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:linear-gradient(90deg,black,transparent_70%)]" />

      <div className="mx-auto grid min-h-[calc(690px-8rem)] max-w-[1380px] items-center gap-9 lg:min-h-[calc(720px-8rem)] lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="max-w-4xl py-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-yellow-200/25 bg-black/35 px-4 py-2 text-[10px] font-black uppercase tracking-[.22em] text-yellow-100 backdrop-blur-md"><ShieldCheck className="h-3.5 w-3.5 text-yellow-300" /> Presupuesto claro antes de construir</p>
          <h1 className="mt-6 max-w-4xl text-[clamp(3rem,7vw,6.5rem)] font-black leading-[.89] tracking-[-.065em]">Tu proyecto comienza con <span className="text-yellow-300">números claros.</span></h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-200 sm:text-lg sm:leading-8">Calcula una referencia para tu kit, cabaña, ampliación o casa llave en mano. Compara el alcance antes de comprometer dinero y valida los detalles con una persona.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="#calculadora-m2" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-yellow-300 px-7 text-sm font-black text-black shadow-[0_12px_40px_rgba(250,204,21,.16)] transition hover:-translate-y-0.5 hover:bg-white">Calcular mi proyecto <Calculator className="h-4 w-4" /></Link>
            <a href="https://wa.me/56930121625?text=Hola%20Soluciones%20Fabrick%2C%20quiero%20orientaci%C3%B3n%20para%20mi%20proyecto." target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/30 px-7 text-sm font-black text-white backdrop-blur-md transition hover:border-yellow-300/55 hover:text-yellow-200">Hablar por WhatsApp <MessageCircle className="h-4 w-4" /></a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-white/15 pt-5">
            {['Rango inmediato', 'Incluidos visibles', 'Validación técnica'].map((point) => <span key={point} className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-300"><CheckCircle2 className="h-4 w-4 text-yellow-300" />{point}</span>)}
          </div>

        </div>

        <aside className="hidden overflow-hidden rounded-[2rem] border border-white/15 bg-black/55 shadow-[0_24px_90px_rgba(0,0,0,.42)] backdrop-blur-xl lg:block">
          <div className="border-b border-white/10 px-6 py-5"><p className="text-[9px] font-black uppercase tracking-[.28em] text-yellow-300">Rutas de solución</p><p className="mt-2 text-sm leading-6 text-zinc-400">Compara el punto de partida que mejor representa tu proyecto.</p></div>
          <div className="divide-y divide-white/10">{SOLUTION_ROUTES.map((item) => <a key={item.number} href={item.number === '02' ? '/servicios' : '#calculadora-m2'} className="group grid grid-cols-[46px_1fr] gap-3 px-6 py-5 transition hover:bg-white/[.04]"><span className="text-2xl font-black tracking-[-.06em] text-yellow-300/55 transition group-hover:text-yellow-300">{item.number}</span><span><strong className="block text-base">{item.title}</strong><b className="mt-1 block text-xs text-yellow-100">{item.price}</b><small className="mt-1 block leading-5 text-zinc-500">{item.note}</small></span></a>)}</div>
          <p className="border-t border-white/10 px-6 py-4 text-[10px] leading-5 text-zinc-500">Valores referenciales con materiales estándar. La cotización final requiere evaluación.</p>
        </aside>
      </div>
      <a href="#calculadora-m2" aria-label="Ir a la calculadora" className="absolute bottom-5 right-5 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/45 text-yellow-300 backdrop-blur-md"><ArrowDown className="h-5 w-5 animate-bounce" /></a>
    </section>
  );
}
