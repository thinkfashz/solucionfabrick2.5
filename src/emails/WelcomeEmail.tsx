import * as React from 'react';
import {
  Body,
  Button,
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

export interface WelcomeEmailProps {
  customerName?: string | null;
  shopUrl: string;
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

export function WelcomeEmail({ customerName, shopUrl, unsubscribeUrl, logoUrl }: WelcomeEmailProps) {
  const greet = customerName ? `Hola ${customerName},` : 'Hola,';
  return (
    <Html>
      <Head />
      <Preview>Bienvenido a Soluciones Fabrick · Boletín activado</Preview>
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
            maxWidth: '560px',
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
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: C.amberSoft,
                }}
              >
                Soluciones Fabrick
              </Text>
            )}
          </Section>

          <Hr style={{ borderColor: C.border, margin: '24px 0' }} />

          <Heading as="h1" style={{ fontSize: '24px', lineHeight: '1.3', margin: '0 0 12px', color: C.text }}>
            {greet} bienvenido a Fabrick.
          </Heading>

          <Text style={{ color: C.muted, fontSize: '15px', lineHeight: '1.65', margin: '0 0 14px' }}>
            Acabamos de crear tu cuenta. Desde ya tienes acceso a la tienda, presupuestos personalizados y al
            diseñador 3D de tu próximo proyecto.
          </Text>

          <Text style={{ color: C.muted, fontSize: '15px', lineHeight: '1.65', margin: '0 0 18px' }}>
            Como bonus quedaste suscrito a nuestro <strong style={{ color: C.amberSoft }}>boletín</strong>:
            cada cierto tiempo te llegará una guía corta de construcción y remodelación —técnicas DIY,
            errores típicos a evitar y comparativas de materiales—.
          </Text>

          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button
              href={shopUrl}
              style={{
                backgroundColor: C.amber,
                color: '#0a0a0a',
                fontWeight: 800,
                padding: '14px 28px',
                borderRadius: '999px',
                textDecoration: 'none',
                fontSize: '14px',
                letterSpacing: '0.06em',
                display: 'inline-block',
              }}
            >
              Explorar la tienda
            </Button>
          </Section>

          <Hr style={{ borderColor: C.border, margin: '24px 0 12px' }} />
          <Text style={{ color: C.muted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
            ¿No quieres recibir el boletín?{' '}
            <Link href={unsubscribeUrl} style={{ color: C.amberSoft }}>
              Darme de baja
            </Link>
          </Text>
          <Text style={{ color: C.muted, fontSize: '11px', textAlign: 'center', margin: '8px 0 0' }}>
            © {new Date().getFullYear()} Soluciones Fabrick · Construcción y remodelaciones
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
