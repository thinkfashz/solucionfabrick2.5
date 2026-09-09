import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Headphones, Leaf, ShieldCheck, Truck, Users } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import ConstructionM2Calculator from './ConstructionM2Calculator';
import styles from './HomePremiumV10.module.css';

const CLOUD = 'https://res.cloudinary.com/disghf6xc/image/upload';
const ORIGINALS = `${CLOUD}/soluciones-fabrick/diseno-20260908`;
const CATEGORIES = [
  { key: 'air', eyebrow: 'Climatización', title: 'Aire Acondicionado', text: 'Calcula los BTU de tu espacio y compara equipos compatibles con stock real.', image: `${ORIGINALS}/aire-acondicionado.png`, href: '/herramientas/aire-acondicionado', alt: 'Aire acondicionado split blanco' },
  { key: 'cement', eyebrow: 'Construcción', title: 'Cemento', text: 'Base sólida para grandes ideas.', image: `${ORIGINALS}/cemento.png`, href: '/tienda', alt: 'Saco de cemento de referencia' },
  { key: 'metal', eyebrow: 'Estructuras', title: 'Metalcom', text: 'Estructuras que dan forma al futuro.', image: `${ORIGINALS}/perfiles-metalcom.png`, href: '/tienda', alt: 'Perfiles de acero galvanizado Metalcom' },
];

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
        <p className={styles.intro}>Materiales de calidad, tecnología y confort para construir espacios más fuertes, modernos y sostenibles.</p>
        <div className={styles.actions}>
          <Link href="/tienda" className={styles.primary}>Ver nuestros productos <ArrowRight size={18} /></Link>
          <Link href="/herramientas/aire-acondicionado" className={styles.secondary}>Calcular aire ideal</Link>
        </div>
      </div>
      <div className={styles.trust}>
        <Trust Icon={ShieldCheck} title="Calidad" text="garantizada" />
        <Trust Icon={Truck} title="Envíos" text="a todo el país" />
        <Trust Icon={Headphones} title="Asesoría" text="especializada" />
      </div>
    </section>

    <div className={styles.content}>
      <section className={styles.categories} aria-label="Soluciones para tu hogar">
        {CATEGORIES.map(item => <article key={item.key} className={`${styles.category} ${styles[item.key]}`}>
          {item.key === 'air' && <Image src={`${CLOUD}/v1788843275/air-lifestyle-room-v10.jpg`} alt="" fill sizes="(max-width: 767px) 100vw, 33vw" className={styles.room} />}
          <Image src={item.image} alt={item.alt} width={1536} height={1152} unoptimized className={styles.categoryImage} />
          {item.key === 'air' && <div className={styles.coolAir} />}
          <div className={styles.categoryText}>
            <p>{item.eyebrow}</p><h2>{item.title}</h2><div>{item.text}</div>
            <Link href={item.href} className={styles.primary}>{item.key === 'air' ? 'Calcular BTU' : 'Ver productos'} <ArrowRight size={17} /></Link>
          </div>
        </article>)}
      </section>

      <section className={styles.values} aria-label="Nuestro compromiso">
        <Trust Icon={Leaf} title="Construcción responsable" text="Soluciones para un futuro sostenible." />
        <Trust Icon={Users} title="Cerca de tu proyecto" text="Atención para cada etapa de tu obra." />
        <Trust Icon={BadgeCheck} title="Calidad y confianza" text="Materiales para construir mejor." />
        <Trust Icon={Headphones} title="Soporte experto" text="Te acompañamos en cada paso." />
      </section>

      <section className={styles.featured} aria-labelledby="featured-title">
        <div className={styles.sectionHeading}><div><h2 id="featured-title">Productos destacados</h2><p>Todo lo que necesitas en un solo lugar.</p></div><Link href="/tienda">Ver todos los productos <ArrowRight size={18} /></Link></div>
        <div className={styles.products}>{CATEGORIES.map(item => <Link key={item.key} href={item.href} className={styles.product}>
          <Image src={item.image} alt={item.alt} width={1536} height={1152} unoptimized />
          <span>{item.title}<ArrowRight size={17} /></span>
        </Link>)}</div>
      </section>
      <ConstructionM2Calculator />
      <footer className={styles.footer}>
        <FabrickFullLogo compact theme="light" />
        <div><Link href="/servicios">Soluciones</Link><Link href="/proyectos">Proyectos</Link><Link href="/contacto">Contacto</Link>{socialLinks?.instagram && <a href={socialLinks.instagram} target="_blank" rel="noreferrer">Instagram</a>}</div>
        <p>{copyrightText || `© ${new Date().getFullYear()} Soluciones Fabrick.`}</p>
      </footer>
    </div>
  </main>;
}

function Trust({ Icon, title, text }: { Icon: typeof ShieldCheck; title: string; text: string }) {
  return <div className={styles.trustItem}><Icon strokeWidth={1.5} aria-hidden /><span><strong>{title}</strong><span>{text}</span></span></div>;
}
