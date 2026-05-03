import type { Metadata } from 'next';
import SocialInboxClient from './SocialInboxClient';

export const metadata: Metadata = {
  title: 'Inbox social · Admin Fabrick',
  robots: { index: false, follow: false },
};

/**
 * /admin/social/inbox — Centro unificado de mensajes recibidos por las
 * redes conectadas (Instagram, Facebook Messenger, WhatsApp Business,
 * TikTok, Mercado Libre Q&A).
 *
 * Esta primera entrega es el **andamiaje** del módulo:
 *  - Layout estilo Front (lista | conversación | panel cliente)
 *  - Tabla `social_messages` ya migrada en scripts/create-tables.sql
 *  - Endpoints `/api/admin/social/messages` y `/api/admin/social/reply`
 *    se sumarán en el PR de seguimiento, junto con los webhooks por
 *    provider y el cron de sincronización.
 */
export default function AdminSocialInboxPage() {
  return <SocialInboxClient />;
}
