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

export interface PresupuestoEmailProps {
  customerName: string;
  link: string;
  total: number;
  expiraAt: string; // ISO
  notas?: string | null;
  ttlDias: number;
  logoUrl?: string;
}

const COLORS = {
  bg: '#070707',
  card: '#0c0c0c',
  border: '#262626', // neutral-800
  text: '#fafafa',
  muted: '#a1a1aa',
  amber: '#f59e0b', // amber-500
  amberSoft: '#fbbf24', // amber-400
};

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n);

const formatExpira = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('es-CL', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Santiago',
    });
  } catch {
    return iso;
  }
};

export function PresupuestoEmail({
  customerName,
  link,
  total,
  expiraAt,
  notas,
  ttlDias,
  logoUrl,
}: PresupuestoEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Tu presupuesto de Soluciones Fabrick — válido por ${ttlDias} días`}</Preview>
      <Body
        style={{
          backgroundColor: COLORS.bg,
          color: COLORS.text,
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
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '20px',
            padding: '32px 28px',
          }}
        >
          <Section style={{ textAlign: 'center', paddingBottom: '8px' }}>
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt="Soluciones Fabrick"
                width="160"
                height="44"
                style={{ display: 'inline-block', maxWidth: '160px', height: 'auto' }}
              />
            ) : (
              <Text
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: COLORS.amberSoft,
                }}
              >
                Soluciones Fabrick
              </Text>
            )}
          </Section>

          <Hr style={{ borderColor: COLORS.border, margin: '24px 0' }} />

          <Heading
            as="h1"
            style={{
              fontSize: '22px',
              lineHeight: '1.3',
              margin: '0 0 12px',
              color: COLORS.text,
            }}
          >
            Hola {customerName}, tu presupuesto está listo.
          </Heading>

          <Text style={{ color: COLORS.muted, fontSize: '15px', lineHeight: '1.6', margin: '0 0 16px' }}>
            Preparamos un presupuesto detallado para tu proyecto. Puedes revisarlo en línea con todos los
            materiales, cantidades y el total estimado.
          </Text>

          <Section
            style={{
              border: `1px solid ${COLORS.border}`,
              borderRadius: '14px',
              padding: '16px 18px',
              marginBottom: '20px',
            }}
          >
            <Text style={{ margin: 0, color: COLORS.muted, fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Total estimado
            </Text>
            <Text style={{ margin: '4px 0 0', color: COLORS.amberSoft, fontSize: '26px', fontWeight: 800 }}>
              {formatCLP(total)}
            </Text>
            <Text style={{ margin: '12px 0 0', color: COLORS.muted, fontSize: '12px' }}>
              Válido hasta <strong style={{ color: COLORS.text }}>{formatExpira(expiraAt)}</strong>
              {' '}({ttlDias} días desde la emisión).
            </Text>
          </Section>

          {notas ? (
            <Text style={{ color: COLORS.muted, fontSize: '13px', lineHeight: '1.6', margin: '0 0 20px' }}>
              {notas}
            </Text>
          ) : null}

          <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
            <Button
              href={link}
              style={{
                backgroundColor: COLORS.amber,
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
              Ver mi presupuesto
            </Button>
          </Section>

          <Text style={{ color: COLORS.muted, fontSize: '12px', lineHeight: '1.6', margin: '0 0 4px' }}>
            Por la rotación de precios de materiales, este enlace caduca automáticamente a los {ttlDias} días.
            Si no alcanzas a revisarlo, escríbenos y lo regeneramos.
          </Text>
          <Text style={{ color: COLORS.muted, fontSize: '12px', margin: '4px 0 0', wordBreak: 'break-all' }}>
            <Link href={link} style={{ color: COLORS.amberSoft }}>
              {link}
            </Link>
          </Text>

          <Hr style={{ borderColor: COLORS.border, margin: '24px 0 12px' }} />
          <Text style={{ color: COLORS.muted, fontSize: '11px', textAlign: 'center', margin: 0 }}>
            © {new Date().getFullYear()} Soluciones Fabrick · Construcción y remodelaciones
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PresupuestoEmail;
