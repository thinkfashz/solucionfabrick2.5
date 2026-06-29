#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiDir = path.join(root, 'src', 'app', 'api');

const tenantAwareTables = [
  'products',
  'orders',
  'admin_users',
  'integrations',
  'blog_posts',
  'media_assets',
  'invoices',
  'quotes',
  'shipments',
  'banners',
  'presupuestos',
  'clientes',
  'customers',
  'payments',
];

const safeGlobalPaths = [
  '/api/platform/',
  '/api/tenant/',
  '/api/cron/',
  '/api/health',
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (/route\.(ts|tsx|js|mjs)$/.test(entry.name)) return [full];
    return [];
  });
}

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function looksLikeGlobalRoute(file) {
  const rel = `/${relative(file).replace(/^src\/app/, '')}`;
  return safeGlobalPaths.some((safe) => rel.includes(safe));
}

function tableUsed(source, table) {
  const patterns = [
    `.from('${table}')`,
    `.from(\"${table}\")`,
    `from('${table}')`,
    `from(\"${table}\")`,
  ];
  return patterns.some((pattern) => source.includes(pattern));
}

function hasTenantFilter(source) {
  return [
    "eq('tenant_id'",
    'eq(\"tenant_id\"',
    '.tenant_id',
    'tenantId',
    'tenant_id',
    'requireTenant',
    'resolveTenant',
    'getTenant',
    'x-tenant-id',
  ].some((pattern) => source.includes(pattern));
}

function main() {
  const files = walk(apiDir);
  const findings = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const usedTables = tenantAwareTables.filter((table) => tableUsed(source, table));
    if (!usedTables.length) continue;
    if (looksLikeGlobalRoute(file)) continue;
    if (!hasTenantFilter(source)) {
      findings.push({ file: relative(file), tables: usedTables });
    }
  }

  console.log('\nSaaS tenant audit');
  console.log('=================\n');

  if (!findings.length) {
    console.log('OK: no se detectaron rutas obvias sin tenant_id.');
    process.exit(0);
  }

  console.log('Revisar estas rutas antes de vender como SaaS:\n');
  for (const finding of findings) {
    console.log(`- ${finding.file}`);
    console.log(`  tablas: ${finding.tables.join(', ')}`);
  }

  console.log('\nAcción recomendada: filtrar cada operación por tenant_id o justificar que la ruta sea global/superadmin.');
  process.exit(1);
}

main();
