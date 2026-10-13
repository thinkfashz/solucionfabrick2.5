import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './HomePremiumV10.module.css';

/**
 * Acceso destacado al blog desde la portada. Estático a propósito: es una
 * puerta de navegación, no un feed. El contenido destacado vive en /blog.
 */
export default function HomeBlogBanner() {
  return (
    <section aria-labelledby="blog-title" className={styles.blogBanner}>
      <img
        src="/flow/fabrick-blog-vivienda-lujo.jpeg"
        alt=""
        aria-hidden
        loading="lazy"
        className={styles.blogBannerImage}
      />
      <div aria-hidden className={styles.blogBannerScrim} />
      <div className={styles.blogBannerContent}>
        <p className={styles.blogBannerEyebrow}>Del blog · construcción sin humo</p>
        <h2 id="blog-title" className={styles.blogBannerTitle}>Lee antes de construir.</h2>
        <p className={styles.blogBannerText}>
          Guías con costos reales, criterios técnicos y lo que nadie te cuenta de la obra en el Maule.
        </p>
        <Link href="/blog" className={styles.primary}>
          Ir al blog <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
