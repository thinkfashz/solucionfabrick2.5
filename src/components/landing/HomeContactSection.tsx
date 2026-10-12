import ContactForm from '@/components/ContactForm';
import { WHATSAPP_DISPLAY } from '@/lib/whatsapp';
import styles from './HomePremiumV10.module.css';

export type HomeContact = {
  email?: string;
  address?: string;
  hours?: string;
};

const DEFAULT_HOURS = 'Lunes a viernes 9:00 – 18:00 · Sábado 10:00 – 14:00';

export default function HomeContactSection({ contact }: { contact?: HomeContact }) {
  const email = contact?.email?.trim() || 'contacto@fabrick.cl';
  const address = contact?.address?.trim() || 'Linares, Región del Maule';
  const hours = contact?.hours?.trim() || DEFAULT_HOURS;

  return (
    <section id="contacto" className={styles.contact} aria-labelledby="contacto-title">
      <div className={styles.contactGrid}>
        <div className={styles.contactAside}>
          <div>
            <h2 id="contacto-title">Cuéntanos qué tienes entre manos.</h2>
            <p>Respondemos en menos de 24 horas hábiles. Si prefieres una visita en terreno para medir y cotizar, la coordinamos sin costo.</p>
          </div>

          <ul className={styles.channelList}>
            <li>
              <span className={styles.channelLabel}>WhatsApp</span>
              <span className={styles.channelValue}>{WHATSAPP_DISPLAY}</span>
            </li>
            <li>
              <span className={styles.channelLabel}>Correo</span>
              <a href={`mailto:${email}`} className={styles.channelValue}>{email}</a>
            </li>
            <li>
              <span className={styles.channelLabel}>Zona de trabajo</span>
              <span className={styles.channelValue}>{address}</span>
            </li>
            <li>
              <span className={styles.channelLabel}>Atención</span>
              <span className={styles.channelValue}>{hours}</span>
            </li>
          </ul>
        </div>

        <div className={styles.contactForm}>
          <ContactForm tone="dark" />
        </div>
      </div>
    </section>
  );
}
