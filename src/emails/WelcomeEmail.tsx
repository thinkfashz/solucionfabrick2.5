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
  brandName?: string;
  accentColor?: string;
  contactEmail?: string | null;
}

export function WelcomeEmail({
  customerName,
  shopUrl,
  unsubscribeUrl,
  logoUrl,
  brandName = 'Soluciones Fabrick',
  accentColor = '#F5871F',
  contactEmail,
}: WelcomeEmailProps) {
  const greet = customerName ? `Hola ${customerName},` : 'Hola,';
  const softAccent = '#FFB000';
  const muted = '#BFB8AC';
  const text = '#FFF9EE';
  const border = '#262626';

  return (
    <Html>
      <Head />
      <Preview>Bienvenido a {brandName} · Tu cuenta está lista</Preview>
      <Body
        style={{
          backgroundColor: '#08090A',
          color: text,
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          margin: 0,
          padding: '32px 0',
        }}
      >
        <Container
          style={{
            maxWidth: '560px',
            margin: '0 auto',
            backgroundColor: '#111214',
            border: `1px solid ${border}`,
            borderRadius: '20px',
            padding: '32px 28px',
          }}
        >
          <Section style={{ textAlign: 'center', paddingBottom: '8px' }}>
            {logoUrl ? (
              <Img src={logoUrl} alt={brandName} width="180" style={{ display: 'inline-block', maxWidth: '180px', maxHeight: '72px', objectFit: 'contain', height: 'auto' }} />
            ) : (
              <Text style={{ margin: 0, fontSize: '20px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: softAccent }}>
                {brandName}
              </Text>
            )}
          </Section>

          <Hr style={{ borderColor: border, margin: '24px 0' }} />

          <Heading as="h1" style={{ fontSize: '24px', lineHeight: '1.3', margin: '0 0 12px', color: text }}>
            {greet} bienvenido a {brandName}.
          </Heading>

          <Text style={{ color: muted, fontSize: '15px', lineHeight: '1.65', margin: '0 0 14px' }}>
            Tu cuenta ya está creada. Desde aquí podrás revisar pedidos, solicitudes, presupuestos y herramientas disponibles para tu experiencia.
          </Text>

          <Text style={{ color: muted, fontSize: '15px', lineHeight: '1.65', margin: '0 0 18px' }}>
            Guarda este correo como referencia. Cuando necesites volver, utiliza el botón inferior para entrar directamente a la aplicación.
          </Text>

          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button
              href={shopUrl}
              style={{
                backgroundColor: accentColor,
                color: '#08090A',
                fontWeight: 800,
                padding: '14px 28px',
                borderRadius: '999px',
                textDecoration: 'none',
                fontSize: '14px',
                letterSpacing: '0.04em',
                display: 'inline-block',
              }}
            >
              Abrir {brandName}
            </Button>
          </Section>

          {contactEmail ? (
            <Text style={{ color: muted, fontSize: '12px', lineHeight: '1.6', textAlign: 'center', margin: '0 0 12px' }}>
              ¿Necesitas ayuda? Escríbenos a <Link href={`mailto:${contactEmail}`} style={{ color: softAccent }}>{contactEmail}</Link>.
            </Text>
          ) : null}

          <Hr style={{ borderColor: border, margin: '24px 0 12px' }} />
          <Text style={{ color: muted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
            ¿No quieres recibir comunicaciones? <Link href={unsubscribeUrl} style={{ color: softAccent }}>Darme de baja</Link>
          </Text>
          <Text style={{ color: muted, fontSize: '11px', textAlign: 'center', margin: '8px 0 0' }}>
            © {new Date().getFullYear()} {brandName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;
