import type { Metadata } from 'next';
import ContactoClient from './ContactoClient';

export const metadata: Metadata = {
  title: 'Contacto | Fabrick',
  description: 'Contáctanos para cotizar tu proyecto de remodelación, construcción o instalaciones. Respondemos en menos de 24 horas hábiles.',
};

export default function ContactoPage() {
  return <ContactoClient />;
}
