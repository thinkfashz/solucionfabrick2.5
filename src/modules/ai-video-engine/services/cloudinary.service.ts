import 'server-only';

import crypto from 'node:crypto';
import { getCloudinaryCredentials } from '@/lib/cloudinaryCredentials';
import type {
  CloudinarySceneUploadInput,
  CloudinarySceneUploadResult,
} from '../types/video-engine.types';

function createSignature(params: Record<string, string | number>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${payload}${secret}`).digest('hex');
}

export async function uploadSceneToCloudinary(
  input: CloudinarySceneUploadInput,
): Promise<CloudinarySceneUploadResult> {
  const creds = await getCloudinaryCredentials({ preferDb: true });

  if (!creds.ready) {
    throw new Error(`Cloudinary no esta configurado. Faltan: ${creds.missing.join(', ')}`);
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'soluciones-fabrick/ai-video-engine';
  const safeTitle = input.videoTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'video';
  const publicId = `${folder}/${safeTitle}-scene-${input.sceneId}`;
  const params = { folder, public_id: publicId, timestamp };
  const signature = createSignature(params, creds.apiSecret);

  const formData = new FormData();
  formData.append('file', input.dataUrl);
  formData.append('api_key', creds.apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('public_id', publicId);
  formData.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Cloudinary error ${response.status}: ${detail.slice(0, 240)}`);
  }

  const data = (await response.json()) as { secure_url?: string; public_id?: string };
  if (!data.secure_url) throw new Error('Cloudinary no devolvio una URL valida.');

  return { url: data.secure_url, publicId: data.public_id };
}
