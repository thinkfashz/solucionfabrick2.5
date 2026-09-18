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
  // Set these at deploy time after the Blender/Gaea assets are uploaded.
  // Null keeps the current procedural scene as an instant fallback.
  houseUrl: process.env.NEXT_PUBLIC_FABRICK_HOUSE_GLB || null,
  terrainUrl: process.env.NEXT_PUBLIC_FABRICK_TERRAIN_GLB || null,
  dracoDecoderPath: process.env.NEXT_PUBLIC_FABRICK_DRACO_PATH || null,
  ktx2TranscoderPath: process.env.NEXT_PUBLIC_FABRICK_KTX2_PATH || null,
};

export type AssetNodeRole =
  | "architecture"
  | "kitchen"
  | "bath"
  | "structure"
  | "electric"
  | "water"
  | "sanitary"
  | "terrain"
  | "light"
  | "unknown";

export type LoadedArchitecturalAssets = {
  house: Three.Group | null;
  terrain: Three.Group | null;
  byRole: Map<AssetNodeRole, Three.Object3D[]>;
  kitchenDoors: Three.Object3D[];
  dispose: () => void;
};

function roleForName(name: string): AssetNodeRole {
  if (name.startsWith("ARCH_")) return "architecture";
  if (name.startsWith("KITCH_")) return "kitchen";
  if (name.startsWith("BATH_")) return "bath";
  if (name.startsWith("STRUCT_")) return "structure";
  if (name.startsWith("MEP_ELEC_")) return "electric";
  if (name.startsWith("MEP_WATER_")) return "water";
  if (name.startsWith("MEP_SAN_")) return "sanitary";
  if (name.startsWith("TERRAIN_")) return "terrain";
  if (name.startsWith("LIGHT_")) return "light";
  return "unknown";
}

function indexScene(root: Three.Object3D | null, byRole: Map<AssetNodeRole, Three.Object3D[]>) {
  const kitchenDoors: Three.Object3D[] = [];
  root?.traverse((object) => {
    const role = roleForName(object.name);
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)!.push(object);
    object.userData.fabrickRole = role;
    if (object.name.startsWith("KITCH_DOOR_")) kitchenDoors.push(object);
  });
  return kitchenDoors;
}

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

  const byRole = new Map<AssetNodeRole, Three.Object3D[]>();
  const kitchenDoors = indexScene(house, byRole);
  indexScene(terrain, byRole);

  return {
    house,
    terrain,
    byRole,
    kitchenDoors,
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
