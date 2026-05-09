/* eslint-disable no-console */
/**
 * CLI: set or update the local owner password (scrypt + pepper) for an admin.
 *
 * Usage:
 *   npm run admin:set-password
 *
 * The script:
 *   1. Loads .env.local / .env if present (so ADMIN_PASSWORD_PEPPER and the
 *      InsForge credentials are available).
 *   2. Asks for the email of an existing `admin_users` row (defaults to
 *      ADMIN_EMAIL env var).
 *   3. Reads the password TWICE from stdin with terminal echo disabled —
 *      the password never appears in argv, env vars, shell history, or the
 *      terminal scroll buffer.
 *   4. Hashes it with `hashAdminPassword()` and UPSERTs into
 *      `admin_users.password_hash` via the InsForge admin client.
 *
 * After running this once, the /admin/login route will REQUIRE both InsForge
 * auth AND a matching local password hash for that email — see the comment
 * block in src/lib/adminPasswordHash.ts.
 */

import { createInterface } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { hashAdminPassword, assertPepperConfigured } from '../src/lib/adminPasswordHash';

/**
 * Minimal `.env` loader — keeps the script dependency-free. Only sets keys
 * that are not already present in process.env, so real CI/Vercel env wins.
 */
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

/** Prompt the user with a plaintext question and return the trimmed answer. */
function ask(question: string): Promise<string> {
  const rl = createInterface({ input, output });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Read a password from stdin without echoing it to the terminal.
 * Falls back to `ask()` on platforms where TTY raw mode is unavailable.
 */
function askSecret(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      // Non-interactive (CI, docker exec without -t) — accept echoed input.
      resolve(ask(question));
      return;
    }
    output.write(question);
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');

    let buffer = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          input.setRawMode(false);
          input.pause();
          input.removeListener('data', onData);
          output.write('\n');
          resolve(buffer);
          return;
        }
        if (ch === '\u0003') {
          // Ctrl-C
          input.setRawMode(false);
          input.pause();
          input.removeListener('data', onData);
          output.write('\n');
          reject(new Error('Aborted by user'));
          return;
        }
        if (ch === '\u007f' || ch === '\b') {
          buffer = buffer.slice(0, -1);
          continue;
        }
        buffer += ch;
      }
    };
    input.on('data', onData);
  });
}

async function main(): Promise<void> {
  await loadDotenv();

  console.log('🔐  Soluciones Fabrick — set admin owner password');
  console.log('   (scrypt + ADMIN_PASSWORD_PEPPER — Fase 1 plan privatización)\n');

  if (process.env.NODE_ENV !== 'production') {
    (process.env as Record<string, string>).NODE_ENV = 'production';
  }
  try {
    assertPepperConfigured();
  } catch (err) {
    console.error('❌  ' + (err instanceof Error ? err.message : String(err)));
    console.error('    Run:  openssl rand -base64 48');
    console.error('    Then add it to .env.local as ADMIN_PASSWORD_PEPPER and to your hosting env vars.');
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

  const password = await askSecret('Nueva contraseña (≥12 caracteres, no se mostrará): ');
  const confirm = await askSecret('Confirma la contraseña: ');
  if (password !== confirm) {
    console.error('❌  Las contraseñas no coinciden.');
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    console.error('❌  La contraseña debe tener al menos 12 caracteres.');
    process.exitCode = 1;
    return;
  }

  console.log('⏳  Generando hash scrypt (esto toma ~250ms)...');
  const hash = await hashAdminPassword(password);

  // Lazy-import the InsForge client so the dotenv loader runs first.
  const { insforgeAdmin } = await import('../src/lib/insforge');
  const updatedAt = new Date().toISOString();

  // Try update first — if zero rows match, fall back to insert (creates a
  // brand-new admin row). Both branches use the admin client so they bypass
  // any anon-key write restrictions.
  const { data: existing, error: selectErr } = await insforgeAdmin.database
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .limit(1);

  if (selectErr) {
    console.error('❌  Error consultando admin_users:', selectErr.message ?? selectErr);
    process.exitCode = 1;
    return;
  }

  if (existing && existing.length > 0) {
    const { error: updErr } = await insforgeAdmin.database
      .from('admin_users')
      .update({ password_hash: hash, password_hash_updated_at: updatedAt })
      .eq('email', email);
    if (updErr) {
      console.error('❌  Error actualizando admin_users:', updErr.message ?? updErr);
      process.exitCode = 1;
      return;
    }
    console.log(`✅  password_hash actualizado para ${email}`);
  } else {
    const { error: insErr } = await insforgeAdmin.database.from('admin_users').insert([
      {
        email,
        rol: 'superadmin',
        aprobado: true,
        password_hash: hash,
        password_hash_updated_at: updatedAt,
      },
    ]);
    if (insErr) {
      console.error('❌  Error creando admin_users:', insErr.message ?? insErr);
      process.exitCode = 1;
      return;
    }
    console.log(`✅  admin_users creado con password_hash para ${email}`);
  }

  console.log('\n🛡️   Listo. A partir del próximo login, /admin/login exigirá:');
  console.log('     1. Auth de InsForge (email+contraseña existente)');
  console.log('     2. Verificación local scrypt+pepper (la contraseña que acabas de definir)');
  console.log('   Ambas deben coincidir. Sin el pepper la BD por sí sola es inservible.');
}

main().catch((err) => {
  console.error('❌  Error inesperado:', err);
  process.exitCode = 1;
});
