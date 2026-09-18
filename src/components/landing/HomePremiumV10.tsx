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
import styles from './HomePremiumV10.module.css';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const ORIGINALS = CLOUD + '/soluciones-fabrick/diseno-20260908';
const RADIER_VISUAL = CLOUD + '/c_limit,w_1100/f_auto/q_auto/v1788934479/hormigon-radier.png';

const CATEGORIES = [
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
    key: 'metal',
    eyebrow: 'Estructuras',
    title: 'Metalcon',
    text: 'Configura paneles, vanos, perfiles y refuerzos antes de pasar a presupuesto o simulación sísmica.',
    image: HOME_PREMIUM_VISUALS.metalcon,
    href: '/herramientas/metalcon',
    cta: 'Abrir configurador',
    alt: 'Estructura Metalcon y Steel Frame de referencia',
  },
] as const;

const TOOLS = [
  {
    number: '01',
    title: 'Inspiraciones',
    text: 'Explora cocinas, viviendas y soluciones reales antes de decidir qué construir.',
    href: '/proyectos',
    cta: 'Explorar ideas',
    Icon: Images,
  },
  {
    number: '02',
    title: 'Calculadora de aire',
    text: 'BTU, consumo estimado, equipo sugerido y acceso a compra o instalación.',
    href: '/herramientas/aire-acondicionado',
    cta: 'Calcular aire ideal',
    Icon: Wind,
  },
  {
    number: '03',
    title: 'Calculadora de radier',
    text: 'Superficie, espesor, volumen y materiales con una lectura clara del proyecto.',
    href: '/herramientas/radier',
    cta: 'Calcular radier',
    Icon: Layers3,
  },
  {
    number: '04',
    title: 'Paneles Metalcon',
    text: 'Arma el panel, revisa perfiles y entiende la lógica de la estructura.',
    href: '/herramientas/metalcon',
    cta: 'Diseñar estructura',
    Icon: PanelsTopLeft,
  },
  {
    number: '05',
    title: 'Simulador sísmico 4D',
    text: 'Prueba intensidad, profundidad, respuesta estructural, daño estimado y reparación referencial.',
    href: '/herramientas/metalcon/monitoreo',
    cta: 'Simular sismo',
    Icon: Activity,
  },
  {
    number: '06',
    title: 'Presupuesto guiado',
    text: 'Selecciona servicios, agrega medidas y lleva una referencia ordenada a WhatsApp o correo.',
    href: '/presupuesto',
    cta: 'Armar presupuesto',
    Icon: ReceiptText,
  },
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
  const orderedCategories = [CATEGORIES[2], CATEGORIES[1], CATEGORIES[0]] as const;

  return (
    <main className={styles.home}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>Soluciones Fabrick · construcción + herramientas digitales</p>
            <h1 id="home-title">Antes de construir, <span>entiende tu proyecto.</span></h1>
            <p className={styles.intro}>
              Calcula, compara y visualiza decisiones de obra antes de gastar. Menos improvisación, más claridad para avanzar.
            </p>
            <div className={styles.actions}>
              <Link href="/presupuesto" className={styles.primary}>Calcular mi proyecto <ArrowRight size={17} /></Link>
              <Link href="/recorrido-3d" className={styles.secondary}>Recorrer vivienda 3D</Link>
            </div>
          </div>

          <Link href="/recorrido-3d" className={styles.heroVisual} aria-label="Abrir recorrido 3D de vivienda">
            <Image
              src={HOME_PREMIUM_VISUALS.house}
              alt="Vivienda contemporánea de referencia Soluciones Fabrick"
              fill
              priority
              unoptimized
              sizes="(max-width: 900px) 100vw, 48vw"
            />
            <span className={styles.visualShade} />
            <span className={styles.visualLabel}><b>Recorrido 3D</b><small>Explora espacios, materiales y estructura</small></span>
            <span className={styles.visualArrow}><ArrowRight size={18} /></span>
          </Link>
        </div>

        <div className={styles.heroSteps} aria-label="Cómo funciona Fabrick">
          {HERO_STEPS.map(([number, title, text]) => (
            <div key={number}>
              <span>{number}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.content}>
        <section className={styles.startSection} aria-labelledby="start-title">
          <header className={styles.sectionIntro}>
            <p>Empieza por lo que necesitas resolver</p>
            <h2 id="start-title">Tres decisiones de obra, una ruta clara.</h2>
            <span>No necesitas recorrer todo el sitio. Entra directo al cálculo o configurador que corresponde.</span>
          </header>

          <div className={styles.categoryLayout}>
            {orderedCategories.map((item, index) => (
              <article key={item.key} className={styles.category + ' ' + (index === 0 ? styles.categoryLead : '') + ' ' + styles[item.key]}>
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  unoptimized
                  sizes={index === 0 ? '(max-width: 900px) 100vw, 58vw' : '(max-width: 900px) 100vw, 38vw'}
                  className={styles.categoryImage}
                />
                <span className={styles.categoryShade} />
                <div className={styles.categoryBody}>
                  <p>{item.eyebrow}</p>
                  <h3>{item.title}</h3>
                  <span>{item.text}</span>
                  <Link href={item.href}>{item.cta}<ArrowRight size={16} /></Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.walkthrough} aria-labelledby="walkthrough-title">
          <div className={styles.walkthroughVisual}>
            <Image
              src={HOME_PREMIUM_VISUALS.architecture}
              alt="Estructura de vivienda para recorrido 3D Soluciones Fabrick"
              fill
              unoptimized
              sizes="(max-width: 900px) 100vw, 56vw"
            />
          </div>
          <div className={styles.walkthroughCopy}>
            <p>Del plano a una experiencia entendible</p>
            <h2 id="walkthrough-title">Mira la vivienda antes de hablar de terminaciones.</h2>
            <span>
              Recorre ambientes, revisa capas constructivas y entiende dónde van estructura, instalaciones y materiales.
              El visor es una herramienta de comprensión; el diseño definitivo se valida para cada proyecto.
            </span>
            <div>
              <Link href="/recorrido-3d" className={styles.primary}>Abrir recorrido 3D <ArrowRight size={17} /></Link>
              <Link href="/proyectos" className={styles.textLink}>Ver inspiraciones</Link>
            </div>
          </div>
        </section>

        <section className={styles.toolIndex} aria-labelledby="workbench-title">
          <header className={styles.toolIntro}>
            <p>Herramientas Fabrick</p>
            <h2 id="workbench-title">No adivines. Usa la herramienta correcta.</h2>
            <span>Calculadoras, visualización y presupuesto organizados por tarea, no por “features”.</span>
          </header>

          <div className={styles.toolList}>
            {TOOLS.map(({ number, title, text, href, cta, Icon }) => (
              <Link key={title} href={href} className={styles.toolRow}>
                <span className={styles.toolNumber}>{number}</span>
                <span className={styles.toolIcon}><Icon aria-hidden strokeWidth={1.7} /></span>
                <span className={styles.toolCopy}><strong>{title}</strong><small>{text}</small></span>
                <span className={styles.toolCta}>{cta}<ArrowRight size={15} /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.budgetBridge} aria-labelledby="budget-title">
          <div>
            <p>Presupuesto guiado</p>
            <h2 id="budget-title">Pasa del cálculo a una referencia de costo ordenada.</h2>
            <span>
              Selecciona el trabajo, ingresa tus medidas y compara mano de obra con trabajo vendido antes de conversar una cotización final.
            </span>
          </div>
          <Link href="/presupuesto" className={styles.primary}>Armar presupuesto <ArrowRight size={17} /></Link>
        </section>

        <ConstructionM2Calculator />
      </div>

      <MetalconSeismicStory />

      <div className={styles.content}>
        <footer className={styles.footer}>
          <div className={styles.footerBrand}>
            <FabrickFullLogo compact theme="light" />
            <p>Herramientas claras para tomar mejores decisiones de construcción.</p>
          </div>
          <nav aria-label="Enlaces del pie">
            <Link href="/servicios">Soluciones</Link>
            <Link href="/proyectos">Inspiraciones</Link>
            <Link href="/recorrido-3d">Recorrido 3D</Link>
            <Link href="/herramientas/metalcon/monitoreo">Simulador sísmico</Link>
            <Link href="/contacto">Contacto</Link>
            {socialLinks?.instagram ? <a href={socialLinks.instagram} target="_blank" rel="noreferrer">Instagram</a> : null}
          </nav>
          <p className={styles.copyright}>{copyrightText || '© ' + new Date().getFullYear() + ' Soluciones Fabrick.'}</p>
        </footer>
      </div>
    </main>
  );
}
