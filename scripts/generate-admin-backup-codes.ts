/* eslint-disable no-console */
/**
 * CLI: generate single-use backup codes for an admin account.
 *
 * Usage:
 *   npm run admin:generate-backup-codes
 *
 * Flow:
 *   1. Loads .env.local / .env so ADMIN_PASSWORD_PEPPER (used to hash the
 *      codes) and the InsForge credentials are available.
 *   2. Asks for the email of an existing `admin_users` row (defaults to
 *      ADMIN_EMAIL env var). Refuses to proceed if the row has no TOTP
 *      enabled — backup codes only make sense as a recovery path FOR
 *      TOTP, and exposing them on a non-2FA account would just lower
 *      the bar for an attacker to bypass the password.
 *   3. Warns if codes already exist (overwrite invalidates the old set).
 *   4. Generates 10 fresh codes, hashes them with scrypt+pepper, and
 *      persists ONLY the hashes to admin_users.backup_codes.
 *   5. Prints the plaintext codes ONCE. After this command exits, the
 *      plaintexts are unrecoverable — that's the whole point of the
 *      hash-only storage model.
 *
 * Save the printed codes in a password manager / printout. When you
 * lose your authenticator device, type any of these into the TOTP field
 * on /admin/login — the route will detect the format, consume the code,
 * and let you log in once.
 */

import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  generateBackupCodes,
  hashBackupCodes,
  DEFAULT_BACKUP_CODE_COUNT,
} from '../src/lib/adminBackupCodes';

async function loadDotenv(): Promise<void> {
  for (const file of ['.env.local', '.env']) {
    const full = path.resolve(process.cwd(), file);
    let content: string;
    try {
      content = await fs.readFile(full, 'utf8');
    } catch {
      continue;
    }
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main(): Promise<void> {
  await loadDotenv();

  console.log('🔐  Soluciones Fabrick — generate TOTP backup codes');
  console.log('   (Fase 1.3b — recovery primitive for lost authenticator)\n');

  if (!process.env.ADMIN_PASSWORD_PEPPER && process.env.NODE_ENV === 'production') {
    console.error('❌  ADMIN_PASSWORD_PEPPER no está configurado.');
    console.error('    Sin él, los backup codes quedarían sin pepper y serían más débiles.');
    process.exitCode = 1;
    return;
  }

  const defaultEmail = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const emailRaw = await ask(
    defaultEmail
      ? `Email del administrador [${defaultEmail}]: `
      : 'Email del administrador: '
  );
  const email = (emailRaw || defaultEmail).toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('❌  Email inválido.');
    process.exitCode = 1;
    return;
  }

  const { insforgeAdmin } = await import('../src/lib/insforge');

  const { data: rows, error: selectErr } = await insforgeAdmin.database
    .from('admin_users')
    .select('email, totp_secret_enc, backup_codes')
    .eq('email', email)
    .limit(1);

  if (selectErr) {
    console.error('❌  Error consultando admin_users:', selectErr.message ?? selectErr);
    process.exitCode = 1;
    return;
  }
  if (!rows || rows.length === 0) {
    console.error(`❌  No existe ningún admin con email ${email}.`);
    process.exitCode = 1;
    return;
  }
  const row = rows[0] as { totp_secret_enc?: string | null; backup_codes?: string[] | null };

  if (!row.totp_secret_enc) {
    console.error(
      `❌  ${email} no tiene TOTP habilitado. Habilítalo primero con` +
        '\n    `npm run admin:enable-totp`. Los backup codes solo tienen sentido'
    );
    console.error('    como recovery del segundo factor.');
    process.exitCode = 1;
    return;
  }

  if (Array.isArray(row.backup_codes) && row.backup_codes.length > 0) {
    console.log(
      `⚠️   Este admin ya tiene ${row.backup_codes.length} backup codes activos.`
    );
    console.log('    Generar codes nuevos INVALIDA todos los anteriores.');
    const overwrite = await ask('¿Continuar y reemplazar el conjunto? [y/N]: ');
    if (!/^y(es)?$/i.test(overwrite)) {
      console.log('Cancelado. Los codes existentes siguen siendo válidos.');
      return;
    }
  }

  console.log(`\n🎲  Generando ${DEFAULT_BACKUP_CODE_COUNT} códigos…`);
  const codes = generateBackupCodes(DEFAULT_BACKUP_CODE_COUNT);
  const hashes = await hashBackupCodes(codes);
  const generatedAt = new Date().toISOString();

  const { error: updErr } = await insforgeAdmin.database
    .from('admin_users')
    .update({ backup_codes: hashes, backup_codes_generated_at: generatedAt })
    .eq('email', email);

  if (updErr) {
    console.error('❌  Error guardando admin_users:', updErr.message ?? updErr);
    console.error('    Los códigos NO quedaron persistidos.');
    process.exitCode = 1;
    return;
  }

  console.log('\n✅  Códigos generados. GUÁRDALOS AHORA — no se mostrarán de nuevo:\n');
  for (let i = 0; i < codes.length; i++) {
    console.log(`   ${(i + 1).toString().padStart(2, ' ')}.  ${codes[i]}`);
  }
  console.log('\n📌  Cada código se puede usar UNA VEZ. Tras consumirlo desaparece');
  console.log('    de la BD automáticamente. Cuando te queden pocos, regenera con');
  console.log('    `npm run admin:generate-backup-codes` (esto invalida los actuales).');
  console.log('\n🛡️   Para usar uno: en /admin/login, en el campo TOTP escribe el');
  console.log('    código completo (con o sin guiones, mayúsculas o minúsculas)');
  console.log('    en lugar de los 6 dígitos del authenticator.');
}

main().catch((err) => {
  console.error('❌  Error inesperado:', err);
  process.exitCode = 1;
});
