/* eslint-disable no-console */
/**
 * CLI: disable TOTP 2FA for an admin account.
 *
 * Usage:
 *   npm run admin:disable-totp
 *
 * Clears `admin_users.totp_secret_enc` and `totp_enabled_at` for the given
 * email. After this, /api/admin/login will skip the TOTP verification step
 * for that admin (falling back to InsForge auth + optional password layer).
 *
 * Use this when:
 *   • The admin lost access to their authenticator app (must run from a
 *     trusted host since the script writes directly to the DB via the
 *     InsForge admin client).
 *   • Rotating ADMIN_SESSION_SECRET — the existing encrypted secret can no
 *     longer be decrypted, so disabling and re-enrolling is the path
 *     forward.
 */

import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

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

  console.log('🔐  Soluciones Fabrick — disable TOTP 2FA\n');

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

  const confirm = await ask(
    `⚠️   Vas a deshabilitar TOTP para ${email}. Después del próximo login, ya NO se exigirá código de 6 dígitos. ¿Continuar? [y/N]: `
  );
  if (!/^y(es)?$/i.test(confirm)) {
    console.log('Cancelado.');
    return;
  }

  const { insforgeAdmin } = await import('../src/lib/insforge');

  const { error } = await insforgeAdmin.database
    .from('admin_users')
    .update({ totp_secret_enc: null, totp_enabled_at: null })
    .eq('email', email);

  if (error) {
    console.error('❌  Error actualizando admin_users:', error.message ?? error);
    process.exitCode = 1;
    return;
  }

  console.log(`\n✅  TOTP deshabilitado para ${email}.`);
  console.log('   Próximo login NO pedirá código de 6 dígitos.');
}

main().catch((err) => {
  console.error('❌  Error inesperado:', err);
  process.exitCode = 1;
});
