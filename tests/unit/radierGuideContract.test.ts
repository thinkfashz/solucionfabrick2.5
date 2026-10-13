import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('Radier guide + budget contract', () => {
  it('keeps the calculator and viewer contracts untouched', () => {
    const calculator = read('src/components/store/RadierCalculatorPremium.tsx');
    expect(calculator).toContain("dynamic(() => import('@/components/store/RadierCinematicViewer')");
    expect(calculator).toContain('length={length}');
    const viewer = read('src/components/store/RadierCinematicViewer.tsx');
    expect(viewer).toContain('Reproducir 4D');
    expect(viewer).toContain('Capas abiertas');
  });

  it('wires the budget, guide, gate, comments and social blocks on the radier page', () => {
    const page = read('src/app/herramientas/radier/page.tsx');
    expect(page).toContain('RadierStudio');
    expect(page).toContain('RadierComments');
    expect(page).toContain('RadierSocial');
    expect(page).toContain('RadierMobileBar');
    expect(page).toContain('TechnicalAuthoritySection');
    expect(page).toContain('StructuredData');
    const studio = read('src/components/radier/RadierStudio.tsx');
    expect(studio).toContain('RadierCalculatorPremium');
    expect(studio).toContain('RadierBudgetSheet');
    expect(studio).toContain('RadierMixDecision');
    expect(studio).toContain('RadierGuide');
  });

  it('stores radier comments with moderation, honeypot and per-IP limits', () => {
    const route = read('src/app/api/radier/comments/route.ts');
    expect(route).toContain('radier_comments');
    expect(route).toContain('ensureRadierCommentsTable');
    expect(route).toContain("status: 'pending'");
    expect(route).toContain('honeypot');
    expect(route).toContain('429');
    expect(route).toContain('adminSession');
  });

  it('ensures the comments table on server boot without breaking startup', () => {
    const instrumentation = read('src/instrumentation.ts');
    expect(instrumentation).toContain('register');
    expect(instrumentation).toContain('ensureRadierCommentsTable');
    expect(instrumentation).toContain('IF NOT EXISTS');
    const db = read('src/lib/radierDb.ts');
    expect(db).toContain('CREATE TABLE IF NOT EXISTS public.radier_comments');
  });

  it('brands the budget sheet and gates the PDF behind the CRM lead', () => {
    const sheet = read('src/components/radier/RadierBudgetSheet.tsx');
    expect(sheet).toContain('FabrickFullLogo');
    expect(sheet).toContain('Hoja de presupuesto');
    const gate = read('src/components/radier/RadierGuideGate.tsx');
    expect(gate).toContain('/api/leads');
    expect(gate).toContain('tipo_proyecto');
    const pdf = read('src/components/radier/RadierPdfButton.tsx');
    expect(pdf).toContain('jspdf');
    expect(pdf).toContain('Hoja de presupuesto');
    const actions = read('src/components/radier/RadierShareActions.tsx');
    expect(actions).toContain('buildWhatsAppLink');
  });
});
