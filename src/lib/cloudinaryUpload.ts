import 'server-only';

import crypto from 'node:crypto';
import { getCloudinaryCredentials } from '@/lib/cloudinaryCredentials';

function createSignature(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${payload}${secret}`).digest('hex');
}

export async function uploadDataUrlToCloudinary(params: {
  dataUrl: string;
  folder: string;
  publicId: string;
}): Promise<{ ready: true; url: string; publicId?: string } | { ready: false; error: string }> {
  const creds = await getCloudinaryCredentials({ preferDb: true });
  if (!creds.ready) return { ready: false, error: `Cloudinary no configurado: ${creds.missing.join(', ')}` };

  const timestamp = Math.round(Date.now() / 1000);
  const signatureParams = { folder: params.folder, public_id: params.publicId, timestamp };
  const signature = createSignature(signatureParams, creds.apiSecret);

  const formData = new FormData();
  formData.append('file', params.dataUrl);
  formData.append('api_key', creds.apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', params.folder);
  formData.append('public_id', params.publicId);
  formData.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return { ready: false, error: `Cloudinary ${response.status}: ${detail.slice(0, 240)}` };
  }

  const data = (await response.json()) as { secure_url?: string; public_id?: string };
  if (!data.secure_url) return { ready: false, error: 'Cloudinary no devolvió URL.' };
  return { ready: true, url: data.secure_url, publicId: data.public_id };
}

export function safePublicId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'asset';
}
