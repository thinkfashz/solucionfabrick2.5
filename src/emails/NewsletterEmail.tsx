import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

export interface NewsletterEmailProps {
  subject: string;
  previewText?: string | null;
  /** HTML ya renderizado a partir del markdown del boletín. */
  bodyHtml: string;
  unsubscribeUrl: string;
  logoUrl?: string;
}

const C = {
  bg: '#070707',
  card: '#0c0c0c',
  border: '#262626',
  text: '#fafafa',
  muted: '#a1a1aa',
  amber: '#f59e0b',
  amberSoft: '#fbbf24',
};

export function NewsletterEmail({ subject, previewText, bodyHtml, unsubscribeUrl, logoUrl }: NewsletterEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{previewText ?? subject}</Preview>
      <Body
        style={{
          backgroundColor: C.bg,
          color: C.text,
          fontFamily:
            "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: '32px 0',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: '20px',
            padding: '32px 28px',
          }}
        >
          <Section style={{ textAlign: 'center', paddingBottom: '8px' }}>
            {logoUrl ? (
              <Img src={logoUrl} alt="Soluciones Fabrick" width="160" height="44" style={{ display: 'inline-block', maxWidth: '160px', height: 'auto' }} />
            ) : (
              <Text
                style={{
                  margin: 0,
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: C.amberSoft,
                }}
              >
                Soluciones Fabrick · Boletín
              </Text>
            )}
          </Section>

          <Hr style={{ borderColor: C.border, margin: '20px 0 24px' }} />

          <Heading as="h1" style={{ fontSize: '22px', lineHeight: '1.3', margin: '0 0 18px', color: C.text }}>
            {subject}
          </Heading>

          {/* eslint-disable-next-line react/no-danger -- bodyHtml es generado server-side desde markdown saneado */}
          <Section
            style={{ color: C.text, fontSize: '15px', lineHeight: '1.7' }}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          <Hr style={{ borderColor: C.border, margin: '28px 0 12px' }} />
          <Text style={{ color: C.muted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
            Recibes este correo porque te suscribiste al boletín de Soluciones Fabrick.{' '}
            <Link href={unsubscribeUrl} style={{ color: C.amberSoft }}>
              Darme de baja
            </Link>
          </Text>
          <Text style={{ color: C.muted, fontSize: '11px', textAlign: 'center', margin: '6px 0 0' }}>
            © {new Date().getFullYear()} Soluciones Fabrick
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default NewsletterEmail;
