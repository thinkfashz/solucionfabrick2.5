import { base64urlDecode } from './base64url';
import { asCborMap, readCbor } from './cbor';
import { sha256 } from './core';

function coseEc2ToJwk(publicKeyCose: string): JsonWebKey {
  const map = asCborMap(readCbor(base64urlDecode(publicKeyCose)).value);
  const kty = map.get(1);
  const alg = map.get(3);
  const crv = map.get(-1);
  const x = map.get(-2);
  const y = map.get(-3);
  if (kty !== 2 || alg !== -7 || crv !== 1 || !Buffer.isBuffer(x) || !Buffer.isBuffer(y)) {
    throw new Error('Solo se soportan passkeys ES256/P-256 en esta versión.');
  }
  return {
    kty: 'EC',
    crv: 'P-256',
    x: x.toString('base64url'),
    y: y.toString('base64url'),
    ext: true,
  };
}

function derToRawEcdsaSignature(signatureDer: Buffer): Buffer {
  if (signatureDer[0] !== 0x30) throw new Error('Firma ECDSA DER inválida.');
  let offset = 2;
  if (signatureDer[offset++] !== 0x02) throw new Error('Firma ECDSA DER inválida.');
  const rLen = signatureDer[offset++];
  let r = signatureDer.subarray(offset, offset + rLen);
  offset += rLen;
  if (signatureDer[offset++] !== 0x02) throw new Error('Firma ECDSA DER inválida.');
  const sLen = signatureDer[offset++];
  let s = signatureDer.subarray(offset, offset + sLen);
  while (r.length > 32 && r[0] === 0) r = r.subarray(1);
  while (s.length > 32 && s[0] === 0) s = s.subarray(1);
  if (r.length > 32 || s.length > 32) throw new Error('Firma ECDSA fuera de rango.');
  const raw = Buffer.alloc(64);
  r.copy(raw, 32 - r.length);
  s.copy(raw, 64 - s.length);
  return raw;
}

export async function verifyAssertionSignature(params: {
  publicKeyCose: string;
  authenticatorData: string;
  clientDataJSONBuffer: Buffer;
  signature: string;
  expectedRpId: string;
  previousSignCount: number;
}): Promise<{ signCount: number }> {
  const authenticatorData = base64urlDecode(params.authenticatorData);
  const rpIdHash = authenticatorData.subarray(0, 32);
  const expectedRpIdHash = sha256(params.expectedRpId);
  if (!rpIdHash.equals(expectedRpIdHash)) throw new Error('RP ID inválido.');

  const flags = authenticatorData[32];
  if ((flags & 0x01) === 0) throw new Error('Usuario no presente en autenticador.');
  if ((flags & 0x04) === 0) throw new Error('Verificación biométrica/PIN requerida.');

  const signCount = authenticatorData.readUInt32BE(33);
  if (params.previousSignCount > 0 && signCount > 0 && signCount <= params.previousSignCount) {
    throw new Error('Contador de firma inválido. Posible credencial clonada.');
  }

  const key = await crypto.subtle.importKey(
    'jwk',
    coseEc2ToJwk(params.publicKeyCose),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );

  const signedData = Buffer.concat([authenticatorData, sha256(params.clientDataJSONBuffer)]);
  const signature = derToRawEcdsaSignature(base64urlDecode(params.signature));
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, signedData);
  if (!ok) throw new Error('Firma WebAuthn inválida.');

  return { signCount };
}
