import { base64urlDecode } from './base64url';

export type CborValue = number | string | Buffer | Map<CborValue, CborValue> | CborValue[] | boolean | null;

function readLength(data: Buffer, offset: number, additional: number): { length: number; offset: number } {
  if (additional < 24) return { length: additional, offset };
  if (additional === 24) return { length: data[offset], offset: offset + 1 };
  if (additional === 25) return { length: data.readUInt16BE(offset), offset: offset + 2 };
  if (additional === 26) return { length: data.readUInt32BE(offset), offset: offset + 4 };
  throw new Error('CBOR length no soportado.');
}

export function readCbor(data: Buffer, offset = 0): { value: CborValue; offset: number } {
  const first = data[offset++];
  const major = first >> 5;
  const additional = first & 0x1f;

  if (major === 0) {
    const len = readLength(data, offset, additional);
    return { value: len.length, offset: len.offset };
  }
  if (major === 1) {
    const len = readLength(data, offset, additional);
    return { value: -1 - len.length, offset: len.offset };
  }
  if (major === 2) {
    const len = readLength(data, offset, additional);
    return { value: data.subarray(len.offset, len.offset + len.length), offset: len.offset + len.length };
  }
  if (major === 3) {
    const len = readLength(data, offset, additional);
    return { value: data.subarray(len.offset, len.offset + len.length).toString('utf8'), offset: len.offset + len.length };
  }
  if (major === 4) {
    const len = readLength(data, offset, additional);
    const arr: CborValue[] = [];
    let next = len.offset;
    for (let i = 0; i < len.length; i++) {
      const item = readCbor(data, next);
      arr.push(item.value);
      next = item.offset;
    }
    return { value: arr, offset: next };
  }
  if (major === 5) {
    const len = readLength(data, offset, additional);
    const map = new Map<CborValue, CborValue>();
    let next = len.offset;
    for (let i = 0; i < len.length; i++) {
      const key = readCbor(data, next);
      const value = readCbor(data, key.offset);
      map.set(key.value, value.value);
      next = value.offset;
    }
    return { value: map, offset: next };
  }
  if (major === 7) {
    if (additional === 20) return { value: false, offset };
    if (additional === 21) return { value: true, offset };
    if (additional === 22) return { value: null, offset };
  }
  throw new Error('CBOR no soportado.');
}

export function asCborMap(value: CborValue): Map<CborValue, CborValue> {
  if (!(value instanceof Map)) throw new Error('CBOR esperado como mapa.');
  return value;
}

export function parseAttestationObject(attestationObject: string): Map<CborValue, CborValue> {
  return asCborMap(readCbor(base64urlDecode(attestationObject)).value);
}
