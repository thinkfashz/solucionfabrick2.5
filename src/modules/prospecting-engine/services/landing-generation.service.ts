import type { LandingGenerationRequest, LandingGenerationResponse } from '../types/page.types';

async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}

export async function generateLandingPage(input: LandingGenerationRequest): Promise<LandingGenerationResponse> {
  const res = await fetch('/api/admin/prospecting/generate-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await readJson(res);
  if (!res.ok) throw new Error(json.error || 'No se pudo generar la landing con IA.');
  return json as LandingGenerationResponse;
}
