'use client';

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type MeshStandardMaterialParameters,
} from 'three';

/**
 * Texturas del visor sísmico (public/flow).
 *
 * Carga tolerante a fallos: si una imagen responde 404 (o no decodifica) esa
 * textura queda `null` y los materiales que la usan degradan a su color plano
 * original. Nunca lanza hacia React (drei `useTexture`/`useLoader` sí lanza y
 * tumbaría el `Canvas`, así que usamos `TextureLoader` directo con `onError`).
 */
export const VIEWER_TEXTURE_PATHS = {
  extMetalcon: '/flow/fabrick-tex-ext-metalcon.jpeg',
  extMadera: '/flow/fabrick-tex-ext-madera.jpeg',
  intDrywall: '/flow/fabrick-tex-int-drywall.jpeg',
  pisoMadera: '/flow/fabrick-tex-piso-madera.jpeg',
  techoCalamina: '/flow/fabrick-tex-techo-calamina.jpeg',
  pastoCalle: '/flow/fabrick-tex-pasto-calle.jpeg',
  // PBR sets (threejs-materials wood_src)
  woodOakColor: '/materials/wood-oak/color.png',
  woodOakNormal: '/materials/wood-oak/normal.png',
  woodOakRoughness: '/materials/wood-oak/roughness.png',
  woodPineColor: '/materials/wood-pine/color.png',
  woodPineNormal: '/materials/wood-pine/normal.png',
  woodPineRoughness: '/materials/wood-pine/roughness.png',
  woodOsbColor: '/materials/wood-osb/color.png',
  woodOsbNormal: '/materials/wood-osb/normal.png',
  woodOsbRoughness: '/materials/wood-osb/roughness.png',
} as const;

export type ViewerTextureName = keyof typeof VIEWER_TEXTURE_PATHS;
export type ViewerTextures = Record<ViewerTextureName, Texture | null>;

// PBR map groups
export type PbrSetName = 'woodOak' | 'woodPine' | 'woodOsb';
export interface PbrMaps {
  color: Texture | null;
  normal: Texture | null;
  roughness: Texture | null;
}

/**
 * Repeticiones moderadas: las imágenes NO son tileables perfectas, por lo que
 * se evita un repeat alto en piezas pequeñas (el seam se ve menos con repeats
 * cortos + RepeatWrapping).
 */
const REPEATS: Record<ViewerTextureName, readonly [number, number]> = {
  extMetalcon: [2, 1],
  extMadera: [2, 1],
  intDrywall: [2, 1],
  pisoMadera: [2, 2],
  techoCalamina: [3, 2],
  pastoCalle: [6, 5],
  woodOakColor: [2, 2],
  woodOakNormal: [2, 2],
  woodOakRoughness: [2, 2],
  woodPineColor: [2, 1],
  woodPineNormal: [2, 1],
  woodPineRoughness: [2, 1],
  woodOsbColor: [2, 2],
  woodOsbNormal: [2, 2],
  woodOsbRoughness: [2, 2],
};

const ALBEDO_NAMES = ['extMetalcon', 'extMadera', 'intDrywall', 'pisoMadera', 'techoCalamina', 'pastoCalle'] as const satisfies ViewerTextureName[];
const PBR_COLOR_NAMES = ['woodOakColor', 'woodPineColor', 'woodOsbColor'] as const satisfies ViewerTextureName[];
const PBR_NORMAL_NAMES = ['woodOakNormal', 'woodPineNormal', 'woodOsbNormal'] as const satisfies ViewerTextureName[];
const PBR_ROUGHNESS_NAMES = ['woodOakRoughness', 'woodPineRoughness', 'woodOsbRoughness'] as const satisfies ViewerTextureName[];
const NAMES = Object.keys(VIEWER_TEXTURE_PATHS) as ViewerTextureName[];

const EMPTY: ViewerTextures = NAMES.reduce((acc, name) => {
  acc[name] = null;
  return acc;
}, {} as ViewerTextures);

const loader = new TextureLoader();
let loaded: ViewerTextures = { ...EMPTY };
let pending: Promise<void> | null = null;
const listeners = new Set<(textures: ViewerTextures) => void>();

function loadTexture(name: ViewerTextureName): Promise<void> {
  return new Promise<void>((resolve) => {
    const url = VIEWER_TEXTURE_PATHS[name];
    const isAlbedo = ALBEDO_NAMES.includes(name as any) || PBR_COLOR_NAMES.includes(name as any);
    const isNormal = PBR_NORMAL_NAMES.includes(name as any);
    const isRoughness = PBR_ROUGHNESS_NAMES.includes(name as any);
    loader.load(
      url,
      (texture) => {
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        if (isAlbedo) {
          texture.colorSpace = SRGBColorSpace;
          texture.anisotropy = 8;
        } else {
          // normal/roughness: linear color space, no anisotropy
          texture.colorSpace = SRGBColorSpace; // three.js expects normal/roughness in linear but we don't have LinearSRGBColorSpace easily; keep as-is
        }
        const [repeatX, repeatY] = REPEATS[name];
        texture.repeat.set(repeatX, repeatY);
        texture.needsUpdate = true;
        loaded = { ...loaded, [name]: texture };
        resolve();
      },
      undefined,
      () => {
        console.warn(`[viewer-textures] No se pudo cargar ${name} (${url}); se usa fallback.`);
        resolve();
      },
    );
  });
}

function ensureLoaded(): Promise<void> {
  if (!pending) {
    pending = Promise.all(NAMES.map(loadTexture)).then(() => {
      const snapshot = loaded;
      listeners.forEach((listener) => listener(snapshot));
    });
  }
  return pending;
}

/** Devuelve los 3 maps de un set PBR (color/normal/roughness) con fallback null. */
export function usePbrMaps(set: PbrSetName): PbrMaps {
  const textures = useViewerTextures();
  const base = set === 'woodOak' ? 'woodOak' : set === 'woodPine' ? 'woodPine' : 'woodOsb';
  return {
    color: textures[`${base}Color` as ViewerTextureName] ?? null,
    normal: textures[`${base}Normal` as ViewerTextureName] ?? null,
    roughness: textures[`${base}Roughness` as ViewerTextureName] ?? null,
  };
}
export function useViewerTextures(): ViewerTextures {
  const [textures, setTextures] = useState<ViewerTextures>(() => loaded);
  useEffect(() => {
    listeners.add(setTextures);
    void ensureLoaded().then(() => setTextures(loaded));
    return () => {
      listeners.delete(setTextures);
    };
  }, []);
  return textures;
}

const variants = new Map<string, Texture>();

/**
 * Variante de una textura con repeat propio (mismo `source`, sin recarga de
 * imagen). Devuelve `null` mientras la base no esté cargada.
 */
export function viewerTextureVariant(name: ViewerTextureName, repeatX: number, repeatY: number): Texture | null {
  const base = loaded[name];
  if (!base) return null;
  const key = `${name}|${repeatX}|${repeatY}`;
  const cached = variants.get(key);
  if (cached) return cached;
  const clone = base.clone();
  clone.wrapS = RepeatWrapping;
  clone.wrapT = RepeatWrapping;
  clone.colorSpace = SRGBColorSpace;
  clone.repeat.set(repeatX, repeatY);
  clone.needsUpdate = true;
  variants.set(key, clone);
  return clone;
}

/**
 * Material compartido: se crea UNA vez y se reutiliza en todos los meshes
 * repetidos (listones, planchas, segmentos de muro).
 *
 * - `map` llega asíncrono: al resolver (o si falla → null) se reasigna con
 *   `needsUpdate` para recompilar el shader.
 * - `color`/`roughness`/`metalness`/`envMapIntensity` se re-sincronizan si
 *   cambian (p. ej. daño en rojo o fallback a color plano).
 * - `opacity` (si se pasa) maneja `transparent` + `depthWrite` como el código
 *   original: opaco al 100 %, transparente por debajo.
 * - `normalMap` y `roughnessMap` se sincronizan igual.
 */
export interface UseTextureMaterialParams extends MeshStandardMaterialParameters {
  normalMap?: Texture | null | undefined;
  roughnessMap?: Texture | null | undefined;
}

export function useTextureMaterial(
  map: Texture | null | undefined,
  params: UseTextureMaterialParams,
  opacity?: number,
): MeshStandardMaterial {
  const material = useMemo(() => new MeshStandardMaterial({ ...params, map: map ?? null }), []);
  const { color, roughness, metalness, envMapIntensity, normalMap, roughnessMap } = params;

  useLayoutEffect(() => {
    if (color != null) material.color.set(color);
  }, [material, color]);

  useLayoutEffect(() => {
    if (roughness != null) material.roughness = roughness;
  }, [material, roughness]);

  useLayoutEffect(() => {
    if (metalness != null) material.metalness = metalness;
  }, [material, metalness]);

  useLayoutEffect(() => {
    if (envMapIntensity != null) material.envMapIntensity = envMapIntensity;
  }, [material, envMapIntensity]);

  useLayoutEffect(() => {
    const next = map ?? null;
    if (material.map !== next) {
      material.map = next;
      material.needsUpdate = true;
    }
  }, [material, map]);

  useLayoutEffect(() => {
    const next = normalMap ?? null;
    if (material.normalMap !== next) {
      material.normalMap = next;
      material.needsUpdate = true;
    }
  }, [material, normalMap]);

  useLayoutEffect(() => {
    const next = roughnessMap ?? null;
    if (material.roughnessMap !== next) {
      material.roughnessMap = next;
      material.needsUpdate = true;
    }
  }, [material, roughnessMap]);

  useLayoutEffect(() => {
    if (opacity === undefined) return;
    material.opacity = opacity;
    material.transparent = opacity < 0.99;
    material.depthWrite = opacity >= 0.96;
  }, [material, opacity]);

  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  return material;
}
