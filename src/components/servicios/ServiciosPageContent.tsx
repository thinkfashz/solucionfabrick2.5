'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import {
  ArrowDown,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Hammer,
  Home,
  Layers3,
  MessageCircle,
  Paintbrush,
  PanelsTopLeft,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import FabrickLogo from '@/components/FabrickLogo';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import styles from './ServiciosImmersive.module.css';

type ServiceChapter = {
  id: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  promise: string;
  description: string;
  functions: string[];
  outcomes: string[];
  bg: string;
  accent: string;
  text: string;
  muted: string;
  iconColor: string;
  icon: LucideIcon;
};

const SERVICES: ServiceChapter[] = [
  {
    id: 'albanileria',
    title: 'Albañilería y obra gruesa',
    shortTitle: 'Albañilería',
    eyebrow: 'Muros · pisos · reparaciones',
    promise: 'Construimos y recuperamos las superficies que sostienen el proyecto.',
    description:
      'La albañilería reúne los trabajos húmedos y estructurales que permiten levantar, corregir o preparar un espacio. El alcance se define según soporte existente, materialidad, cargas, humedad y nivel de terminación requerido.',
    functions: [
      'Construcción y reparación de muros, tabiques de bloque y elementos de cierre.',
      'Sobrecimientos, radieres, afinados y preparación de superficies para pisos.',
      'Enchapes, cerámicas, porcelanatos y revestimientos adheridos.',
      'Reparación de fisuras, desprendimientos, encuentros y daños visibles.',
    ],
    outcomes: ['Base preparada', 'Muros aplomados', 'Superficies niveladas', 'Terminación coordinada'],
    bg: '#a64f2c',
    accent: '#ffd166',
    text: '#fff8ed',
    muted: 'rgba(255,248,237,.72)',
    iconColor: '#291207',
    icon: Hammer,
  },
  {
    id: 'carpinteria',
    title: 'Carpintería y mobiliario',
    shortTitle: 'Carpintería',
    eyebrow: 'Madera · puertas · muebles',
    promise: 'Convertimos medidas reales en soluciones que aprovechan mejor el espacio.',
    description:
      'La carpintería combina fabricación, ajuste e instalación. Se utiliza para resolver puertas, ventanas, divisiones, clósets y mobiliario a medida, considerando uso, herrajes, humedad, peso y mantenimiento futuro.',
    functions: [
      'Puertas, marcos, ventanas y ajustes de elementos existentes en madera.',
      'Clósets empotrados, repisas, escritorios y almacenamiento a medida.',
      'Divisiones interiores, revestimientos decorativos y remates de terminación.',
      'Muebles de baño y cocina coordinados con redes e instalaciones.',
    ],
    outcomes: ['Medición en terreno', 'Diseño funcional', 'Herrajes definidos', 'Montaje y ajustes'],
    bg: '#6a3f27',
    accent: '#e8b36d',
    text: '#fff8ef',
    muted: 'rgba(255,248,239,.7)',
    iconColor: '#25140b',
    icon: PanelsTopLeft,
  },
  {
    id: 'gasfiteria',
    title: 'Gasfitería y redes sanitarias',
    shortTitle: 'Gasfitería',
    eyebrow: 'Agua · desagüe · artefactos',
    promise: 'Ordenamos el recorrido del agua para evitar pérdidas, improvisaciones y daños posteriores.',
    description:
      'La gasfitería interviene redes de agua potable, desagües y conexiones sanitarias. Antes de ejecutar se revisan presión, diámetros, pendientes, puntos existentes, accesibilidad y compatibilidad con los artefactos seleccionados.',
    functions: [
      'Instalación y modificación de redes interiores de agua fría y caliente.',
      'Detección y reparación de filtraciones visibles o localizadas.',
      'Distribución sanitaria, desagües, ventilaciones y pendientes de evacuación.',
      'Instalación de lavaplatos, lavamanos, sanitarios, duchas y griferías.',
    ],
    outcomes: ['Red trazada', 'Conexiones probadas', 'Pendientes verificadas', 'Artefactos instalados'],
    bg: '#087f9c',
    accent: '#82e9f5',
    text: '#ecfeff',
    muted: 'rgba(236,254,255,.74)',
    iconColor: '#062b33',
    icon: Droplets,
  },
  {
    id: 'electricidad',
    title: 'Electricidad e iluminación',
    shortTitle: 'Electricidad',
    eyebrow: 'Circuitos · puntos · tableros',
    promise: 'Diseñamos recorridos eléctricos claros para que cada punto tenga una función y una carga conocida.',
    description:
      'Los trabajos eléctricos se organizan por circuitos, consumos, protecciones y recorridos. La propuesta debe distinguir instalaciones nuevas, reparaciones, ampliaciones y equipos que requieren alimentación dedicada.',
    functions: [
      'Instalación o traslado de enchufes, interruptores y puntos de iluminación.',
      'Canalización, cableado y distribución de circuitos según el alcance acordado.',
      'Revisión de fallas visibles, conexiones deficientes y puntos sin funcionamiento.',
      'Preparación eléctrica para climatización, cocina, bombas y otros equipos.',
    ],
    outcomes: ['Circuitos identificados', 'Puntos operativos', 'Protecciones revisadas', 'Carga coordinada'],
    bg: '#172554',
    accent: '#fde047',
    text: '#f8fafc',
    muted: 'rgba(248,250,252,.7)',
    iconColor: '#172554',
    icon: Zap,
  },
  {
    id: 'fundaciones',
    title: 'Fundaciones y obra base',
    shortTitle: 'Fundaciones',
    eyebrow: 'Terreno · apoyos · hormigón',
    promise: 'Preparamos la base para que la construcción transmita sus cargas de forma ordenada.',
    description:
      'Las fundaciones conectan la estructura con el terreno. Su solución depende del tipo de proyecto, suelo, desniveles, humedad, cargas y sistema constructivo. La ejecución se confirma después de revisar condiciones reales.',
    functions: [
      'Trazado, excavación y preparación del terreno dentro del alcance definido.',
      'Zapatas, vigas de fundación, sobrecimientos y apoyos para estructuras livianas.',
      'Radieres, capas de base, estabilizado, refuerzos y juntas de trabajo.',
      'Coordinación de pasadas sanitarias, drenajes y niveles antes del hormigonado.',
    ],
    outcomes: ['Niveles definidos', 'Apoyos dimensionados', 'Base compactada', 'Hormigón coordinado'],
    bg: '#5b3828',
    accent: '#d6a36f',
    text: '#fff7ed',
    muted: 'rgba(255,247,237,.71)',
    iconColor: '#29170e',
    icon: Layers3,
  },
  {
    id: 'estructuras',
    title: 'Estructuras Metalcon y ampliaciones',
    shortTitle: 'Estructuras',
    eyebrow: 'Perfiles · refuerzos · aislación',
    promise: 'Le damos forma al proyecto con una estructura liviana, coordinada y preparada para recibir sus capas.',
    description:
      'La construcción en perfiles galvanizados permite organizar muros, techumbres y ampliaciones por capas. El diseño debe contemplar modulación, arriostramiento, vanos, aislación, barreras y terminaciones desde el inicio.',
    functions: [
      'Muros perimetrales e interiores en estructura liviana galvanizada.',
      'Ampliaciones, segundos espacios, recintos anexos y soluciones prefabricadas.',
      'Cerchas, envigados, refuerzos, encuentros y preparación de vanos.',
      'Coordinación de aislación, barreras, placas, revestimientos e instalaciones.',
    ],
    outcomes: ['Modulación definida', 'Refuerzos ubicados', 'Capas coordinadas', 'Vanos preparados'],
    bg: '#29323d',
    accent: '#d8dee7',
    text: '#f8fafc',
    muted: 'rgba(248,250,252,.68)',
    iconColor: '#18202a',
    icon: Building2,
  },
  {
    id: 'techumbre',
    title: 'Techumbre, filtraciones y protección',
    shortTitle: 'Techumbre',
    eyebrow: 'Cubierta · canaletas · sellos',
    promise: 'Protegemos el interior atacando el recorrido del agua, no solo la mancha visible.',
    description:
      'Una filtración puede originarse lejos del punto donde aparece. La revisión de techumbre considera cubierta, fijaciones, pendientes, encuentros, cumbreras, canaletas, sellos y condiciones de acceso antes de definir una reparación.',
    functions: [
      'Diagnóstico de filtraciones y revisión de puntos críticos visibles.',
      'Cambio parcial o renovación de cubiertas según materialidad y estado.',
      'Canaletas, bajadas de agua, cumbreras, tapacanes y remates perimetrales.',
      'Sellos, fijaciones, membranas y coordinación con aislación de techumbre.',
    ],
    outcomes: ['Origen identificado', 'Cubierta asegurada', 'Evacuación ordenada', 'Remates protegidos'],
    bg: '#171717',
    accent: '#fb923c',
    text: '#fff7ed',
    muted: 'rgba(255,247,237,.68)',
    iconColor: '#2a1305',
    icon: Home,
  },
  {
    id: 'terminaciones',
    title: 'Terminaciones y renovación interior',
    shortTitle: 'Terminaciones',
    eyebrow: 'Pintura · pisos · revestimientos',
    promise: 'Unificamos superficies, encuentros y detalles para que el proyecto se vea realmente terminado.',
    description:
      'Las terminaciones reúnen las capas visibles y los remates que definen la percepción final. Antes de instalar o pintar se revisan humedad, planeidad, adherencia, encuentros y compatibilidad entre materiales.',
    functions: [
      'Empaste, reparación superficial, preparación y pintura interior o exterior.',
      'Pisos vinílicos, flotantes, cerámicos y porcelanatos según soporte existente.',
      'Revestimientos, siding, molduras, guardapolvos y terminaciones de encuentros.',
      'Cielos, placas, sellos, remates y correcciones finales de presentación.',
    ],
    outcomes: ['Superficie preparada', 'Material compatible', 'Encuentros resueltos', 'Entrega limpia'],
    bg: '#f2eee6',
    accent: '#b68b55',
    text: '#201b16',
    muted: 'rgba(32,27,22,.68)',
    iconColor: '#201b16',
    icon: Paintbrush,
  },
];

function customStyle(service: ServiceChapter): CSSProperties {
  return {
    '--service-bg': service.bg,
    '--service-text': service.text,
    '--service-muted': service.muted,
    '--service-accent': service.accent,
    '--service-icon': service.iconColor,
    '--accent': service.accent,
    '--icon-color': service.iconColor,
  } as CSSProperties;
}

function orbitStyle(service: ServiceChapter, index: number): CSSProperties {
  const angle = (360 / SERVICES.length) * index;
  return {
    '--angle': `${angle}deg`,
    '--counter-angle': `${-angle}deg`,
    '--accent': service.accent,
    '--icon-color': service.iconColor,
  } as CSSProperties;
}

export function ServiciosPageContent() {
  const rootRef = useRef<HTMLElement>(null);
  const spinSectionRef = useRef<HTMLElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const setActive = (index: number) => {
    const next = (index + SERVICES.length) % SERVICES.length;
    activeIndexRef.current = next;
    setActiveIndex(next);
  };

  const activeService = SERVICES[activeIndex];
  const ActiveIcon = activeService.icon;

  const scrollToService = (index: number) => {
    setActive(index);
    document.getElementById(`servicio-${SERVICES[index].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const moveMobile = (direction: number) => {
    const next = (activeIndexRef.current + direction + SERVICES.length) % SERVICES.length;
    setActive(next);
    const card = mobileTrackRef.current?.children.item(next) as HTMLElement | null;
    card?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const handleMobileScroll = (container: HTMLDivElement) => {
    const center = container.scrollLeft + container.clientWidth / 2;
    let closest = activeIndexRef.current;
    let distance = Number.POSITIVE_INFINITY;
    Array.from(container.children).forEach((child, index) => {
      const card = child as HTMLElement;
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const nextDistance = Math.abs(cardCenter - center);
      if (nextDistance < distance) {
        distance = nextDistance;
        closest = index;
      }
    });
    if (closest !== activeIndexRef.current) setActive(closest);
  };

  useEffect(() => {
    let initialized = false;
    let timer = 0;
    let context: { revert?: () => void } | undefined;
    let media: { revert?: () => void } | undefined;

    const init = () => {
      if (initialized || !rootRef.current) return;
      const runtime = window as unknown as {
        gsap?: any;
        ScrollTrigger?: any;
      };
      const gsap = runtime.gsap;
      const ScrollTrigger = runtime.ScrollTrigger;
      if (!gsap || !ScrollTrigger) return;

      initialized = true;
      window.clearInterval(timer);
      gsap.registerPlugin(ScrollTrigger);

      context = gsap.context(() => {
        gsap.fromTo(
          '[data-services-hero-reveal]',
          { autoAlpha: 0, y: 32 },
          { autoAlpha: 1, y: 0, duration: .8, stagger: .09, ease: 'power3.out', delay: .15 },
        );

        const panels = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-service-panel]') || []);
        panels.forEach((panel, index) => {
          const service = SERVICES[index];
          ScrollTrigger.create({
            trigger: panel,
            start: 'top 58%',
            end: 'bottom 42%',
            onEnter: () => {
              setActive(index);
              gsap.to(rootRef.current, { backgroundColor: service.bg, duration: .65, overwrite: true });
            },
            onEnterBack: () => {
              setActive(index);
              gsap.to(rootRef.current, { backgroundColor: service.bg, duration: .65, overwrite: true });
            },
          });

          const revealItems = panel.querySelectorAll('[data-service-reveal]');
          gsap.fromTo(
            revealItems,
            { autoAlpha: 0, y: 34 },
            {
              autoAlpha: 1,
              y: 0,
              duration: .7,
              stagger: .075,
              ease: 'power3.out',
              scrollTrigger: { trigger: panel, start: 'top 76%', once: true },
            },
          );

          const visual = panel.querySelector('[data-service-visual]');
          if (visual) {
            gsap.to(visual, {
              yPercent: -5,
              ease: 'none',
              scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: 1.2 },
            });
          }
        });

        media = gsap.matchMedia();
        media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
          const faces = ringRef.current?.querySelectorAll('[data-spin-face]') || [];
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: spinSectionRef.current,
              start: 'top top',
              end: `+=${SERVICES.length * 430}`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              snap: {
                snapTo: 1 / (SERVICES.length - 1),
                duration: { min: .12, max: .38 },
                delay: .04,
              },
              onUpdate: (self: { progress: number }) => {
                const index = Math.min(SERVICES.length - 1, Math.round(self.progress * (SERVICES.length - 1)));
                if (index !== activeIndexRef.current) setActive(index);
              },
            },
          });
          timeline.to(ringRef.current, { rotation: -360, ease: 'none' }, 0);
          timeline.to(faces, { rotation: '+=360', ease: 'none' }, 0);
          return () => timeline.kill();
        });
      }, rootRef.current);

      window.setTimeout(() => ScrollTrigger.refresh(), 180);
    };

    timer = window.setInterval(init, 120);
    init();

    return () => {
      window.clearInterval(timer);
      media?.revert?.();
      context?.revert?.();
    };
  }, []);

  return (
    <main ref={rootRef} className={styles.root}>
      <Navbar />

      <section className={styles.hero}>
        <div className={styles.texture} aria-hidden />
        <div className={styles.heroInner}>
          <div>
            <p data-services-hero-reveal className={styles.heroLabel}>
              <ShieldCheck className="h-4 w-4" /> Construcción, reparación y terminaciones
            </p>
            <div data-services-hero-reveal className={styles.heroBand}>
              <h1 className={styles.heroTitle}>Servicios</h1>
            </div>
            <p data-services-hero-reveal className={styles.heroCopy}>
              Cada especialidad tiene una función distinta. Recorre la página para entender qué resuelve, qué trabajos agrupa y qué debemos revisar antes de cotizar tu proyecto.
            </p>
            <div data-services-hero-reveal className={styles.heroActions}>
              <a href="#mapa-servicios" className={styles.primaryButton}>
                Explorar especialidades <ArrowDown className="h-4 w-4" />
              </a>
              <Link href="/presupuesto" className={styles.secondaryButton}>
                Solicitar presupuesto <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside data-services-hero-reveal className={styles.heroAside}>
            <p className={styles.kicker}>Una ruta por capas</p>
            <h2>Del terreno a la terminación final.</h2>
            <p>
              El orden correcto reduce retrabajos: primero base y estructura, luego redes, protección y finalmente las capas visibles.
            </p>
            <div className={styles.heroProof}>
              <div className={styles.heroProofItem}><CheckCircle2 className="h-4 w-4 text-yellow-300" /> Alcance explicado antes de ejecutar.</div>
              <div className={styles.heroProofItem}><CheckCircle2 className="h-4 w-4 text-yellow-300" /> Especialidades coordinadas cuando el proyecto las combina.</div>
              <div className={styles.heroProofItem}><CheckCircle2 className="h-4 w-4 text-yellow-300" /> Valores finales sujetos a medidas y condiciones reales.</div>
            </div>
          </aside>
        </div>
        <div className="absolute inset-x-0 bottom-0"><div className={styles.hazardTape} /></div>
      </section>

      <section id="mapa-servicios" ref={spinSectionRef} className={styles.spinSection}>
        <div className={styles.texture} aria-hidden />
        <header className={styles.spinHeader}>
          <div>
            <p className={styles.kicker}>Mapa interactivo de servicios</p>
            <h2>Gira por cada especialidad y descubre su función.</h2>
          </div>
          <p>
            En escritorio, el scroll vertical hace girar el carrusel. También puedes pasar el mouse o seleccionar una tarjeta. En móvil, desliza horizontalmente para proyectar el servicio activo.
          </p>
        </header>

        <div className={styles.spinDesktop}>
          <div className={styles.spinStage}>
            <div ref={ringRef} className={styles.orbit}>
              {SERVICES.map((service, index) => {
                const Icon = service.icon;
                const active = activeIndex === index;
                return (
                  <div key={service.id} className={styles.orbitSlot} style={orbitStyle(service, index)}>
                    <button
                      type="button"
                      data-spin-face
                      className={`${styles.orbitCard} ${active ? styles.orbitCardActive : ''}`}
                      onMouseEnter={() => setActive(index)}
                      onFocus={() => setActive(index)}
                      onClick={() => scrollToService(index)}
                      aria-current={active ? 'true' : undefined}
                    >
                      <span><Icon className="h-5 w-5" /></span>
                      <b>{service.shortTitle}</b>
                      <small>{service.eyebrow}</small>
                    </button>
                  </div>
                );
              })}
            </div>

            <article className={styles.centerCard} style={customStyle(activeService)} aria-live="polite">
              <span className={styles.centerIcon}><ActiveIcon className="h-8 w-8" /></span>
              <p className={styles.kicker}>{activeService.eyebrow}</p>
              <h3>{activeService.shortTitle}</h3>
              <p>{activeService.promise}</p>
              <button type="button" className={styles.lightButton} onClick={() => scrollToService(activeIndex)}>
                Explorar servicio <ArrowDown className="h-4 w-4" />
              </button>
            </article>
          </div>
        </div>

        <div className={styles.mobileCarousel}>
          <div
            ref={mobileTrackRef}
            className={styles.mobileTrack}
            onScroll={(event) => handleMobileScroll(event.currentTarget)}
          >
            {SERVICES.map((service, index) => {
              const Icon = service.icon;
              const active = activeIndex === index;
              return (
                <button
                  key={service.id}
                  type="button"
                  className={`${styles.mobileServiceCard} ${active ? styles.mobileServiceCardActive : ''}`}
                  style={customStyle(service)}
                  onClick={() => setActive(index)}
                  aria-current={active ? 'true' : undefined}
                >
                  <span><Icon className="h-5 w-5" /></span>
                  <b>{service.shortTitle}</b>
                  <small>{service.eyebrow}</small>
                </button>
              );
            })}
          </div>

          <article className={styles.mobileProjection} style={customStyle(activeService)} aria-live="polite">
            <div className={styles.mobileProjectionHeader}>
              <span className={styles.mobileProjectionIcon}><ActiveIcon className="h-6 w-6" /></span>
              <span className={styles.kicker}>{String(activeIndex + 1).padStart(2, '0')} / {String(SERVICES.length).padStart(2, '0')}</span>
            </div>
            <h3>{activeService.shortTitle}</h3>
            <p>{activeService.promise}</p>
            <button type="button" className={`${styles.lightButton} mt-5 border-0`} onClick={() => scrollToService(activeIndex)}>
              Ver funciones <ArrowDown className="h-4 w-4" />
            </button>
          </article>

          <div className={styles.carouselControls}>
            <button type="button" onClick={() => moveMobile(-1)} aria-label="Servicio anterior"><ChevronLeft className="h-5 w-5" /></button>
            <span>{activeIndex + 1} de {SERVICES.length}</span>
            <button type="button" onClick={() => moveMobile(1)} aria-label="Servicio siguiente"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      </section>

      {SERVICES.map((service, index) => {
        const Icon = service.icon;
        const quoteLink = buildWhatsAppLink(`Hola Soluciones Fabrick, quiero evaluar un trabajo de ${service.title}. Necesito orientación sobre alcance, medidas y próximos pasos.`);
        return (
          <section
            key={service.id}
            id={`servicio-${service.id}`}
            data-service-panel
            className={styles.servicePanel}
            style={customStyle(service)}
            aria-labelledby={`titulo-${service.id}`}
          >
            <div className={styles.serviceGrid}>
              <div data-service-visual className={styles.serviceVisual}>
                <span className={styles.serviceNumber}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.serviceIcon}><Icon className="h-10 w-10" /></span>
                <div className={styles.serviceVisualTitle}>
                  <p>{service.eyebrow}</p>
                  <h2 id={`titulo-${service.id}`}>{service.shortTitle}</h2>
                </div>
              </div>

              <div className={styles.serviceContent}>
                <p data-service-reveal className={styles.eyebrow}>Qué función cumple</p>
                <h3 data-service-reveal>{service.promise}</h3>
                <p data-service-reveal className={styles.serviceDescription}>{service.description}</p>

                <div data-service-reveal className={styles.functionGrid}>
                  {service.functions.map((item) => (
                    <div key={item} className={styles.functionItem}>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div data-service-reveal className={styles.outcomeBox}>
                  <strong>Resultado que debe quedar definido</strong>
                  <div className={styles.outcomeTags}>
                    {service.outcomes.map((item) => <span key={item}>{item}</span>)}
                  </div>
                </div>

                <div data-service-reveal className={styles.serviceActions}>
                  <a href={quoteLink} target="_blank" rel="noopener noreferrer" className={styles.lightButton}>
                    Cotizar este servicio <MessageCircle className="h-4 w-4" />
                  </a>
                  <Link href="/presupuesto" className={styles.darkButton}>
                    Abrir calculadora <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 opacity-70"><div className={styles.hazardTape} /></div>
          </section>
        );
      })}

      <section className={styles.finalCta}>
        <div className={styles.texture} aria-hidden />
        <div className={styles.finalCtaInner}>
          <div>
            <p className={styles.kicker} style={{ color: '#0b0b0b' }}>Un proyecto puede mezclar varias áreas</p>
            <h2>Cuéntanos el resultado final. Nosotros ordenamos las especialidades.</h2>
            <p>
              Envía comuna, medidas aproximadas, fotografías y el estado actual. Con esa información podemos indicarte qué revisar primero y cómo separar el trabajo por etapas.
            </p>
          </div>
          <div className={styles.finalCtaActions}>
            <a href={buildWhatsAppLink('Hola Soluciones Fabrick, tengo un proyecto que combina varias especialidades y quiero ordenar el alcance.')} target="_blank" rel="noopener noreferrer" className={styles.primaryButton}>
              Hablar por WhatsApp <MessageCircle className="h-4 w-4" />
            </a>
            <Link href="/presupuesto" className={styles.secondaryButton}>
              Crear presupuesto <Sparkles className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <FabrickLogo className="pointer-events-none" />
          <span>Servicios sujetos a revisión de medidas, acceso, materialidad y condiciones reales.</span>
        </div>
      </footer>
    </main>
  );
}
