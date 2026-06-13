import type { SectionImproveRequest, SectionImproveResponse } from '../types/section.types';
import { detectEditableSections } from '../utils/html-section-detector';

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

export { detectEditableSections };

export async function improveSectionWithAi(request: SectionImproveRequest): Promise<SectionImproveResponse> {
  const res = await fetch('/api/admin/prospecting/improve-section', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudo mejorar la sección con IA.');
  return json as SectionImproveResponse;
}
