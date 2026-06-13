import type { ProspectImportPayload, ProspectImportResult, ProspectInput, ProspectRecord } from '../types/prospect.types';

export interface ProspectListFilters {
  q?: string;
  status?: string;
  probability?: string;
  city?: string;
  industry?: string;
}

function qs(filters: ProspectListFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

export async function listProspects(filters: ProspectListFilters = {}): Promise<{ prospects: ProspectRecord[]; connected: boolean }> {
  const res = await fetch(`/api/admin/prospecting/prospects${qs(filters)}`, { cache: 'no-store' });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudieron cargar los prospectos.');
  return { prospects: Array.isArray(json.prospects) ? json.prospects : [], connected: Boolean(json.connected) };
}

export async function createProspect(input: ProspectInput): Promise<ProspectRecord> {
  const res = await fetch('/api/admin/prospecting/prospects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudo crear el prospecto.');
  return json.prospect as ProspectRecord;
}

export async function updateProspect(id: string, patch: Partial<ProspectInput>): Promise<ProspectRecord> {
  const res = await fetch('/api/admin/prospecting/prospects', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...patch }),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudo actualizar el prospecto.');
  return json.prospect as ProspectRecord;
}

export async function deleteProspect(id: string): Promise<void> {
  const res = await fetch(`/api/admin/prospecting/prospects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudo eliminar el prospecto.');
}

export async function importProspects(payload: ProspectImportPayload | string): Promise<ProspectImportResult> {
  const res = await fetch('/api/admin/prospecting/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof payload === 'string' ? JSON.stringify({ raw: payload }) : JSON.stringify(payload),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudieron importar los prospectos.');
  return json as ProspectImportResult;
}
