import { base64urlDecode } from './base64url';
import { parseAttestationObject } from './cbor';

export function parseRegistrationAttestation(attestationObject: string): {
  credentialId: string;
  publicKeyCose: string;
  signCount: number;
} {
  const attestation = parseAttestationObject(attestationObject);
  const authData = attestation.get('authData');
  if (!Buffer.isBuffer(authData)) throw new Error('authData no encontrado.');

  const flags = authData[32];
  const hasAttestedCredentialData = (flags & 0x40) !== 0;
  if (!hasAttestedCredentialData) throw new Error('La credencial no incluye datos de registro.');

  const signCount = authData.readUInt32BE(33);
  let offset = 37;
  offset += 16;
  const credentialIdLength = authData.readUInt16BE(offset);
  offset += 2;
  const credentialId = authData.subarray(offset, offset + credentialIdLength);
  offset += credentialIdLength;
  const publicKeyCose = authData.subarray(offset);

  if (credentialId.length === 0) throw new Error('Credential ID vacío.');
  if (publicKeyCose.length === 0) throw new Error('Public key vacía.');

  return {
    credentialId: credentialId.toString('base64url'),
    publicKeyCose: publicKeyCose.toString('base64url'),
    signCount,
  };
}

export function getCredentialIdFromRawId(rawId: string): string {
  const decoded = base64urlDecode(rawId);
  if (decoded.length === 0) throw new Error('rawId inválido.');
  return decoded.toString('base64url');
}
