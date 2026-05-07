import * as React from 'react';
import {
	Body,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from '@react-email/components';

export interface IntegrationHealthEmailProps {
	ranAt: string; // ISO
	failures: Array<{
		provider: string;
		error?: string;
		checks?: Array<{ name: string; ok: boolean; detail?: string }>;
		expiringSoon?: boolean;
		expiresAt?: string | null;
	}>;
	dashboardUrl?: string;
}

const COLORS = {
	bg: '#070707',
	card: '#0c0c0c',
	border: '#262626',
	text: '#fafafa',
	muted: '#a1a1aa',
	red: '#ef4444',
	amber: '#f59e0b',
};

const formatDate = (iso: string) => {
	try {
		return new Date(iso).toLocaleString('es-CL', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'America/Santiago',
		});
	} catch {
		return iso;
	}
};

export default function IntegrationHealthEmail({ ranAt, failures, dashboardUrl }: IntegrationHealthEmailProps) {
	const total = failures.length;
	return (
		<Html>
			<Head />
			<Preview>{`Soluciones Fabrick · ${total} integración(es) con problemas`}</Preview>
			<Body style={{ backgroundColor: COLORS.bg, color: COLORS.text, fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '24px 0' }}>
				<Container style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>
					<Section style={{ backgroundColor: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24 }}>
						<Heading as="h1" style={{ margin: 0, color: COLORS.red, fontSize: 22 }}>
							⚠ Integraciones con problemas
						</Heading>
						<Text style={{ margin: '8px 0 0', color: COLORS.muted, fontSize: 13 }}>
							Health-check ejecutado el {formatDate(ranAt)} (hora Chile)
						</Text>
						<Text style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 13 }}>
							{total} proveedor(es) requieren atención.
						</Text>
						<Hr style={{ borderColor: COLORS.border, margin: '20px 0' }} />
						{failures.map((f, idx) => (
							<Section
								key={`${f.provider}-${idx}`}
								style={{
									marginBottom: 16,
									paddingBottom: 12,
									borderBottom: idx < failures.length - 1 ? `1px solid ${COLORS.border}` : 'none',
								}}
							>
								<Text style={{ margin: 0, fontWeight: 700, color: COLORS.text, fontSize: 15 }}>
									{f.provider}
									{f.expiringSoon ? ' · token expira pronto' : ''}
								</Text>
								{f.error ? (
									<Text style={{ margin: '4px 0 0', color: COLORS.red, fontSize: 13 }}>{f.error}</Text>
								) : null}
								{f.expiresAt ? (
									<Text style={{ margin: '4px 0 0', color: COLORS.amber, fontSize: 13 }}>
										Expiración: {formatDate(f.expiresAt)}
									</Text>
								) : null}
								{(f.checks ?? [])
									.filter((c) => !c.ok)
									.map((c, i) => (
										<Text key={i} style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 12 }}>
											· <span style={{ color: COLORS.text }}>{c.name}</span>: {c.detail ?? 'sin detalle'}
										</Text>
									))}
							</Section>
						))}
						{dashboardUrl ? (
							<Text style={{ margin: '24px 0 0', color: COLORS.muted, fontSize: 13 }}>
								Revisar en el panel: <a href={dashboardUrl} style={{ color: COLORS.amber }}>{dashboardUrl}</a>
							</Text>
						) : null}
					</Section>
					<Text style={{ marginTop: 16, color: COLORS.muted, fontSize: 11, textAlign: 'center' }}>
						Soluciones Fabrick · Alerta automática del centro de integraciones
					</Text>
				</Container>
			</Body>
		</Html>
	);
}
