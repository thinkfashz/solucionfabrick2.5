import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Hammer,
  Headphones,
  Home,
  Layers3,
  ShieldCheck,
  Snowflake,
  Truck,
  Wrench,
} from 'lucide-react';
import TiendaSection from '@/components/TiendaSection';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const VISUALS = {
  hero: `${CLOUD}/c_fill,g_auto,w_2200,h_1320/f_auto,q_auto:best/v1788843241/hero-house-desktop-v10.jpg`,
  airRoom: `${CLOUD}/c_fill,g_auto,w_1500,h_900/f_auto,q_auto:best/v1788843275/air-lifestyle-room-v10.jpg`,
  air: `${CLOUD}/f_auto,q_auto:best/v1788843315/air-split-premium-v10.png`,
  cement: `${CLOUD}/c_pad,b_transparent,w_900,h_900/f_auto,q_auto:best/v1788843289/cemento-melon-25kg-v10.jpg`,
  metalcom: `${CLOUD}/c_fill,g_auto,w_1200,h_900/f_auto,q_auto:best/v1788843302/metalcom-premium-v10.png`,
  remodel: `${CLOUD}/c_fill,g_auto,w_900,h_650/f_auto,q_auto:good/v1788557223/home-cocina-premium.jpg`,
  terrace: `${CLOUD}/c_fill,g_auto,w_900,h_650/f_auto,q_auto:good/v1788557248/home-terraza-premium.jpg`,
  foundation: `${CLOUD}/c_fill,g_auto,w_900,h_650/f_auto,q_auto:good/v1788557304/home-radier-fundacion.jpg`,
};

const QUICK_LINKS = [
  { label: 'Casas', href: '/servicios', Icon: Home },
  { label: 'Metalcom', href: '/servicios/metalcon', Icon: Hammer },
  { label: 'Aire acondicionado', href: '/herramientas/aire-acondicionado', Icon: Snowflake },
  { label: 'Radier', href: '/herramientas/radier', Icon: Layers3 },
  { label: 'Presupuesto', href: '/presupuesto', Icon: Calculator },
];

const PROJECTS = [
  { title: 'Casas modernas', subtitle: 'Diseño y funcionalidad', href: '/proyectos', image: VISUALS.hero },
  { title: 'Espacios de confort', subtitle: 'Remodelación interior', href: '/proyectos', image: VISUALS.remodel },
  { title: 'Radier y exteriores', subtitle: 'Bases para grandes ideas', href: '/proyectos', image: VISUALS.foundation },
];

export default function HomePremiumV10({
  copyrightText,
  socialLinks,
}: {
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}) {
  return (
    <main className="home-v10 bg-[#08090A] text-[#F7F7F2]">
      <section className="relative isolate min-h-[690px] overflow-hidden border-b border-white/10 pt-[72px] sm:min-h-[720px] lg:min-h-[690px] lg:pt-[76px]">
        <Image
          src={VISUALS.hero}
          alt="Casa contemporánea iluminada de Soluciones Fabrick"
          fill
          priority
          sizes="100vw"
          className="-z-30 object-cover object-[64%_center] sm:object-[58%_center] lg:object-center"
        />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(6,7,8,.96)_0%,rgba(6,7,8,.86)_32%,rgba(6,7,8,.25)_66%,rgba(6,7,8,.18)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(6,7,8,.93)_0%,rgba(6,7,8,.62)_47%,rgba(6,7,8,.74)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_25%_18%,rgba(255,230,0,.13),transparent_30rem)]" />

        <div className="mx-auto flex min-h-[610px] max-w-[1380px] items-end px-4 pb-7 pt-12 sm:px-6 sm:pb-9 lg:items-center lg:px-10 lg:pb-6 lg:pt-0">
          <div className="w-full max-w-[650px] lg:pb-12">
            <p className="mb-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.3em] text-[#FFE600] sm:text-xs">
              <span className="h-[3px] w-7 rounded-full bg-[#FFE600]" />
              Materiales que hacen grandes ideas
            </p>
            <h1 className="max-w-[11ch] text-[clamp(3rem,12vw,6.5rem)] font-black leading-[.88] tracking-[-.065em]">
              Construye hoy <span className="text-[#FFE600]">un mejor mañana.</span>
            </h1>
            <p className="mt-5 max-w-[35rem] text-sm leading-6 text-white/68 sm:text-base sm:leading-7 lg:text-lg">
              Todo lo que necesitas para construir, renovar y equipar tus espacios, con soluciones claras y respaldo experto.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/tienda" className="fabrick-pill inline-flex min-h-12 items-center gap-3 bg-[#FFE600] px-6 text-sm font-black text-black shadow-[0_12px_40px_rgba(255,230,0,.22)] hover:bg-[#FFF45C]">
                Ver productos <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/presupuesto" className="fabrick-pill hidden min-h-12 items-center gap-3 border border-white/25 bg-black/30 px-6 text-sm font-bold backdrop-blur sm:inline-flex hover:border-[#FFE600]/60 hover:text-[#FFE600]">
                Cotizar proyecto <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-2 border-t border-white/12 pt-5 sm:max-w-[570px] sm:gap-5">
              <Trust icon={<ShieldCheck />} title="Calidad" text="garantizada" />
              <Trust icon={<Truck />} title="Envíos" text="a todo Chile" />
              <Trust icon={<Headphones />} title="Asesoría" text="especializada" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/8 bg-[#0A0B0D] px-4 py-5 sm:px-6 lg:px-10 lg:py-7">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid grid-cols-5 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_LINKS.map(({ label, href, Icon }) => (
              <Link key={label} href={href} className="group flex min-w-[92px] flex-col items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/[.025] px-2 py-4 text-center transition hover:border-[#FFE600]/55 hover:bg-[#FFE600]/[.05] sm:min-w-0 sm:py-5">
                <Icon className="h-5 w-5 text-[#FFE600] sm:h-6 sm:w-6" strokeWidth={1.7} />
                <span className="mt-2 text-[10px] font-bold leading-3 text-white/80 sm:text-xs">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-[1380px]">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#FFE600]">Soluciones destacadas</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-3xl">Construye, equipa y mejora.</h2>
            </div>
            <Link href="/servicios" className="hidden items-center gap-2 text-xs font-bold text-white/55 transition hover:text-[#FFE600] sm:flex">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </div>

          <div className="grid gap-3 lg:grid-cols-12 lg:grid-rows-2">
            <article className="group relative min-h-[390px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#111214] lg:col-span-7 lg:row-span-2 lg:min-h-[580px]">
              <Image src={VISUALS.airRoom} alt="Ambiente contemporáneo preparado para climatización" fill sizes="(max-width:1024px) 100vw, 58vw" className="object-cover transition duration-700 group-hover:scale-[1.02]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,10,.94)_0%,rgba(8,9,10,.73)_42%,rgba(8,9,10,.17)_78%)]" />
              <Image src={VISUALS.air} alt="Aire acondicionado split" width={850} height={300} sizes="(max-width:640px) 54vw, 34vw" className="absolute right-[-4%] top-[19%] w-[55%] max-w-[610px] object-contain drop-shadow-[0_25px_45px_rgba(0,0,0,.5)] sm:right-[3%] sm:top-[15%] sm:w-[46%]" />
              <div className="pointer-events-none absolute right-[8%] top-[40%] h-[38%] w-[39%] bg-[radial-gradient(ellipse_at_top,rgba(55,169,255,.28),transparent_67%)] blur-xl" />
              <div className="relative z-10 flex h-full min-h-[390px] max-w-[420px] flex-col justify-end p-6 sm:p-8 lg:min-h-[580px] lg:justify-center lg:p-10">
                <span className="text-[9px] font-black uppercase tracking-[.28em] text-[#FFE600]">Climatización</span>
                <h3 className="mt-3 text-3xl font-black leading-[.96] tracking-[-.05em] sm:text-4xl">Confort en cada estación.</h3>
                <p className="mt-3 max-w-xs text-sm leading-6 text-white/58">Calcula BTU, visualiza el equipo y encuentra una solución adecuada para tu espacio.</p>
                <Link href="/herramientas/aire-acondicionado" className="fabrick-pill mt-6 inline-flex min-h-11 w-fit items-center gap-3 bg-[#FFE600] px-5 text-xs font-black text-black hover:bg-[#FFF45C]">Probar calculadora 3D <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </article>

            <FeatureCard
              className="lg:col-span-5"
              eyebrow="Construcción"
              title="Bases más fuertes"
              text="Cemento para radier, fundaciones y obra general."
              href="/tienda"
              cta="Ver materiales"
              image={VISUALS.cement}
              imageAlt="Saco de cemento de 25 kg"
              contain
            />
            <FeatureCard
              className="lg:col-span-5"
              eyebrow="Estructuras"
              title="Metalcom de alto desempeño"
              text="Soluciones livianas y versátiles para estructura y ampliación."
              href="/servicios/metalcon"
              cta="Ver Metalcom"
              image={VISUALS.metalcom}
              imageAlt="Perfiles de acero galvanizado Metalcom"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-[#0B0C0E] px-4 py-9 sm:px-6 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-[1380px]">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#FFE600]">Tienda Fabrick</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-3xl">Productos destacados</h2>
            </div>
            <Link href="/tienda" className="inline-flex items-center gap-2 text-xs font-bold text-white/55 transition hover:text-[#FFE600]">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <TiendaSection limit={3} title="Selección para tu proyecto" description="Stock, precio y detalle antes de comprar." primaryCtaLabel="Tienda completa" />
        </div>
      </section>

      <section className="px-4 py-9 sm:px-6 lg:px-10 lg:py-14">
        <div className="mx-auto max-w-[1380px]">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.24em] text-[#FFE600]">Ideas reales</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em] sm:text-3xl">Proyectos que inspiran</h2>
            </div>
            <Link href="/proyectos" className="inline-flex items-center gap-2 text-xs font-bold text-white/55 transition hover:text-[#FFE600]">Ver todos <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {PROJECTS.map((item) => (
              <Link key={item.title} href={item.href} className="group relative min-h-[230px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#111214] sm:min-h-[280px]">
                <Image src={item.image} alt={item.title} fill sizes="(max-width:640px) 100vw, 33vw" className="object-cover transition duration-700 group-hover:scale-[1.035]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                  <div><h3 className="text-base font-black">{item.title}</h3><p className="mt-1 text-xs text-white/52">{item.subtitle}</p></div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#FFE600]/45 bg-black/50 text-[#FFE600]"><ArrowRight className="h-4 w-4" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 sm:px-6 lg:px-10 lg:pb-16">
        <div className="mx-auto grid max-w-[1380px] gap-4 rounded-[2rem] border border-[#FFE600]/20 bg-[radial-gradient(circle_at_80%_0%,rgba(255,230,0,.12),transparent_24rem),#111214] p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center lg:p-11">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.25em] text-[#FFE600]">Tu proyecto comienza aquí</p>
            <h2 className="mt-2 max-w-[17ch] text-3xl font-black leading-[.98] tracking-[-.045em] sm:text-4xl">Hagamos realidad tu próximo espacio.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/52">Cuéntanos tu idea y recibe una orientación clara para avanzar.</p>
          </div>
          <Link href="/presupuesto" className="fabrick-pill inline-flex min-h-12 items-center justify-center gap-3 bg-[#FFE600] px-7 text-sm font-black text-black hover:bg-[#FFF45C]">Solicitar cotización <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-white/8 px-4 pb-28 pt-8 sm:px-6 md:pb-10 lg:px-10">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <FabrickFullLogo compact theme="light" />
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-white/42">
            <Link href="/servicios" className="hover:text-[#FFE600]">Servicios</Link>
            <Link href="/tienda" className="hover:text-[#FFE600]">Tienda</Link>
            <Link href="/proyectos" className="hover:text-[#FFE600]">Proyectos</Link>
            <Link href="/contacto" className="hover:text-[#FFE600]">Contacto</Link>
            {socialLinks?.instagram ? <a href={socialLinks.instagram} target="_blank" rel="noreferrer" className="hover:text-[#FFE600]">Instagram</a> : null}
          </div>
          <p className="text-[9px] text-white/28">{copyrightText || `© ${new Date().getFullYear()} Soluciones Fabrick.`}</p>
        </div>
      </footer>
    </main>
  );
}

function Trust({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex min-w-0 items-center gap-2 text-white/68 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0 [&>svg]:text-[#FFE600]"><span className="contents">{icon}</span><span className="min-w-0"><strong className="block truncate text-[10px] font-black text-white/85 sm:text-xs">{title}</strong><span className="block truncate text-[9px] text-white/42 sm:text-[10px]">{text}</span></span></div>;
}

function FeatureCard({ className = '', eyebrow, title, text, href, cta, image, imageAlt, contain = false }: { className?: string; eyebrow: string; title: string; text: string; href: string; cta: string; image: string; imageAlt: string; contain?: boolean }) {
  return <article className={`group relative min-h-[285px] overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#111214] ${className}`}>
    <Image src={image} alt={imageAlt} fill sizes="(max-width:1024px) 100vw, 42vw" className={`${contain ? 'object-contain object-[82%_center] p-6 sm:p-5' : 'object-cover object-center'} transition duration-700 group-hover:scale-[1.025]`} />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,10,.96)_0%,rgba(8,9,10,.84)_42%,rgba(8,9,10,.18)_82%)]" />
    <div className="relative z-10 flex min-h-[285px] max-w-[55%] flex-col justify-center p-6 sm:p-8">
      <span className="text-[9px] font-black uppercase tracking-[.24em] text-[#FFE600]">{eyebrow}</span>
      <h3 className="mt-2 text-2xl font-black leading-[.98] tracking-[-.045em] sm:text-3xl">{title}</h3>
      <p className="mt-3 text-xs leading-5 text-white/52 sm:text-sm">{text}</p>
      <Link href={href} className="fabrick-pill mt-5 inline-flex min-h-10 w-fit items-center gap-2 bg-[#FFE600] px-4 text-[10px] font-black text-black hover:bg-[#FFF45C]">{cta}<ArrowRight className="h-3.5 w-3.5" /></Link>
    </div>
  </article>;
}
