import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import styles from './HomePremiumV10.module.css';

export type HubTool = {
  key: string;
  title: string;
  text: string;
  image: string;
  href: string;
  cta: string;
};

export type HubBand = {
  title: string;
  text: string;
  href: string;
  cta: string;
};

/**
 * Hub de calculadoras. Cuatro accesos con formas distintas a propósito:
 * una tarjeta alta con foto (lead), dos compactas con foto y una banda
 * tipográfica sin foto. La retícula 12 columnas hace el resto.
 */
export default function HomeToolHub({ lead, compact, band }: { lead: HubTool; compact: HubTool[]; band: HubBand }) {
  return (
    <div className={styles.hub}>
      <article className={styles.lead}>
        <Link href={lead.href} className={styles.leadMedia} tabIndex={-1} aria-hidden>
          <Image src={lead.image} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 100vw, 58vw" className={styles.leadImage} unoptimized />
        </Link>
        <div className={styles.leadBody}>
          <h3>{lead.title}</h3>
          <p>{lead.text}</p>
          <Link href={lead.href} className={styles.cardCta}>{lead.cta} <ArrowUpRight size={16} aria-hidden /></Link>
        </div>
      </article>

      {compact.map((tool) => (
        <article key={tool.key} className={styles.compact}>
          <Link href={tool.href} className={styles.compactMedia} tabIndex={-1} aria-hidden>
            <Image src={tool.image} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 42vw" className={styles.compactImage} unoptimized />
          </Link>
          <div className={styles.compactBody}>
            <h3>{tool.title}</h3>
            <p>{tool.text}</p>
            <Link href={tool.href} className={styles.cardCta}>{tool.cta} <ArrowRight size={16} aria-hidden /></Link>
          </div>
        </article>
      ))}

      <Link href={band.href} className={styles.band}>
        <span className={styles.bandCopy}>
          <h3>{band.title}</h3>
          <p>{band.text}</p>
        </span>
        <span className={styles.cardCta}>{band.cta} <ArrowUpRight size={16} aria-hidden /></span>
      </Link>
    </div>
  );
}
