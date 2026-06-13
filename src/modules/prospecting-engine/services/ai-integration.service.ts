import type { AiIntegrationCredentials, AiIntegrationStatus, AiIntegrationTestResult, AiProviderId } from '../types/ai.types';

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

export async function listAiIntegrationStatuses(): Promise<AiIntegrationStatus[]> {
  const res = await fetch('/api/admin/prospecting/integrations', { cache: 'no-store' });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudieron cargar las integraciones IA.');
  return Array.isArray(json.integrations) ? json.integrations : [];
}

export async function saveAiIntegration(provider: AiProviderId, credentials: AiIntegrationCredentials): Promise<AiIntegrationStatus> {
  const res = await fetch('/api/admin/prospecting/integrations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, credentials }),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudo guardar la integración IA.');
  return json.integration as AiIntegrationStatus;
}

export async function deleteAiIntegration(provider: AiProviderId): Promise<void> {
  const res = await fetch(`/api/admin/prospecting/integrations?provider=${encodeURIComponent(provider)}`, { method: 'DELETE' });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudo eliminar la integración IA.');
}

export async function testAiIntegration(provider: AiProviderId, credentials?: AiIntegrationCredentials): Promise<AiIntegrationTestResult> {
  const res = await fetch('/api/admin/prospecting/integrations/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, credentials: credentials || {} }),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || json.message || 'No se pudo testear la integración IA.');
  return json as AiIntegrationTestResult;
}
