import { createHash, randomBytes } from 'node:crypto';
import { base64urlDecode } from './base64url';

export const PASSKEY_CHALLENGE_TTL_SECONDS = 5 * 60;

export function randomChallenge(): string {
  return randomBytes(32).toString('base64url');
}

export function resolveRpId(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost';
  return host.split(':')[0].toLowerCase();
}

export function resolveOrigin(request: Request): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost';
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) return `http://${host}`;
  return `${proto}://${host}`;
}

export function sha256(data: Buffer | string): Buffer {
  return createHash('sha256').update(data).digest();
}

type ClientData = {
  type?: string;
  challenge?: string;
  origin?: string;
};

export function verifyClientDataJSON(params: {
  clientDataJSON: string;
  expectedChallenge: string;
  expectedOrigin: string;
  expectedType: 'webauthn.create' | 'webauthn.get';
}): Buffer {
  const clientDataBuffer = base64urlDecode(params.clientDataJSON);
  const parsed = JSON.parse(clientDataBuffer.toString('utf8')) as ClientData;
  if (parsed.type !== params.expectedType) throw new Error('Tipo WebAuthn inválido.');
  if (parsed.challenge !== params.expectedChallenge) throw new Error('Challenge WebAuthn inválido o expirado.');
  if (parsed.origin !== params.expectedOrigin) throw new Error('Origen WebAuthn inválido.');
  return clientDataBuffer;
}
