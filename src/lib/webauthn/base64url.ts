export function base64urlEncode(input: ArrayBuffer | Uint8Array | Buffer | string): string {
  const buffer = typeof input === 'string'
    ? Buffer.from(input, 'utf8')
    : Buffer.from(input instanceof ArrayBuffer ? new Uint8Array(input) : input);
  return buffer.toString('base64url');
}

export function base64urlDecode(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function arrayBufferToBase64url(value: ArrayBuffer): string {
  return Buffer.from(new Uint8Array(value)).toString('base64url');
}
