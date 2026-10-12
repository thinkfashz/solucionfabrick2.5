import Link from 'next/link';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import {
  FacebookBrandIcon,
  InstagramBrandIcon,
  TikTokBrandIcon,
  WhatsAppBrandIcon,
} from '@/components/SocialBrandIcons';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import styles from './HomePremiumV10.module.css';

const COLUMNS = [
  {
    title: 'Calculadoras',
    links: [
      { href: '/herramientas/metalcon', label: 'Configurador Metalcon' },
      { href: '/herramientas/radier', label: 'Radier y hormigón' },
      { href: '/herramientas/aire-acondicionado', label: 'Climatización BTU' },
      { href: '/herramientas/metalcon/monitoreo', label: 'Simulador sísmico 4D' },
    ],
  },
  {
    title: 'Soluciones',
    links: [
      { href: '/servicios', label: 'Todas las especialidades' },
      { href: '/presupuesto', label: 'Presupuesto guiado' },
      { href: '/soluciones', label: 'Guía de soluciones' },
      { href: '/tienda', label: 'Tienda de productos' },
    ],
  },
  {
    title: 'Inspiraciones',
    links: [
      { href: '/proyectos', label: 'Ideas y proyectos' },
      { href: '/casos', label: 'Casos reales' },
      { href: '/blog', label: 'Blog de obra' },
      { href: '/centro-tecnico', label: 'Centro técnico' },
    ],
  },
  {
    title: 'Fabrick',
    links: [
      { href: '/fundador', label: 'Quiénes somos' },
      { href: '/garantias', label: 'Garantías' },
      { href: '/contacto', label: 'Contacto' },
      { href: '/legal/privacidad', label: 'Privacidad' },
    ],
  },
] as const;

export default function HomeFooter({ copyrightText, socialLinks }: {
  copyrightText?: string;
  socialLinks?: { facebook?: string; instagram?: string; tiktok?: string };
}) {
  const social = [
    socialLinks?.instagram ? { href: socialLinks.instagram, label: 'Instagram', Icon: InstagramBrandIcon } : null,
    socialLinks?.facebook ? { href: socialLinks.facebook, label: 'Facebook', Icon: FacebookBrandIcon } : null,
    socialLinks?.tiktok ? { href: socialLinks.tiktok, label: 'TikTok', Icon: TikTokBrandIcon } : null,
    { href: buildWhatsAppLink(), label: 'WhatsApp', Icon: WhatsAppBrandIcon },
  ].filter((item): item is { href: string; label: string; Icon: typeof InstagramBrandIcon } => item !== null);

  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <FabrickFullLogo compact theme="light" />
          <p>Construcción, ampliación y reparación en Linares, Región del Maule. Calcula tu proyecto antes de pedir un presupuesto.</p>
          <div className={styles.socialRow}>
            {social.map(({ href, label, Icon }) => (
              <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={styles.socialLink} aria-label={label} title={label}>
                <Icon className="h-[18px] w-[18px]" />
              </a>
            ))}
          </div>
        </div>

        <nav className={styles.footerNav} aria-label="Navegación del pie de página">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.footerLink}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className={styles.footerBase}>
        <p>{copyrightText || `© ${new Date().getFullYear()} Soluciones Fabrick.`}</p>
        <p>Linares, Región del Maule, Chile</p>
      </div>
    </footer>
  );
}
