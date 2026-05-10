/* eslint-disable no-console */
/**
 * CLI: enable TOTP 2FA for an admin account.
 *
 * Usage:
 *   npm run admin:enable-totp
 *
 * Flow:
 *   1. Loads .env.local / .env so ADMIN_SESSION_SECRET (used to derive the
 *      AES key for storage) and the InsForge credentials are available.
 *   2. Asks for the email of an existing `admin_users` row (defaults to
 *      ADMIN_EMAIL env var).
 *   3. Generates a fresh 160-bit base32 secret, prints both the
 *      `otpauth://` URL (paste into a QR generator or any authenticator
 *      app's "Add manually") and the bare base32 secret for manual entry.
 *   4. Prints the *current* expected code so the user can sanity-check
 *      that their authenticator is in sync before locking themselves out.
 *   5. Asks for a code from the authenticator and verifies it against the
 *      newly-generated secret. Only on a successful verification does the
 *      script encrypt and persist the secret to `admin_users.totp_secret_enc`.
 *
 * After this, /api/admin/login will REQUIRE a 6-digit `totp` field for
 * this email — see /api/admin/login/route.ts and docs/security-private-mode.md.
 */

import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  generateBase32Secret,
  buildOtpAuthUrl,
  verifyTotp,
  generateTotp,
  timeStepFor,
} from '../src/lib/adminTotp';
import { encryptTotpSecret } from '../src/lib/adminTotpCrypto';

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

/** Splits a 32-char base32 secret into 4-char groups for easier manual typing. */
function formatSecretForHumans(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(' ') ?? secret;
}

async function main(): Promise<void> {
  await loadDotenv();

  console.log('🔐  Soluciones Fabrick — enable TOTP 2FA');
  console.log('   (RFC 6238, AES-256-GCM at rest — Fase 1.3 plan privatización)\n');

  if (!process.env.ADMIN_SESSION_SECRET) {
    console.error('❌  ADMIN_SESSION_SECRET no está configurado.');
    console.error('    Sin él no se puede cifrar el secret TOTP en la BD.');
    console.error('    Generar con:  openssl rand -base64 48');
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

  // Lazy-import after dotenv has populated process.env.
  const { insforgeAdmin } = await import('../src/lib/insforge');

  const { data: rows, error: selectErr } = await insforgeAdmin.database
    .from('admin_users')
    .select('email, totp_secret_enc')
    .eq('email', email)
    .limit(1);

  if (selectErr) {
    console.error('❌  Error consultando admin_users:', selectErr.message ?? selectErr);
    process.exitCode = 1;
    return;
  }
  if (!rows || rows.length === 0) {
    console.error(`❌  No existe ningún admin con email ${email}.`);
    console.error('    Crea primero la fila (por ejemplo via npm run admin:set-password).');
    process.exitCode = 1;
    return;
  }
  if (rows[0].totp_secret_enc) {
    const overwrite = await ask(
      `⚠️   ${email} ya tiene TOTP habilitado. ¿Sobrescribir? [y/N]: `
    );
    if (!/^y(es)?$/i.test(overwrite)) {
      console.log('Cancelado.');
      return;
    }
  }

  const secret = generateBase32Secret();
  const issuer = process.env.NEXT_PUBLIC_APP_URL?.replace(/^https?:\/\//, '') ?? 'Soluciones Fabrick';
  const otpauthUrl = buildOtpAuthUrl({ secretBase32: secret, issuer, account: email });

  console.log('\n📲  Configura tu app autenticadora (Google Authenticator, Authy, 1Password, …):');
  console.log('\n   Opción A — escanear QR:');
  console.log('   Pega esta URL en un generador QR (offline preferible) y escanéala:\n');
  console.log(`   ${otpauthUrl}\n`);
  console.log('   Opción B — entrada manual:');
  console.log(`   Issuer:  ${issuer}`);
  console.log(`   Cuenta:  ${email}`);
  console.log(`   Secret:  ${formatSecretForHumans(secret)}`);
  console.log('   Tipo:    Time-based (TOTP), 6 dígitos, 30s, SHA-1\n');

  // Show the *current* expected code so the user can verify their app is
  // generating the same value before they commit. This catches clock-skew
  // and "I scanned the wrong QR" mistakes BEFORE the secret is stored.
  const expectedNow = generateTotp(secret, timeStepFor());
  console.log(`🔎  Código esperado AHORA (referencia): ${expectedNow}`);
  console.log('   Si tu app muestra otro código, revisa la hora del dispositivo.\n');

  const userCode = await ask('Ingresa el código de 6 dígitos que muestra tu app: ');
  if (!verifyTotp(userCode, secret)) {
    console.error('❌  El código no coincide. NO se guardó nada. Reintenta.');
    process.exitCode = 1;
    return;
  }

  const encrypted = encryptTotpSecret(secret);
  const enabledAt = new Date().toISOString();

  const { error: updErr } = await insforgeAdmin.database
    .from('admin_users')
    .update({ totp_secret_enc: encrypted, totp_enabled_at: enabledAt })
    .eq('email', email);

  if (updErr) {
    console.error('❌  Error guardando admin_users:', updErr.message ?? updErr);
    console.error('    El secret NO quedó persistido. Vuelve a intentar.');
    process.exitCode = 1;
    return;
  }

  console.log(`\n✅  TOTP habilitado para ${email}.`);
  console.log('🛡️   A partir del próximo login, /admin/login exigirá:');
  console.log('     1. Auth de InsForge (email + contraseña)');
  console.log('     2. Verificación local scrypt+pepper (si está configurada)');
  console.log('     3. Código TOTP de 6 dígitos de tu app');
  console.log('   Guarda tu authenticator (no la borres) y considera respaldar el secret');
  console.log('   en un manager seguro: rotar ADMIN_SESSION_SECRET hace inservible el');
  console.log('   secret cifrado y obliga a re-enrolar.');
}

main().catch((err) => {
  console.error('❌  Error inesperado:', err);
  process.exitCode = 1;
});
