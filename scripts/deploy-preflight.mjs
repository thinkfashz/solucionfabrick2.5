#!/usr/bin/env node
/**
 * Soluciones Fabrick deployment preflight.
 *
 * Dependency-free checker for Vercel/staging/production readiness.
 * It validates environment shape and optionally probes public endpoints when
 * BASE_URL or NEXT_PUBLIC_APP_URL is available.
 *
 * Usage:
 *   pnpm deploy:preflight
 *   DEPLOY_ENV=production BASE_URL=https://solucionesfabrick.com pnpm deploy:preflight
 *   PREFLIGHT_STRICT=true pnpm deploy:preflight
 */

const env = process.env;
const deployEnv = (env.DEPLOY_ENV || env.VERCEL_ENV || env.NODE_ENV || 'development').toLowerCase();
const strict = env.PREFLIGHT_STRICT === 'true' || deployEnv === 'production';
const baseUrl = (env.BASE_URL || env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
const timeoutMs = Number.parseInt(env.PREFLIGHT_TIMEOUT_MS || '6000', 10);

const requiredProduction = [
  ['ADMIN_SESSION_SECRET', 32, 'firma cookies admin'],
  ['ADMIN_PASSWORD_PEPPER', 32, 'pepper password admin'],
  ['ADMIN_INIT_SECRET', 32, 'protege init admin'],
  ['NEXT_PUBLIC_INSFORGE_URL', 1, 'URL InsForge'],
  ['NEXT_PUBLIC_INSFORGE_ANON_KEY', 1, 'anon key InsForge'],
  ['INSFORGE_API_KEY', 1, 'admin key InsForge / SQL / stock atómico'],
];

const warningsProduction = [
  ['TURNSTILE_SECRET_KEY', 'Turnstile desactivado; formularios más expuestos a bots'],
  ['MERCADO_PAGO_WEBHOOK_SECRET', 'webhook Mercado Pago sin secret dedicado'],
  ['NEXT_PUBLIC_SENTRY_DSN', 'Sentry sin DSN público'],
];

function value(key) {
  return (env[key] || '').trim();
}

function hasAny(keys) {
  return keys.some((key) => value(key));
}

function mask(v) {
  if (!v) return '';
  if (v.length <= 8) return '*'.repeat(v.length);
  return `${v.slice(0, 4)}…${v.slice(-4)}`;
}

function validUrl(raw, requireHttps = false) {
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return Boolean(u.hostname) && (!requireHttps || u.protocol === 'https:');
  } catch {
    return false;
  }
}

function validCampaignMode(mode) {
  return !mode || ['normal', 'limited', 'catalog', 'catalog_only', 'solo_catalogo', 'limitado'].includes(mode.toLowerCase());
}

async function probe(path) {
  if (!baseUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: path.startsWith('/api/') ? 'application/json' : 'text/html' },
      cache: 'no-store',
    });
    await response.arrayBuffer().catch(() => undefined);
    return {
      path,
      ok: response.ok,
      status: response.status,
      ms: Math.round(performance.now() - started),
      cache: response.headers.get('cache-control') || '',
    };
  } catch (error) {
    return {
      path,
      ok: false,
      status: 0,
      ms: Math.round(performance.now() - started),
      error: error instanceof Error ? error.name : 'fetch_failed',
      cache: '',
    };
  } finally {
    clearTimeout(timer);
  }
}

const errors = [];
const warnings = [];
const info = [];

for (const [key, minLen, label] of requiredProduction) {
  const v = value(key);
  if (strict && v.length < minLen) errors.push(`${key}: falta o es muy corto (${label}, min ${minLen}).`);
  else if (!v) warnings.push(`${key}: no definido (${label}).`);
}

if (!hasAny(['INTEGRATIONS_ENC_KEY', 'ENCRYPTION_KEY'])) {
  if (strict) errors.push('INTEGRATIONS_ENC_KEY o ENCRYPTION_KEY: requerido para credenciales cifradas.');
  else warnings.push('INTEGRATIONS_ENC_KEY/ENCRYPTION_KEY no definido.');
}

if (!hasAny(['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXTAUTH_URL'])) {
  if (strict) errors.push('NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_SITE_URL/NEXTAUTH_URL: define al menos una URL pública.');
  else warnings.push('URL pública no definida; los probes remotos pueden omitirse.');
}

for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SITE_URL', 'NEXTAUTH_URL', 'NEXT_PUBLIC_INSFORGE_URL']) {
  const v = value(key);
  if (v && !validUrl(v, strict && key !== 'NEXT_PUBLIC_INSFORGE_URL')) {
    errors.push(`${key}: URL inválida${strict ? ' o no HTTPS' : ''}.`);
  }
}

const hasMpToken = hasAny(['MERCADO_PAGO_ACCESS_TOKEN', 'MP_ACCESS_TOKEN', 'MERCADOPAGO_ACCESS_TOKEN']);
const hasMpPublic = hasAny(['NEXT_PUBLIC_MP_PUBLIC_KEY', 'NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY', 'NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY', 'MP_PUBLIC_KEY', 'MERCADO_PAGO_PUBLIC_KEY', 'MERCADOPAGO_PUBLIC_KEY']);
if (!hasMpToken) warnings.push('Mercado Pago access token no configurado; checkout real degradado.');
if (!hasMpPublic) warnings.push('Mercado Pago public key no configurada; checkout real degradado.');

for (const key of ['MERCADO_PAGO_ACCESS_TOKEN', 'MP_ACCESS_TOKEN', 'MERCADOPAGO_ACCESS_TOKEN']) {
  const v = value(key);
  if (v && !v.startsWith('APP_USR-') && !v.startsWith('TEST-')) {
    errors.push(`${key}: token Mercado Pago debe comenzar con APP_USR- o TEST-.`);
  }
}

if (!hasAny(['RESEND_API_KEY']) && !(value('SMTP_USER') && value('SMTP_PASS'))) {
  warnings.push('Email no configurado por env; válido solo si usas integración cifrada en DB.');
}

for (const [key, label] of warningsProduction) {
  if (!value(key)) warnings.push(`${key}: ${label}.`);
}

const campaignMode = value('FABRICK_CAMPAIGN_MODE') || value('CAMPAIGN_MODE') || 'normal';
if (!validCampaignMode(campaignMode)) errors.push(`FABRICK_CAMPAIGN_MODE inválido: ${campaignMode}. Usa normal, limited o catalog.`);

const retryAfter = value('CAMPAIGN_RETRY_AFTER_SECONDS');
if (retryAfter && (!/^\d+$/.test(retryAfter) || Number(retryAfter) <= 0)) {
  errors.push('CAMPAIGN_RETRY_AFTER_SECONDS debe ser un entero positivo.');
}

info.push(`deployEnv=${deployEnv}`);
info.push(`strict=${strict}`);
info.push(`campaignMode=${campaignMode}`);
info.push(`baseUrl=${baseUrl || '(no definido)'}`);
info.push(`insforge=${mask(value('NEXT_PUBLIC_INSFORGE_URL'))}`);

const paths = ['/', '/tienda', '/api/tienda/products', '/api/productos?limit=3', '/api/payments/mp-status'];
const probes = baseUrl ? await Promise.all(paths.map((path) => probe(path))) : [];
for (const p of probes.filter(Boolean)) {
  if (!p.ok) {
    const msg = `${p.path}: HTTP ${p.status || p.error} en ${p.ms}ms.`;
    if (strict && p.path.startsWith('/api/tienda')) errors.push(msg);
    else warnings.push(msg);
  }
  if (p.ok && p.ms > 2500) warnings.push(`${p.path}: lento ${p.ms}ms.`);
  if (p.path === '/api/tienda/products' && p.ok && !/s-maxage/i.test(p.cache)) {
    warnings.push('/api/tienda/products: no se detectó s-maxage en Cache-Control.');
  }
}

const result = {
  ok: errors.length === 0,
  deployEnv,
  strict,
  info,
  errors,
  warnings,
  probes,
  nextSteps: errors.length
    ? ['Corregir errores antes de desplegar producción.', 'Volver a ejecutar pnpm deploy:preflight.']
    : warnings.length
      ? ['Puede desplegar, pero revisar warnings antes de campaña fuerte.', 'Usar FABRICK_CAMPAIGN_MODE=limited si hay dudas.']
      : ['Listo para deploy/campaña controlada.'],
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) process.exit(1);
