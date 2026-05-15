'use client';

import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

export async function registerCurrentDevicePasskey(): Promise<{ ok: boolean; error?: string }> {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return { ok: false, error: 'Tu navegador no soporta huella o Face ID.' };
  }

  const optionsRes = await fetch('/api/admin/passkeys/register/options', {
    method: 'POST',
    cache: 'no-store',
  });
  if (!optionsRes.ok) {
    const json = await safeJson(optionsRes);
    return { ok: false, error: json.error ?? 'No se pudo iniciar el registro del dispositivo.' };
  }

  const options = await optionsRes.json();
  const credential = await startRegistration({ optionsJSON: options });

  const verifyRes = await fetch('/api/admin/passkeys/register/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credential),
  });

  if (!verifyRes.ok) {
    const json = await safeJson(verifyRes);
    return { ok: false, error: json.error ?? 'No se pudo guardar la passkey.' };
  }

  return { ok: true };
}

export async function loginWithPasskey(): Promise<{ ok: boolean; error?: string }> {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    return { ok: false, error: 'Tu navegador no soporta huella o Face ID.' };
  }

  const optionsRes = await fetch('/api/admin/passkeys/authenticate/options', {
    method: 'POST',
    cache: 'no-store',
  });
  if (!optionsRes.ok) {
    const json = await safeJson(optionsRes);
    return { ok: false, error: json.error ?? 'No se pudo iniciar el acceso biométrico.' };
  }

  const options = await optionsRes.json();
  const assertion = await startAuthentication({ optionsJSON: options });

  const verifyRes = await fetch('/api/admin/passkeys/authenticate/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertion),
  });

  if (!verifyRes.ok) {
    const json = await safeJson(verifyRes);
    return { ok: false, error: json.error ?? 'No se pudo verificar tu dispositivo.' };
  }

  return { ok: true };
}

async function safeJson(response: Response): Promise<{ error?: string }> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}
