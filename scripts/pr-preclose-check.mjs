import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];

function requireText(path, ...needles) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) failures.push(`${path}: falta "${needle}"`);
  }
}

function forbidText(path, ...needles) {
  const content = read(path);
  for (const needle of needles) {
    if (content.includes(needle)) failures.push(`${path}: no debe contener "${needle}"`);
  }
}

requireText(
  'src/app/centro-tecnico/page.tsx',
  'Calculamos antes de recomendar',
  'Fuentes técnicas consultables',
  'StructuredData',
);
requireText('src/app/sitemap.ts', '/centro-tecnico');
requireText('public/llms.txt', '/centro-tecnico', '/herramientas/metalcon/monitoreo');
requireText('src/app/herramientas/aire-acondicionado/page.tsx', 'TechnicalAuthoritySection', 'StructuredData');
requireText('src/app/herramientas/radier/page.tsx', 'TechnicalAuthoritySection', 'StructuredData');
requireText('src/app/herramientas/metalcon/page.tsx', 'TechnicalAuthoritySection', 'StructuredData');
requireText('src/app/herramientas/metalcon/monitoreo/page.tsx', 'TechnicalAuthoritySection', 'StructuredData');
requireText('infra/cloudflare/pay-per-crawl-worker.js', 'cf-pay-per-crawl', 'crawler-price');

forbidText('src/app/loading.tsx', 'Preparando Soluciones Fabrick');
forbidText('src/components/SplashScreen.tsx', 'Preparando Soluciones Fabrick');
forbidText('src/middleware.ts', 'crawler-price', 'cf-pay-per-crawl');

if (failures.length) {
  console.error('\nPR pre-close gate FAILED:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nCorrige estos puntos antes de cerrar o fusionar el PR.\n');
  process.exit(1);
}

console.log('PR pre-close static gate OK.');
console.log('Antes de cerrar/fusionar ejecuta además:');
console.log('  pnpm test:commerce-p0');
console.log('  pnpm test:funnel-btu');
console.log('  pnpm test:radier');
console.log('  pnpm test:storefront');
console.log('  pnpm typecheck');
console.log('Y cuando Vercel libere el build-rate-limit: preview READY + smoke manual del head exacto.');
