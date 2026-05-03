'use client';

/**
 * designerPersistence — guarda diseños del Ecosistema Bimodal en InsForge.
 *
 * Tabla destino: `projects`. Columnas usadas:
 *   - `id`           uuid (PK)
 *   - `titulo`       text
 *   - `categoria`    text  (fija a 'Diseño Bimodal' para distinguirlos)
 *   - `descripcion`  text  (resumen autogenerado)
 *   - `design_json`  jsonb (array de `ElementoDiseno`)
 *   - `thumbnail_url`/`imagen_url` text
 *   - `updated_at`   timestamptz
 *
 * Estrategia: `saveDesign({id?, titulo, elementos, thumbnail})`:
 *  1. Sube el blob de la miniatura al bucket `project-thumbnails` (si viene).
 *  2. INSERT/UPDATE en `projects`. Si `id` existe ⇒ update; si no ⇒ insert.
 *  3. Devuelve el `id` del proyecto guardado.
 *
 * Llamada desde el editor: tras cualquier cambio significativo
 * (`dirty=true`) hacemos un `debounce` de ~3 s y llamamos a `saveDesign`
 * sin bloquear la UI.
 */

import { insforge } from '@/lib/insforge';
import type { ElementoDiseno } from '@/store/useDesignStore';

const THUMB_BUCKET = 'project-thumbnails';
const PROJECTS_TABLE = 'projects';
const DESIGNER_CATEGORY = 'Diseño Bimodal';

export interface SavedDesign {
  id: string;
  titulo: string;
  thumbnail_url: string | null;
}

interface SaveDesignInput {
  id?: string | null;
  titulo: string;
  elementos: ElementoDiseno[];
  thumbnail?: Blob | null;
}

interface PublicUrlLike {
  data?: { publicUrl?: string };
  publicUrl?: string;
}

function extractPublicUrl(result: unknown): string {
  if (typeof result === 'string') return result;
  const r = result as PublicUrlLike | null | undefined;
  return r?.data?.publicUrl ?? r?.publicUrl ?? '';
}

async function uploadThumbnail(blob: Blob): Promise<string | null> {
  try {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error: uploadError } = await insforge.storage
      .from(THUMB_BUCKET)
      .upload(path, blob);
    if (uploadError) {
      // El bucket puede no existir aún (primer despliegue). En ese caso, el
      // diseño se guarda igual sin miniatura.
      // eslint-disable-next-line no-console
      console.warn('[designerPersistence] thumbnail upload failed:', uploadError);
      return null;
    }
    const url = await insforge.storage.from(THUMB_BUCKET).getPublicUrl(path);
    return extractPublicUrl(url) || null;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[designerPersistence] thumbnail upload exception:', err);
    return null;
  }
}

function describeDesign(elementos: ElementoDiseno[]): string {
  const counts: Record<string, number> = {};
  for (const e of elementos) counts[e.tipo] = (counts[e.tipo] ?? 0) + 1;
  const parts = Object.entries(counts).map(([k, v]) => `${v} ${k}${v === 1 ? '' : 's'}`);
  return parts.length ? `Diseño con ${parts.join(', ')}.` : 'Diseño vacío.';
}

export async function saveDesign(input: SaveDesignInput): Promise<SavedDesign> {
  const { id, titulo, elementos, thumbnail } = input;

  const thumbnailUrl = thumbnail ? await uploadThumbnail(thumbnail) : null;

  const payload: Record<string, unknown> = {
    titulo,
    descripcion: describeDesign(elementos),
    categoria: DESIGNER_CATEGORY,
    design_json: elementos,
    updated_at: new Date().toISOString(),
  };
  if (thumbnailUrl) {
    payload.thumbnail_url = thumbnailUrl;
    payload.imagen_url = thumbnailUrl;
  }

  if (id) {
    const { data, error } = await insforge.database
      .from(PROJECTS_TABLE)
      .update(payload)
      .eq('id', id)
      .select('id, titulo, thumbnail_url');
    if (error) throw new Error(error.message || 'No se pudo actualizar el diseño.');
    const row = Array.isArray(data) ? (data[0] as SavedDesign | undefined) : undefined;
    if (!row) throw new Error('La actualización no devolvió fila.');
    return row;
  }

  const { data, error } = await insforge.database
    .from(PROJECTS_TABLE)
    .insert([payload])
    .select('id, titulo, thumbnail_url');
  if (error) throw new Error(error.message || 'No se pudo guardar el diseño.');
  const row = Array.isArray(data) ? (data[0] as SavedDesign | undefined) : undefined;
  if (!row) throw new Error('La inserción no devolvió fila.');
  return row;
}

/**
 * Captura un PNG del Canvas de R3F. Llamar **dentro** del frame siguiente
 * a un render para evitar que `toBlob` devuelva un canvas en blanco
 * (preserveDrawingBuffer = false por defecto).
 */
export async function captureCanvasThumbnail(
  canvas: HTMLCanvasElement | null | undefined,
): Promise<Blob | null> {
  if (!canvas) return null;
  return new Promise((resolve) => {
    try {
      canvas.toBlob((b) => resolve(b), 'image/png', 0.85);
    } catch {
      resolve(null);
    }
  });
}
