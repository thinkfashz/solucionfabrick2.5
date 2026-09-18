import type * as Three from "three";

export type FabrickAssetManifest = {
  version: string;
  units: "meters";
  houseUrl: string | null;
  terrainUrl: string | null;
  dracoDecoderPath?: string | null;
  ktx2TranscoderPath?: string | null;
};

export const ARCHITECTURAL_ASSETS: FabrickAssetManifest = {
  version: "2026.09",
  units: "meters",
  // Blender/Gaea exports plug in here when the optimized assets are ready.
  // Keeping these null preserves the fast procedural house as a production fallback.
  houseUrl: null,
  terrainUrl: null,
  dracoDecoderPath: null,
  ktx2TranscoderPath: null,
};

export type LoadedArchitecturalAssets = {
  house: Three.Group | null;
  terrain: Three.Group | null;
  dispose: () => void;
};

function prepareScene(T: typeof import("three"), root: Three.Object3D, mobile: boolean) {
  root.traverse((object) => {
    if (!(object instanceof T.Mesh)) return;
    object.castShadow = !mobile && object.userData.castShadow !== false;
    object.receiveShadow = object.userData.receiveShadow !== false;
    object.frustumCulled = true;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material) continue;
      const standard = material as Three.MeshStandardMaterial;
      if ("roughness" in standard && typeof standard.roughness === "number") {
        standard.roughness = Math.max(.18, Math.min(1, standard.roughness));
      }
      if (standard.map) {
        standard.map.colorSpace = T.SRGBColorSpace;
        standard.map.anisotropy = mobile ? 2 : 8;
      }
      for (const map of [standard.normalMap, standard.roughnessMap, standard.aoMap, standard.metalnessMap]) {
        if (!map) continue;
        map.colorSpace = T.NoColorSpace;
        map.anisotropy = mobile ? 2 : 8;
      }
    }
  });
}

export async function loadOptionalArchitecturalAssets(
  T: typeof import("three"),
  renderer: Three.WebGLRenderer,
  manifest: FabrickAssetManifest = ARCHITECTURAL_ASSETS,
): Promise<LoadedArchitecturalAssets | null> {
  if (!manifest.houseUrl && !manifest.terrainUrl) return null;

  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/libs/meshopt_decoder.module.js"),
  ]);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  let draco: { dispose: () => void } | null = null;
  if (manifest.dracoDecoderPath) {
    const { DRACOLoader } = await import("three/examples/jsm/loaders/DRACOLoader.js");
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(manifest.dracoDecoderPath);
    loader.setDRACOLoader(dracoLoader);
    draco = dracoLoader;
  }

  let ktx2: { dispose: () => void } | null = null;
  if (manifest.ktx2TranscoderPath) {
    const { KTX2Loader } = await import("three/examples/jsm/loaders/KTX2Loader.js");
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath(manifest.ktx2TranscoderPath);
    ktx2Loader.detectSupport(renderer);
    loader.setKTX2Loader(ktx2Loader);
    ktx2 = ktx2Loader;
  }

  const mobile = window.matchMedia("(max-width: 700px), (pointer: coarse)").matches;
  const [houseGltf, terrainGltf] = await Promise.all([
    manifest.houseUrl ? loader.loadAsync(manifest.houseUrl) : Promise.resolve(null),
    manifest.terrainUrl ? loader.loadAsync(manifest.terrainUrl) : Promise.resolve(null),
  ]);

  const house = houseGltf?.scene ?? null;
  const terrain = terrainGltf?.scene ?? null;

  if (house) {
    house.name = "blender-house";
    prepareScene(T, house, mobile);
  }
  if (terrain) {
    terrain.name = "gaea-terrain";
    prepareScene(T, terrain, mobile);
  }

  return {
    house,
    terrain,
    dispose: () => {
      draco?.dispose();
      ktx2?.dispose();
      for (const root of [house, terrain]) {
        root?.traverse((object) => {
          if (!(object instanceof T.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            const standard = material as Three.MeshStandardMaterial;
            for (const map of [standard.map, standard.normalMap, standard.roughnessMap, standard.aoMap, standard.metalnessMap]) map?.dispose();
            material.dispose();
          }
        });
      }
    },
  };
}
