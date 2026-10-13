import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Calculator, Headphones, ShieldCheck, Truck } from 'lucide-react';
import { HOME_FLOW_VISUALS } from '@/lib/homePremiumVisuals';
import ConstructionM2Calculator from './ConstructionM2Calculator';
import HomeContactSection, { type HomeContact } from './HomeContactSection';
import HomeFooter from './HomeFooter';
import HomeInspirationGallery from './HomeInspirationGallery';
import HomeBlogBanner from './HomeBlogBanner';
import HomeToolHub, { type HubBand, type HubTool } from './HomeToolHub';
import MetalconSeismicStory from './MetalconSeismicStory';
import styles from './HomePremiumV10.module.css';

const FLOW_HERO = HOME_FLOW_VISUALS.hero;

const LEAD: HubTool = {
  key: 'metal',
  title: 'Metalcon',
  text: 'Paneles, vanos y refuerzos antes de pedir un presupuesto.',
  image: HOME_FLOW_VISUALS.metalcon,
  href: '/herramientas/metalcon',
  cta: 'Abrir configurador',
};

const COMPACT: HubTool[] = [
  { key: 'air', title: 'Aire acondicionado', text: 'Calcula BTU y elige el equipo para tu espacio.', image: HOME_FLOW_VISUALS.interior, href: '/herramientas/aire-acondicionado', cta: 'Calcular BTU' },
  { key: 'radier', title: 'Radier', text: 'Medidas y espesor para estimar hormigón y costo.', image: HOME_FLOW_VISUALS.radier, href: '/herramientas/radier', cta: 'Calcular radier' },
];

const BAND: HubBand = {
  title: 'Simulador sísmico 4D',
  text: 'Intensidad, daño estimado y reparación referencial para una estructura Metalcon.',
  href: '/herramientas/metalcon/monitoreo',
  cta: 'Simular sismo',
};

const INSPIRATION_CTA = { href: '/proyectos', label: 'Ver todos los proyectos' } as const;

const TRUST = [
  { Icon: ShieldCheck, text: 'Calidad garantizada' },
  { Icon: Truck, text: 'Proyectos planificados' },
  { Icon: Headphones, text: 'Asesoría especializada' },
] as const;

export default function HomePremiumV10({ copyrightText, socialLinks, contact }: {
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
  contact?: HomeContact;
}) {
  return <main className={`home-v10 ${styles.home}`}>
    <section className={styles.hero} aria-labelledby="home-title">
      <Image src={FLOW_HERO} alt="" fill priority unoptimized sizes="100vw" className={styles.heroImage} />
      <div className={styles.heroScrim} aria-hidden />
      <div className={styles.heroContent}>
        <h1 id="home-title">Calcula tu proyecto antes de construir.</h1>
        <p className={styles.intro}>Elige un trabajo, anota tus medidas y compara mano de obra con trabajo vendido.</p>
        <div className={styles.actions}>
          <Link href="#cotizador" className={styles.primary}>Calcular ahora <Calculator size={18} aria-hidden /></Link>
          <Link href="#herramientas" className={styles.secondary}>Ver herramientas</Link>
        </div>
      </div>
    </section>

    <ul className={styles.trust} aria-label="Compromisos">
      {TRUST.map(({ Icon, text }) => <li key={text}><Icon size={16} strokeWidth={1.75} aria-hidden />{text}</li>)}
    </ul>

    <div className={styles.content}>
      <div className={styles.m2Slot}>
        <ConstructionM2Calculator />
      </div>

      <section id="herramientas" className={styles.tools} aria-labelledby="tools-title">
        <div className={styles.sectionHead}>
          <h2 id="tools-title">Herramientas para decidir.</h2>
          <p>Cada calculadora entrega una referencia con las medidas que entregas. Sirven para comparar, no para sustituir la visita a terreno.</p>
          <div className={styles.sectionHeadActions}>
            <Link href="/herramientas/aire-acondicionado" className={styles.quickLink}>
              Calcular aire ideal <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
        </div>

        <HomeToolHub lead={LEAD} compact={COMPACT} band={BAND} />
      </section>

      <section id="inspiraciones" className={styles.inspiration} aria-labelledby="inspiraciones-title">
        <div className={styles.sectionHead}>
          <h2 id="inspiraciones-title">Ideas reales antes de decidir.</h2>
          <p>Fotos de obra y proyectos que ya se ejecutaron en la región. Abre cualquiera para verla en grande.</p>
          <div className={styles.sectionHeadActions}>
            <Link href={INSPIRATION_CTA.href} className={styles.quickLink}>
              {INSPIRATION_CTA.label} <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
        </div>

        <HomeInspirationGallery />
      </section>
    </div>

    <HomeBlogBanner />

    <MetalconSeismicStory />

    <div className={styles.content}>
      <HomeContactSection contact={contact} />

      <HomeFooter copyrightText={copyrightText} socialLinks={socialLinks} />
    </div>
  </main>;
}
