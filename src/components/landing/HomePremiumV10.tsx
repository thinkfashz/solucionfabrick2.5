import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Headphones,
  Images,
  Layers3,
  Leaf,
  PanelsTopLeft,
  ReceiptText,
  ShieldCheck,
  Truck,
  Users,
  Wind,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import ConstructionM2Calculator from './ConstructionM2Calculator';
import MetalconSeismicStory from './MetalconSeismicStory';
import styles from './HomePremiumV10.module.css';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const ORIGINALS = `${CLOUD}/soluciones-fabrick/diseno-20260908`;
const RADIER_VISUAL = `${CLOUD}/c_limit,w_1100/f_auto/q_auto/v1788934479/hormigon-radier.png`;

const CATEGORIES = [
  { key: 'air', eyebrow: 'Climatización', title: 'Aire acondicionado', text: 'Calcula BTU, compara capacidad y encuentra el equipo adecuado para tu espacio.', image: `${ORIGINALS}/aire-acondicionado.png`, href: '/herramientas/aire-acondicionado', cta: 'Calcular BTU', alt: 'Aire acondicionado split blanco' },
  { key: 'radier', eyebrow: 'Obra base', title: 'Radier', text: 'Ingresa medidas, espesor y forma para estimar hormigón, materiales y referencia de costo.', image: RADIER_VISUAL, href: '/herramientas/radier', cta: 'Calcular radier', alt: 'Hormigón para cálculo de radier' },
  { key: 'metal', eyebrow: 'Estructuras', title: 'Metalcon', text: 'Configura paneles, vanos, perfiles y refuerzos antes de pasar a presupuesto o simulación sísmica.', image: `${ORIGINALS}/perfiles-metalcom.png`, href: '/herramientas/metalcon', cta: 'Abrir configurador', alt: 'Perfiles de acero galvanizado Metalcon' },
] as const;

const TOOLS = [
  { title: 'Inspiraciones', text: 'Explora cocinas, viviendas, muebles y soluciones reales antes de decidir.', href: '/proyectos', cta: 'Explorar ideas', Icon: Images, featured: false },
  { title: 'Calculadora de aire', text: 'BTU, consumo estimado, equipo sugerido y acceso a compra o instalación.', href: '/herramientas/aire-acondicionado', cta: 'Calcular aire ideal', Icon: Wind, featured: false },
  { title: 'Calculadora de radier', text: 'Superficie, espesor, volumen y materiales con lectura clara del proyecto.', href: '/herramientas/radier', cta: 'Calcular radier', Icon: Layers3, featured: false },
  { title: 'Paneles Metalcon', text: 'Arma el panel, revisa perfiles y entiende la lógica de la estructura.', href: '/herramientas/metalcon', cta: 'Diseñar estructura', Icon: PanelsTopLeft, featured: false },
  { title: 'Simulador sísmico 4D', text: 'Prueba intensidad, profundidad, respuesta estructural, daño estimado y reparación referencial.', href: '/herramientas/metalcon/monitoreo', cta: 'Simular terremoto', Icon: Activity, featured: true },
  { title: 'Presupuesto guiado', text: 'Selecciona servicios, ingresa medidas, compara rangos y envía el detalle por correo o WhatsApp.', href: '/presupuesto', cta: 'Armar presupuesto', Icon: ReceiptText, featured: false },
] as const;

export default function HomePremiumV10({ copyrightText, socialLinks }: {
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}) {
  return <main className={`home-v10 ${styles.home}`}>
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.atmosphere} />
      <Image src={`${ORIGINALS}/casa.png`} alt="Casa contemporánea con ventanales y acceso iluminado" width={1536} height={1152} priority unoptimized className={styles.house} />
      <div className={styles.heroShade} />
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Construye un mejor mañana <span /></p>
        <h1 id="home-title">Soluciones<br />que <span>hacen hogar</span></h1>
        <p className={styles.intro}>Diseña, calcula y compara antes de construir. Herramientas reales para pasar de una idea a una decisión concreta.</p>
        <div className={styles.actions}>
          <Link href="/herramientas/metalcon/monitoreo" className={styles.primary}>Simular sismo <Activity size={18} /></Link>
          <Link href="/herramientas/aire-acondicionado" className={styles.secondary}>Calcular aire ideal</Link>
        </div>
      </div>
      <div className={styles.trust}>
        <Trust Icon={ShieldCheck} title="Calidad" text="garantizada" />
        <Trust Icon={Truck} title="Proyectos" text="planificados" />
        <Trust Icon={Headphones} title="Asesoría" text="especializada" />
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.categories} aria-label="Herramientas principales">
        {CATEGORIES.map(item => <article key={item.key} className={`${styles.category} ${styles[item.key]}`}>
          {item.key === 'air' && <Image src={`${CLOUD}/v1788843275/air-lifestyle-room-v10.jpg`} alt="" fill sizes="(max-width: 767px) 100vw, 33vw" className={styles.room} />}
          <Image src={item.image} alt={item.alt} width={1536} height={1152} unoptimized className={styles.categoryImage} />
          {item.key === 'air' && <div className={styles.coolAir} />}
          <div className={styles.categoryText}>
            <p>{item.eyebrow}</p><h2>{item.title}</h2><div>{item.text}</div>
            <Link href={item.href} className={styles.primary}>{item.cta} <ArrowRight size={17} /></Link>
          </div>
        </article>)}
      </section>

      <section className={styles.toolHub} aria-labelledby="tools-title">
        <div className={styles.toolHeading}>
          <div><p>Herramientas Fabrick</p><h2 id="tools-title">Antes de cotizar, entiende tu proyecto.</h2></div>
          <span>Calculadoras, inspiración, estructura y simulación conectadas en una sola ruta.</span>
        </div>
        <div className={styles.toolGrid}>
          {TOOLS.map(({ title, text, href, cta, Icon, featured }) => <Link key={title} href={href} className={`${styles.toolCard} ${featured ? styles.toolFeatured : ''}`}>
            <span className={styles.toolIcon}><Icon aria-hidden /></span>
            <div><h3>{title}</h3><p>{text}</p></div>
            <span className={styles.toolCta}>{cta}<ArrowRight size={16}/></span>
          </Link>)}
        </div>
      </section>

      <section className={styles.values} aria-label="Nuestro compromiso">
        <Trust Icon={Leaf} title="Construcción responsable" text="Soluciones para un futuro sostenible." />
        <Trust Icon={Users} title="Cerca de tu proyecto" text="Atención para cada etapa de tu obra." />
        <Trust Icon={BadgeCheck} title="Calidad y confianza" text="Materiales para construir mejor." />
        <Trust Icon={Headphones} title="Soporte experto" text="Te acompañamos en cada paso." />
      </section>

      <section className={styles.featured} aria-labelledby="featured-title">
        <div className={styles.sectionHeading}><div><h2 id="featured-title">Accesos rápidos</h2><p>Las tres herramientas que más ayudan a decidir antes de ejecutar.</p></div><Link href="/presupuesto">Ir al presupuesto <ArrowRight size={18} /></Link></div>
        <div className={styles.products}>{CATEGORIES.map(item => <Link key={item.key} href={item.href} className={styles.product}>
          <Image src={item.image} alt={item.alt} width={1536} height={1152} unoptimized />
          <span>{item.title}<ArrowRight size={17} /></span>
        </Link>)}</div>
      </section>

      <section className={styles.globalCalculator}>
        <div><p>Calculadora global</p><h2>Todos los trabajos y rangos en un solo presupuesto.</h2><span>Selecciona el servicio, ingresa medidas, compara mano de obra con trabajo vendido y envía el detalle por correo o WhatsApp.</span></div>
        <Link href="/presupuesto" className={styles.primary}>Calcular proyecto completo <ArrowRight size={18}/></Link>
      </section>
      <ConstructionM2Calculator />
    </div>

    <MetalconSeismicStory />

    <div className={styles.content}>
      <footer className={styles.footer}>
        <FabrickFullLogo compact theme="light" />
        <div><Link href="/servicios">Soluciones</Link><Link href="/proyectos">Inspiraciones</Link><Link href="/herramientas/metalcon/monitoreo">Simulador sísmico</Link><Link href="/contacto">Contacto</Link>{socialLinks?.instagram && <a href={socialLinks.instagram} target="_blank" rel="noreferrer">Instagram</a>}</div>
        <p>{copyrightText || `© ${new Date().getFullYear()} Soluciones Fabrick.`}</p>
      </footer>
    </div>
  </main>;
}

function Trust({ Icon, title, text }: { Icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className={styles.trustItem}><Icon strokeWidth={1.5} aria-hidden /><span><strong>{title}</strong><span>{text}</span></span></div>;
}
