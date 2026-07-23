'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  CircleDot,
  Clock3,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import TiendaSection from './TiendaSection';
import ContactForm from './ContactForm';
import FabrickLogo3D from './FabrickLogo3D';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { useSiteContent } from '@/hooks/useSiteContent';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

const SOCIAL_PROOF = [
  { icon: 'bx bx-badge-check', value: '8+ años', label: 'Experiencia construyendo y remodelando' },
  { icon: 'bx bx-map', value: 'Maule + Santiago', label: 'Evaluación según ubicación y alcance' },
  { icon: 'bx bx-receipt', value: 'Rango visible', label: 'Costos y partidas antes de decidir' },
  { icon: 'bx bx-user-check', value: 'Revisión humana', label: 'Validación técnica antes de ejecutar' },
] as const;

const FEATURES = [
  { number: '01', icon: 'bx bx-ruler', title: 'Decisiones con medidas', text: 'La calculadora transforma superficie, unidades o puntos en una referencia que puedes entender y comparar.' },
  { number: '02', icon: 'bx bx-layer', title: 'Alcance sin letra pequeña', text: 'Separamos qué incluye, qué queda fuera y qué condiciones pueden cambiar el valor final.' },
  { number: '03', icon: 'bx bx-cube-alt', title: 'Visualización 3D útil', text: 'Las herramientas de radier y climatización muestran capas, volumen, espacio y resultado de forma interactiva.' },
  { number: '04', icon: 'bx bx-shield-quarter', title: 'Ejecución validada', text: 'Antes de pagar o comenzar, una persona revisa medidas, acceso, materiales y viabilidad técnica.' },
] as const;

const SPIN_ITEMS = [
  { icon: 'bx bx-grid-alt', eyebrow: 'Base estructural', title: 'Radier calculado', text: 'Área, espesor, hormigón, sacos, base y presupuesto en una experiencia 3D.', href: '/herramientas/radier' },
  { icon: 'bx bx-building-house', eyebrow: 'Construcción', title: 'Kits prefabricados', text: 'Alternativas para avanzar por etapas con estructura y partidas claramente definidas.', href: '#calculadora-m2' },
  { icon: 'bx bx-paint-roll', eyebrow: 'Transformación', title: 'Remodelación', text: 'Coordinamos estructura, terminaciones e instalaciones para evitar trabajos aislados.', href: '/servicios' },
  { icon: 'bx bx-home-alt-2', eyebrow: 'Protección', title: 'Techumbre', text: 'Revisión, renovación de cubierta, fijaciones y remates según el área intervenida.', href: '/servicios' },
  { icon: 'bx bx-wind', eyebrow: 'Climatización', title: 'Aire acondicionado', text: 'Calcula BTU, compara equipos, instalación y consumo mensual antes de comprar.', href: '/herramientas/aire-acondicionado' },
  { icon: 'bx bx-bolt-circle', eyebrow: 'Instalaciones', title: 'Electricidad y redes', text: 'Puntos, canalización y habilitación coordinada con el resto de tu proyecto.', href: '/servicios' },
] as const;

const SERVICES = [
  { icon: 'bx bx-building-house', title: 'Construcción y ampliaciones', text: 'Kits, cabañas, viviendas, ampliaciones y proyectos llave en mano con alcance por etapas.', href: '#calculadora-m2', tag: 'Desde una idea' },
  { icon: 'bx bx-paint-roll', title: 'Remodelación integral', text: 'Redistribución, terminaciones, revestimientos y mejoras coordinadas en una sola propuesta.', href: '/servicios', tag: 'Transforma espacios' },
  { icon: 'bx bx-grid-alt', title: 'Radier y fundaciones', text: 'Cálculo por superficie y espesor con alternativas de materiales, instalación y refuerzo.', href: '/herramientas/radier', tag: 'Calculadora 3D' },
  { icon: 'bx bx-home-alt-2', title: 'Techumbre y tapagoteras', text: 'Diagnóstico, reparación, renovación de cubierta, canaletas, sellos y remates.', href: '/servicios', tag: 'Protección exterior' },
  { icon: 'bx bx-water', title: 'Gasfitería y soluciones sanitarias', text: 'Redes interiores, artefactos, reparaciones y soluciones exteriores como fosas sépticas.', href: '/servicios', tag: 'Instalación coordinada' },
  { icon: 'bx bx-bolt-circle', title: 'Electricidad y climatización', text: 'Puntos eléctricos, tableros, iluminación y aire acondicionado con revisión previa.', href: '/herramientas/aire-acondicionado', tag: 'Equipamiento' },
] as const;

export default function LandingSections({ copyrightText, socialLinks }: { copyrightText?: string; socialLinks?: { facebook?: string; instagram?: string; tiktok?: string } } = {}) {
  const footer = useSiteContent('footer');
  const year = String(new Date().getFullYear());
  const legalText = (copyrightText && copyrightText.trim())
    ? copyrightText.replaceAll('{year}', year)
    : (footer.legal || `© ${year} Soluciones Fabrick. Todos los derechos reservados.`).replaceAll('{year}', year);

  const fbHref = socialLinks?.facebook?.trim() || '#';
  const igHref = socialLinks?.instagram?.trim() || '#';
  const ttHref = socialLinks?.tiktok?.trim() || '#';
  const orientationLink = buildWhatsAppLink('Hola Soluciones Fabrick, revisé la página y quiero orientación para elegir la mejor solución.');

  const footerGroups: Array<{ title: string; items: Array<[string, string]> }> = [
    { title: 'Servicios', items: [['Calculadora', '#calculadora-m2'], ['Construcción', '/servicios'], ['Radier 3D', '/herramientas/radier'], ['Climatización', '/herramientas/aire-acondicionado']] },
    { title: 'Empresa', items: [['Proyectos', '/proyectos'], ['Garantías', '/garantias'], ['Contacto', '/contacto']] },
    { title: 'Ayuda', items: [['Presupuesto', '/presupuesto'], ['Mi cuenta', '/mi-cuenta'], ['Privacidad', '/legal/privacidad']] },
    { title: 'Contacto', items: [['WhatsApp', buildWhatsAppLink('Hola Soluciones Fabrick, necesito orientación.')], ['Solicitar evaluación', '/contacto']] },
  ];

  return (
    <div className="overflow-x-hidden bg-[#050403] text-white">
      <section id="confianza" className="relative border-y border-white/8 bg-[#080705] px-4 py-8 sm:px-6 md:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(250,204,21,.035),transparent)]" />
        <div data-reveal-group className="relative mx-auto grid max-w-[1380px] grid-cols-2 gap-2 lg:grid-cols-4">
          {SOCIAL_PROOF.map((item) => (
            <article key={item.value} className="group rounded-[1.35rem] border border-white/8 bg-white/[.025] p-4 transition hover:border-yellow-300/22 hover:bg-yellow-300/[.045]">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-yellow-300/[.09] text-xl text-yellow-300 transition group-hover:bg-yellow-300 group-hover:text-black"><i className={item.icon} aria-hidden /></span>
                <div><b className="block text-sm font-black tracking-[-.025em] sm:text-base">{item.value}</b><span className="mt-1 block text-[10px] leading-4 text-zinc-500 sm:text-xs sm:leading-5">{item.label}</span></div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="ventajas" className="relative overflow-hidden bg-[#050403] px-4 py-16 sm:px-6 md:px-12">
        <div data-parallax="-12" className="pointer-events-none absolute -left-44 top-0 h-[28rem] w-[28rem] rounded-full bg-yellow-300/8 blur-[130px]" />
        <div className="relative mx-auto max-w-[1380px]">
          <header data-reveal className="grid gap-5 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.28em] text-yellow-300">Una experiencia útil, no decorativa</p>
              <h2 className="mt-3 text-4xl font-black leading-[.95] tracking-[-.055em] md:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Entender primero. Construir después.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">Cada sección está diseñada para reducir incertidumbre: medidas visibles, comparaciones claras, herramientas 3D y contacto directo cuando hace falta validar.</p>
          </header>

          <div data-reveal-group className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => (
              <article key={feature.number} className="group relative min-h-[250px] overflow-hidden rounded-[1.65rem] border border-white/9 bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.015))] p-5 transition duration-500 hover:-translate-y-1 hover:border-yellow-300/25">
                <span className="absolute right-4 top-2 text-6xl font-black tracking-[-.08em] text-white/[.035] transition group-hover:text-yellow-300/[.08]">{feature.number}</span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-2xl text-black shadow-[0_14px_38px_rgba(250,204,21,.15)]"><i className={feature.icon} aria-hidden /></span>
                <h3 className="mt-7 text-xl font-black tracking-[-.035em]">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{feature.text}</p>
                <div className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-yellow-300 via-orange-400 to-transparent transition duration-500 group-hover:scale-x-100" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="experiencia" data-spin-carousel className="relative min-h-[980px] overflow-hidden border-y border-white/8 bg-[#090704] px-4 text-white sm:px-6 md:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(250,204,21,.11),transparent_25%),radial-gradient(circle_at_16%_18%,rgba(249,115,22,.08),transparent_25%),radial-gradient(circle_at_85%_82%,rgba(244,63,94,.075),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.045] [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:72px_72px]" />

        <div className="relative mx-auto max-w-[1380px] py-16 lg:sticky lg:top-16 lg:flex lg:min-h-[850px] lg:items-center lg:py-8">
          <div className="grid w-full items-center gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
            <header data-reveal className="relative z-20">
              <p className="inline-flex items-center gap-2 rounded-full border border-yellow-300/16 bg-yellow-300/[.06] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.24em] text-yellow-200"><CircleDot className="h-3.5 w-3.5" /> Spin carousel on scroll</p>
              <h2 className="mt-4 text-4xl font-black leading-[.93] tracking-[-.06em] sm:text-5xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Un ecosistema de soluciones alrededor de tu proyecto.</h2>
              <p className="mt-4 text-sm leading-7 text-zinc-400">Desplázate para recorrer las especialidades. El carrusel gira con ScrollTrigger y mantiene en el centro la visión completa de Fabrick.</p>
              <a href={orientationLink} target="_blank" rel="noopener noreferrer" className="fabrick-gradient-button mt-6 inline-flex min-h-13 items-center justify-center gap-2 rounded-full px-6 text-xs font-black text-black">Encontrar mi solución <MessageCircle className="h-4 w-4" /></a>
            </header>

            <div className="relative hidden min-h-[720px] lg:block">
              <div className="spin-carousel-stage absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2">
                <div className="spin-carousel-ring">
                  {SPIN_ITEMS.map((item, index) => {
                    const angle = index * (360 / SPIN_ITEMS.length);
                    return (
                      <div key={item.title} className="spin-card-shell" style={{ '--spin-angle': `${angle}deg`, '--spin-counter-angle': `${-angle}deg` } as CSSProperties}>
                        <Link href={item.href} className="spin-card-content group block rounded-[1.5rem] border border-white/10 bg-[#12100b]/92 p-4 shadow-[0_24px_70px_rgba(0,0,0,.38)] backdrop-blur-xl transition hover:border-yellow-300/35 hover:bg-[#17130c]">
                          <span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-300/[.1] text-2xl text-yellow-300 transition group-hover:bg-yellow-300 group-hover:text-black"><i className={item.icon} aria-hidden /></span>
                          <p className="mt-4 text-[8px] font-black uppercase tracking-[.22em] text-yellow-300">{item.eyebrow}</p>
                          <h3 className="mt-1.5 text-lg font-black tracking-[-.035em]">{item.title}</h3>
                          <p className="mt-2 text-[11px] leading-5 text-zinc-500">{item.text}</p>
                          <span className="mt-4 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[.14em] text-zinc-300">Explorar <ChevronRight className="h-3.5 w-3.5" /></span>
                        </Link>
                      </div>
                    );
                  })}
                </div>

                <div data-reveal className="fabrick-glass absolute left-1/2 top-1/2 z-20 h-56 w-56 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(250,204,21,.2),transparent_50%)]" />
                  <FabrickLogo3D height="100%" interactive={false} showHint={false} transparent showText={false} cameraZ={14} />
                  <div className="absolute inset-x-0 bottom-5 text-center"><p className="text-[8px] font-black uppercase tracking-[.24em] text-yellow-300">Soluciones Fabrick</p><p className="mt-1 text-[10px] text-zinc-500">Una visión · múltiples rutas</p></div>
                </div>
              </div>
            </div>

            <div data-reveal-group className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pr-8 lg:hidden">
              {SPIN_ITEMS.map((item) => (
                <Link key={item.title} href={item.href} className="w-[78vw] max-w-[320px] shrink-0 snap-center rounded-[1.5rem] border border-white/10 bg-white/[.035] p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-300 text-2xl text-black"><i className={item.icon} aria-hidden /></span>
                  <p className="mt-4 text-[8px] font-black uppercase tracking-[.22em] text-yellow-300">{item.eyebrow}</p>
                  <h3 className="mt-1.5 text-xl font-black">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[.14em] text-zinc-300">Explorar <ArrowRight className="h-3.5 w-3.5" /></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="servicios" className="relative bg-[#050403] px-4 py-16 sm:px-6 md:px-12">
        <div className="mx-auto max-w-[1380px]">
          <header data-reveal className="grid gap-5 lg:grid-cols-[.78fr_1.22fr] lg:items-end">
            <div><p className="text-[9px] font-black uppercase tracking-[.28em] text-yellow-300">Servicios conectados</p><h2 className="mt-3 text-4xl font-black leading-[.95] tracking-[-.055em] md:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Una empresa para resolver el proyecto completo.</h2></div>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">Evita coordinar especialistas aislados. Ordenamos construcción, reparación, instalaciones y terminaciones dentro de un alcance común.</p>
          </header>

          <div data-reveal-group className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {SERVICES.map((service, index) => (
              <Link key={service.title} href={service.href} className="group relative overflow-hidden rounded-[1.65rem] border border-white/9 bg-white/[.025] p-5 transition duration-500 hover:-translate-y-1 hover:border-yellow-300/28 hover:bg-yellow-300/[.035]">
                <div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-yellow-300 text-2xl text-black"><i className={service.icon} aria-hidden /></span><span className="text-4xl font-black tracking-[-.07em] text-white/[.045]">0{index + 1}</span></div>
                <p className="mt-6 text-[8px] font-black uppercase tracking-[.2em] text-yellow-300">{service.tag}</p>
                <h3 className="mt-2 text-xl font-black tracking-[-.035em]">{service.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{service.text}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-zinc-300 transition group-hover:text-yellow-200">Ver solución <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>

          <div data-reveal className="mt-5 flex flex-col gap-3 rounded-[1.5rem] border border-yellow-200/14 bg-[linear-gradient(100deg,rgba(250,204,21,.08),rgba(249,115,22,.045),transparent)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-300"><strong className="text-white">¿No sabes cuál servicio elegir?</strong> Cuéntanos comuna, superficie y objetivo; te ayudamos a ordenar el primer paso.</p>
            <a href={orientationLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[.065] px-5 text-xs font-black text-white backdrop-blur-xl transition hover:border-yellow-300/45 hover:bg-yellow-300 hover:text-black">Hablar con una persona <MessageCircle className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <section id="tienda" className="relative border-y border-white/8 bg-[#080705] px-4 py-10 sm:px-6 md:px-12">
        <div data-reveal className="mx-auto max-w-[1380px]">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[.22em] text-zinc-500"><Sparkles className="h-4 w-4 text-yellow-300" /> Equipamiento seleccionado <span>·</span> Producto + instalación</div>
          <TiendaSection limit={3} title="Productos que también resuelven" description="Equipos y productos útiles para completar tu proyecto. Revisa especificaciones, disponibilidad y opciones de instalación coordinada." />
        </div>
      </section>

      <section id="contacto" className="relative overflow-hidden bg-[#080705] px-4 py-16 sm:px-6 md:px-12">
        <div data-parallax="10" className="pointer-events-none absolute -right-44 top-0 h-[30rem] w-[30rem] rounded-full bg-orange-500/9 blur-[130px]" />
        <div className="relative mx-auto grid max-w-[1380px] gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
          <div data-reveal>
            <p className="text-[9px] font-black uppercase tracking-[.28em] text-yellow-300">Siguiente paso</p>
            <h2 className="mt-3 text-4xl font-black leading-[.95] tracking-[-.055em] md:text-6xl" style={{ fontFamily: 'Sora, Manrope, sans-serif' }}>Pasa de la referencia a una propuesta útil.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">Envíanos comuna, superficie y resultado esperado. Revisaremos viabilidad, alcance y la información que todavía falta para cotizar correctamente.</p>
            <div className="mt-6 grid gap-2">
              <ProofLine icon={<MapPin className="h-4 w-4" />} title="Base operativa" text="Linares, Región del Maule; evaluación de proyectos seleccionados en otras zonas." />
              <ProofLine icon={<Clock3 className="h-4 w-4" />} title="Respuesta ordenada" text="Recibimos tus datos y te indicamos qué hace falta para continuar." />
              <ProofLine icon={<ShieldCheck className="h-4 w-4" />} title="Sin precio improvisado" text="La referencia se confirma después de revisar las condiciones reales." />
            </div>
          </div>

          <div data-reveal className="fabrick-glass rounded-[1.8rem] p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-white/9 pb-4"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-yellow-300 text-black"><MessageCircle className="h-5 w-5" /></span><div><p className="text-sm font-black">Cuéntanos lo esencial</p><p className="mt-1 text-[10px] text-zinc-500">Formulario breve · respuesta personalizada</p></div></div>
            <ContactForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 bg-black px-4 py-9 sm:px-6 md:px-12">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid gap-7 lg:grid-cols-[1.05fr_1.95fr] lg:items-start">
            <div>
              <FabrickFullLogo compact priority theme="light" />
              <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">Construcción, remodelación y equipamiento con información clara antes de decidir.</p>
              <div className="mt-4 flex gap-2"><SocialLink href={fbHref} label="Facebook"><i className="bx bxl-facebook" aria-hidden /></SocialLink><SocialLink href={igHref} label="Instagram"><i className="bx bxl-instagram" aria-hidden /></SocialLink><SocialLink href={ttHref} label="TikTok"><i className="bx bxl-tiktok" aria-hidden /></SocialLink></div>
            </div>
            <div className="grid gap-2 md:grid-cols-4 md:gap-6">{footerGroups.map((group) => <FooterGroup key={group.title} {...group} />)}</div>
          </div>
          <div className="mt-7 flex flex-col gap-2 border-t border-white/8 pt-4 text-[9px] leading-5 text-zinc-600 md:flex-row md:items-center md:justify-between">
            <p className="md:hidden">© {year} Soluciones Fabrick · Valores referenciales sujetos a evaluación técnica.</p>
            <div className="hidden md:block" dangerouslySetInnerHTML={{ __html: legalText }} />
            <span className="inline-flex items-center gap-1.5"><BadgeCheck className="h-3.5 w-3.5 text-yellow-300" /> Diseño, cálculo y ejecución conectados.</span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .spin-carousel-stage { perspective: 1500px; transform-style: preserve-3d; }
        .spin-carousel-ring { position: absolute; left: 50%; top: 50%; width: 650px; height: 650px; margin-left: -325px; margin-top: -325px; transform-origin: 50% 50%; transform-style: preserve-3d; will-change: transform; }
        .spin-card-shell { --spin-radius: 268px; position: absolute; left: 50%; top: 50%; width: 230px; transform: translate(-50%, -50%) rotate(var(--spin-angle)) translateY(calc(var(--spin-radius) * -1)); transform-origin: 50% 50%; }
        .spin-card-content { min-height: 210px; transform: rotate(var(--spin-counter-angle)); transform-origin: 50% 50%; will-change: transform; }
        @media (max-width: 1180px) {
          .spin-carousel-ring { width: 590px; height: 590px; margin-left: -295px; margin-top: -295px; }
          .spin-card-shell { --spin-radius: 242px; width: 210px; }
        }
      `}</style>
    </div>
  );
}

function ProofLine({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="flex gap-3 rounded-2xl border border-white/8 bg-white/[.025] p-3.5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-yellow-300/[.09] text-yellow-300">{icon}</span><span><b className="block text-xs">{title}</b><span className="mt-1 block text-[10px] leading-5 text-zinc-500">{text}</span></span></div>;
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  const disabled = !href || href === '#';
  return <a href={disabled ? undefined : href} aria-label={label} target={disabled ? undefined : '_blank'} rel={disabled ? undefined : 'noopener noreferrer'} className={`grid h-10 w-10 place-items-center rounded-full border border-white/10 text-lg transition ${disabled ? 'cursor-not-allowed opacity-35' : 'text-zinc-300 hover:border-yellow-300/45 hover:bg-yellow-300 hover:text-black'}`}>{children}</a>;
}

function FooterGroup({ title, items }: { title: string; items: Array<[string, string]> }) {
  const links = <div className="grid gap-2 pb-2 pt-3 md:pb-0">{items.map(([label, href]) => href.startsWith('http') ? <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-400 transition hover:text-yellow-300">{label}</a> : <Link key={label} href={href} className="text-sm text-zinc-400 transition hover:text-yellow-300">{label}</Link>)}</div>;
  return <div><details className="group border-t border-white/9 md:hidden"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-xs font-black text-white"><span>{title}</span><span className="text-yellow-300 transition group-open:rotate-45">+</span></summary>{links}</details><div className="hidden md:block"><p className="text-[8px] font-black uppercase tracking-[.22em] text-yellow-300">{title}</p>{links}</div></div>;
}
