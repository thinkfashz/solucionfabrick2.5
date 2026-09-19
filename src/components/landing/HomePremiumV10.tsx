// Vercel preview retry marker: 2026-09-19
import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Images,
  Layers3,
  PanelsTopLeft,
  ReceiptText,
  Wind,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { HOME_PREMIUM_VISUALS } from '@/lib/homePremiumVisuals';
import ConstructionM2Calculator from './ConstructionM2Calculator';
import MetalconSeismicStory from './MetalconSeismicStory';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const ORIGINALS = CLOUD + '/soluciones-fabrick/diseno-20260908';
const RADIER_VISUAL = CLOUD + '/c_limit,w_1100/f_auto/q_auto/v1788934479/hormigon-radier.png';

const CATEGORIES = [
  {
    key: 'metal',
    eyebrow: 'Estructuras',
    title: 'Metalcon',
    text: 'Configura paneles, vanos, perfiles y refuerzos antes de pasar a presupuesto o simulación sísmica.',
    image: HOME_PREMIUM_VISUALS.metalcon,
    href: '/herramientas/metalcon',
    cta: 'Abrir configurador',
    alt: 'Estructura Metalcon y Steel Frame de referencia',
  },
  {
    key: 'radier',
    eyebrow: 'Obra base',
    title: 'Radier',
    text: 'Ingresa medidas, espesor y forma para estimar hormigón, materiales y referencia de costo.',
    image: RADIER_VISUAL,
    href: '/herramientas/radier',
    cta: 'Calcular radier',
    alt: 'Hormigón para cálculo de radier',
  },
  {
    key: 'air',
    eyebrow: 'Climatización',
    title: 'Aire acondicionado',
    text: 'Calcula BTU, compara capacidad y encuentra el equipo adecuado para tu espacio.',
    image: ORIGINALS + '/aire-acondicionado.png',
    href: '/herramientas/aire-acondicionado',
    cta: 'Calcular BTU',
    alt: 'Aire acondicionado split blanco',
  },
] as const;

const TOOLS = [
  { number: '01', title: 'Inspiraciones', text: 'Explora cocinas, viviendas y soluciones reales antes de decidir qué construir.', href: '/proyectos', cta: 'Explorar ideas', Icon: Images },
  { number: '02', title: 'Calculadora de aire', text: 'BTU, consumo estimado, equipo sugerido y acceso a compra o instalación.', href: '/herramientas/aire-acondicionado', cta: 'Calcular aire ideal', Icon: Wind },
  { number: '03', title: 'Calculadora de radier', text: 'Superficie, espesor, volumen y materiales con una lectura clara del proyecto.', href: '/herramientas/radier', cta: 'Calcular radier', Icon: Layers3 },
  { number: '04', title: 'Paneles Metalcon', text: 'Arma el panel, revisa perfiles y entiende la lógica de la estructura.', href: '/herramientas/metalcon', cta: 'Diseñar estructura', Icon: PanelsTopLeft },
  { number: '05', title: 'Simulador sísmico 4D', text: 'Prueba intensidad, profundidad, respuesta estructural, daño estimado y reparación referencial.', href: '/herramientas/metalcon/monitoreo', cta: 'Simular sismo', Icon: Activity },
  { number: '06', title: 'Presupuesto guiado', text: 'Selecciona servicios, agrega medidas y lleva una referencia ordenada a WhatsApp o correo.', href: '/presupuesto', cta: 'Armar presupuesto', Icon: ReceiptText },
] as const;

const HERO_STEPS = [
  ['01', 'Explora', 'Mira soluciones y referencias antes de elegir.'],
  ['02', 'Calcula', 'Convierte medidas en cantidades y rangos.'],
  ['03', 'Decide', 'Compara alternativas y arma tu presupuesto.'],
] as const;

export default function HomePremiumV10({
  copyrightText,
  socialLinks,
}: {
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}) {
  return (
    <main className="bg-[#08090A] text-[#F4F7F8]">
      <section aria-labelledby="home-title" className="mx-auto max-w-[1500px] border-b border-white/[.09] px-4 pb-0 pt-7 sm:px-6 lg:px-8 lg:pt-11">
        <div className="mx-auto grid max-w-[1360px] gap-6 lg:grid-cols-[minmax(0,.86fr)_minmax(480px,1.14fr)] lg:items-center lg:gap-11">
          <div className="py-3 lg:py-8">
            <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#FFE600]">Soluciones Fabrick · construcción + herramientas digitales</p>
            <h1 id="home-title" className="mt-3 max-w-[11ch] text-[clamp(2.8rem,6vw,5.2rem)] font-extrabold leading-[.93] tracking-[-.06em]">
              Antes de construir, <span className="text-[#FFE600]">entiende tu proyecto.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#B8C2C7] sm:text-[15px]">
              Calcula, compara y visualiza decisiones de obra antes de gastar. Menos improvisación, más claridad para avanzar.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/presupuesto" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#FFE600] px-5 text-xs font-extrabold text-[#08090A] transition-transform duration-150 active:scale-[.98]">
                Calcular mi proyecto <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/recorrido-3d" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 bg-black/20 px-5 text-xs font-extrabold text-white transition-colors hover:border-[#FFE600]/45">
                Recorrer vivienda 3D
              </Link>
            </div>
          </div>

          <Link href="/recorrido-3d" className="group relative block min-h-[320px] overflow-hidden border-t border-white/[.1] bg-[#111820] sm:min-h-[410px] lg:min-h-[460px] lg:border-l lg:border-t-0" aria-label="Abrir recorrido 3D de vivienda">
            <Image src={HOME_PREMIUM_VISUALS.house} alt="Vivienda contemporánea de referencia Soluciones Fabrick" fill priority unoptimized sizes="(max-width: 900px) 100vw, 48vw" className="object-cover object-center saturate-[.9] transition-transform duration-300 ease-out group-hover:scale-[1.015]" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
            <span className="absolute bottom-5 left-5 grid gap-1">
              <b className="text-sm">Recorrido 3D</b>
              <small className="text-[10px] text-white/[.65]">Explora espacios, materiales y estructura</small>
            </span>
            <span className="absolute bottom-5 right-5 grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-black/45 transition-colors group-hover:border-[#FFE600] group-hover:bg-[#FFE600] group-hover:text-[#08090A]"><ArrowRight className="h-4 w-4" /></span>
          </Link>
        </div>

        <div className="mx-auto mt-0 grid max-w-[1360px] border-t border-white/[.09] md:grid-cols-3">
          {HERO_STEPS.map(([number, title, text], index) => (
            <div key={number} className={'grid grid-cols-[32px_1fr] gap-x-3 py-4 md:px-5 md:py-5 ' + (index > 0 ? 'border-t border-white/[.08] md:border-l md:border-t-0' : '')}>
              <span className="row-span-2 pt-0.5 text-[9px] font-extrabold text-[#FFE600]">{number}</span>
              <strong className="text-xs">{title}</strong>
              <p className="mt-1 max-w-[28ch] text-[10px] leading-5 text-[#7F8E96]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <section aria-labelledby="start-title" className="pt-16 lg:pt-24">
          <header className="grid gap-4 pb-6 lg:grid-cols-[minmax(0,.8fr)_minmax(280px,.4fr)] lg:items-end lg:gap-16">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#FFE600]">Empieza por lo que necesitas resolver</p>
              <h2 id="start-title" className="mt-2 max-w-[13ch] text-[clamp(2.1rem,4.6vw,3.8rem)] font-extrabold leading-[.96] tracking-[-.055em]">Tres decisiones de obra, una ruta clara.</h2>
            </div>
            <p className="max-w-lg text-xs leading-6 text-[#91A0A7]">No necesitas recorrer todo el sitio. Entra directo al cálculo o configurador que corresponde.</p>
          </header>

          <div className="grid gap-2 lg:min-h-[620px] lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,.8fr)] lg:grid-rows-2">
            {CATEGORIES.map((item, index) => (
              <article key={item.key} className={'group relative isolate min-h-[230px] overflow-hidden border border-white/[.09] bg-[#10171B] ' + (index === 0 ? 'lg:row-span-2 lg:min-h-0' : '')}>
                <Image src={item.image} alt={item.alt} fill unoptimized sizes={index === 0 ? '(max-width: 900px) 100vw, 58vw' : '(max-width: 900px) 100vw, 38vw'} className={'-z-20 transition-transform duration-300 ease-out group-hover:scale-[1.015] ' + (item.key === 'metal' ? 'object-cover object-center saturate-[.82]' : 'object-contain object-right p-3 saturate-[.9]')} />
                <span className={'absolute inset-0 -z-10 ' + (index === 0 ? 'bg-gradient-to-t from-black/90 via-black/25 to-transparent' : 'bg-gradient-to-r from-black/95 via-black/60 to-black/5')} />
                <div className={index === 0 ? 'absolute inset-x-0 bottom-0 max-w-xl p-5 sm:p-7' : 'flex h-full w-[68%] flex-col justify-center p-5'}>
                  <p className="text-[8px] font-extrabold uppercase tracking-[.18em] text-[#FFE600]">{item.eyebrow}</p>
                  <h3 className={'mt-2 font-extrabold leading-none tracking-[-.045em] ' + (index === 0 ? 'text-4xl sm:text-5xl' : 'text-2xl')}>{item.title}</h3>
                  <p className="mt-2 max-w-[42ch] text-[11px] leading-5 text-[#BAC4C8]">{item.text}</p>
                  <Link href={item.href} className="mt-4 inline-flex w-fit items-center gap-2 border-b border-[#FFE600]/50 pb-1 text-[10px] font-extrabold text-white">{item.cta}<ArrowRight className="h-4 w-4" /></Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="walkthrough-title" className="mt-16 grid border-y border-white/[.1] lg:mt-24 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.72fr)]">
          <div className="relative min-h-[320px] overflow-hidden bg-[#111820] lg:min-h-[540px] lg:border-r lg:border-white/[.1]">
            <Image src={HOME_PREMIUM_VISUALS.architecture} alt="Estructura de vivienda para recorrido 3D Soluciones Fabrick" fill unoptimized sizes="(max-width: 900px) 100vw, 56vw" className="object-cover saturate-[.8]" />
          </div>
          <div className="flex flex-col justify-center py-8 lg:py-12 lg:pl-12">
            <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#FFE600]">Del plano a una experiencia entendible</p>
            <h2 id="walkthrough-title" className="mt-2 max-w-[12ch] text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[.97] tracking-[-.055em]">Mira la vivienda antes de hablar de terminaciones.</h2>
            <p className="mt-4 max-w-[48ch] text-xs leading-6 text-[#91A0A7]">Recorre ambientes, revisa capas constructivas y entiende dónde van estructura, instalaciones y materiales. El visor es una herramienta de comprensión; el diseño definitivo se valida para cada proyecto.</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href="/recorrido-3d" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#FFE600] px-5 text-xs font-extrabold text-[#08090A]">Abrir recorrido 3D <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/proyectos" className="border-b border-white/30 pb-1 text-xs font-extrabold text-white">Ver inspiraciones</Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="workbench-title" className="grid gap-8 py-16 lg:grid-cols-[minmax(260px,.72fr)_minmax(0,1.28fr)] lg:gap-16 lg:py-24">
          <header className="self-start lg:sticky lg:top-24">
            <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#FFE600]">Herramientas Fabrick</p>
            <h2 id="workbench-title" className="mt-2 max-w-[10ch] text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[.97] tracking-[-.055em]">No adivines. Usa la herramienta correcta.</h2>
            <p className="mt-4 max-w-[36ch] text-xs leading-6 text-[#91A0A7]">Calculadoras, visualización y presupuesto organizados por tarea, no por “features”.</p>
          </header>

          <div className="border-t border-white/[.12]">
            {TOOLS.map(({ number, title, text, href, cta, Icon }) => (
              <Link key={title} href={href} className="group grid min-h-[104px] grid-cols-[30px_34px_minmax(0,1fr)] items-center gap-3 border-b border-white/[.1] py-4 transition-colors hover:bg-white/[.025] sm:grid-cols-[40px_38px_minmax(0,1fr)_auto] sm:gap-4">
                <span className="text-[9px] font-extrabold text-[#5D6C74]">{number}</span>
                <span className="grid h-8 w-8 place-items-center text-[#FFE600]"><Icon className="h-[17px] w-[17px]" strokeWidth={1.7} /></span>
                <span className="grid gap-1"><strong className="text-[15px] tracking-[-.02em]">{title}</strong><small className="max-w-[58ch] text-[10px] leading-5 text-[#829199]">{text}</small></span>
                <span className="col-start-3 mt-1 flex items-center gap-2 text-[9px] font-extrabold text-white group-hover:text-[#FFE600] sm:col-start-auto sm:mt-0 sm:text-[10px]">{cta}<ArrowRight className="h-3.5 w-3.5" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="budget-title" className="flex flex-col gap-6 border-y border-white/[.12] py-8 lg:flex-row lg:items-end lg:justify-between lg:py-11">
          <div className="max-w-[800px]">
            <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#FFE600]">Presupuesto guiado</p>
            <h2 id="budget-title" className="mt-2 max-w-[17ch] text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[.97] tracking-[-.055em]">Pasa del cálculo a una referencia de costo ordenada.</h2>
            <p className="mt-4 max-w-[62ch] text-xs leading-6 text-[#91A0A7]">Selecciona el trabajo, ingresa tus medidas y compara mano de obra con trabajo vendido antes de conversar una cotización final.</p>
          </div>
          <Link href="/presupuesto" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#FFE600] px-5 text-xs font-extrabold text-[#08090A]">Armar presupuesto <ArrowRight className="h-4 w-4" /></Link>
        </section>

        <ConstructionM2Calculator />
      </div>

      <MetalconSeismicStory />

      <div className="mx-auto max-w-[1360px] px-4 sm:px-6 lg:px-8">
        <footer className="grid gap-6 border-t border-white/[.1] py-8 lg:grid-cols-[minmax(220px,.7fr)_minmax(0,1fr)]">
          <div>
            <FabrickFullLogo compact theme="light" />
            <p className="mt-3 max-w-[34ch] text-[10px] leading-5 text-[#77868E]">Herramientas claras para tomar mejores decisiones de construcción.</p>
          </div>
          <nav aria-label="Enlaces del pie" className="flex flex-wrap items-start gap-x-5 gap-y-3 lg:justify-end">
            <Link href="/servicios" className="text-[10px] text-[#9BA7AD] hover:text-white">Soluciones</Link>
            <Link href="/proyectos" className="text-[10px] text-[#9BA7AD] hover:text-white">Inspiraciones</Link>
            <Link href="/recorrido-3d" className="text-[10px] text-[#9BA7AD] hover:text-white">Recorrido 3D</Link>
            <Link href="/herramientas/metalcon/monitoreo" className="text-[10px] text-[#9BA7AD] hover:text-white">Simulador sísmico</Link>
            <Link href="/contacto" className="text-[10px] text-[#9BA7AD] hover:text-white">Contacto</Link>
            {socialLinks?.instagram ? <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="text-[10px] text-[#9BA7AD] hover:text-white">Instagram</a> : null}
          </nav>
          <p className="text-[9px] text-[#5D6970] lg:col-span-2">{copyrightText || '© ' + new Date().getFullYear() + ' Soluciones Fabrick.'}</p>
        </footer>
      </div>
    </main>
  );
}
