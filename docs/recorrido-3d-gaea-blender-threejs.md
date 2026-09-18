# Recorrido 3D — pipeline Gaea → Blender → Three.js

## Objetivo

El visor usa un modelo procedural como fallback inmediato. El pipeline final sustituye progresivamente ese fallback por assets optimizados exportados desde Gaea y Blender sin cambiar la lógica de cámaras, capas, sismo ni UI.

## 1. Gaea: terreno y máscaras

Exportar, como mínimo:

- `terrain_height.exr` o TIFF 32-bit para desplazamiento maestro.
- `terrain_albedo.png` o TIFF 8/16-bit.
- `terrain_normal.png` con orientación compatible con el flujo de Blender/Three.js.
- `terrain_splat.png` para mezcla césped / tierra / gravilla.
- `terrain_ao.png`.
- máscaras auxiliares de slope/flow cuando se necesite dispersión de vegetación.

Gaea documenta heightfields de alta precisión, color maps, masks, normal maps, splat maps y AO como salidas estándar. Para preservar relieve, normalizar el heightfield antes de exportarlo y conservar el maestro en 32-bit.

Referencias:
- https://docs.gaea.app/using/getting-started/basics/exporting-elements.html
- https://docs.gaea.app/using/using-gaea/build-and-export/
- https://docs.gaea.app/guides/scenarios/helpful-info/normalized-output.html

## 2. Blender: escena maestra

Unidades: metros.

Colecciones recomendadas:

- `ARCH`: muros, cielos, pisos, puertas, ventanas.
- `KITCH`: cocina y herrajes animables.
- `BATH`: sanitarios y mobiliario de baños.
- `STRUCT`: Metalcon, OSB, cerchas y elementos estructurales.
- `MEP_ELECTRIC`: tablero, conductos y puntos.
- `MEP_WATER`: agua fría/caliente.
- `MEP_SANITARY`: evacuación sanitaria.
- `TERRAIN`: terreno Gaea, senderos y base paisajística.
- `LIGHTS`: puntos de luz que se quieran exportar como `KHR_lights_punctual`.

Prefijos de objetos:

- `ARCH_WALL_*`
- `ARCH_FLOOR_*`
- `ARCH_WINDOW_*`
- `ARCH_DOOR_*`
- `KITCH_BASE_*`
- `KITCH_WALL_*`
- `KITCH_DOOR_*`
- `KITCH_DRAWER_*`
- `KITCH_APPLIANCE_*`
- `STRUCT_METALCON_*`
- `STRUCT_OSB_*`
- `STRUCT_ROOF_*`
- `MEP_ELEC_*`
- `MEP_WATER_COLD_*`
- `MEP_WATER_HOT_*`
- `MEP_SAN_*`

Las puertas y cajones animables deben tener su origen/pivote colocado en la bisagra o guía real antes de exportar.

## 3. Materiales

Cada material PBR debe trabajar con:

- BaseColor: sRGB.
- Normal GL: lineal / NoColorSpace.
- Roughness: lineal / NoColorSpace.
- AO: lineal / NoColorSpace.
- Metallic: lineal / NoColorSpace cuando aplique.

Evitar displacement en runtime móvil salvo terreno o casos puntuales. Para arquitectura, priorizar normal maps y geometría real en siluetas importantes.

Resolución objetivo:

- móvil: 512–1024 px por material visible;
- escritorio: 1024–2048 px;
- 4K solo para assets hero o baking offline, no como descarga inicial del visor.

## 4. Export GLB

Blender glTF 2.0 soporta, entre otras extensiones, Draco, luces puntuales, transmisión, clearcoat, emissive strength, texture transform e instancing GPU. Conservar propiedades personalizadas cuando se usen como metadata de capas.

Referencia:
- https://docs.blender.org/manual/en/4.5/addons/import_export/scene_gltf2.html

Primera entrega recomendada:

```
public/3d/fabrick/
  house/
    fabrick-house-v1.glb
  terrain/
    fabrick-terrain-v1.glb
  basis/
  draco/
```

## 5. Three.js

El punto de entrada está en:

`src/app/recorrido-3d/architectural-assets.ts`

Cuando los assets estén listos:

1. subir GLB/terreno a Cloudinary o `public/3d/fabrick/`;
2. asignar `houseUrl` y `terrainUrl` en `ARCHITECTURAL_ASSETS`;
3. habilitar decoder/transcoder local cuando el asset realmente use Draco/KTX2;
4. mantener el modelo procedural como fallback de compatibilidad;
5. mover la selección de capas desde índices procedurales a nombres/custom properties del GLB.

## 6. Performance floor

- movimiento táctil y cámara: nunca `setState` por frame;
- texturas secundarias: carga diferida;
- sombras dinámicas: escritorio solamente, salvo necesidad concreta;
- vegetación: instancing/LOD;
- interiores: preferir lightmaps/baked AO cuando el modelo Blender esté estabilizado;
- usar transform/opacity para HUD y paneles;
- probar en Vivo V50 Lite además de escritorio antes de merge.


## 7. Exportación reproducible desde Blender

El repositorio incluye:

`scripts/blender/export_fabrick_glb.py`

Ejemplo:

```bash
blender fabrick-house.blend --background --python scripts/blender/export_fabrick_glb.py -- --output //public/3d/fabrick/house/fabrick-house-v1.glb
```

El script:

- fuerza unidades métricas;
- valida las colecciones arquitectónicas/técnicas;
- verifica los prefijos de objetos;
- aplica rotación/escala en mallas estáticas;
- conserva pivotes de puertas/cajones animables;
- exporta custom properties como glTF extras;
- exporta luces/cámaras/animaciones cuando existen;
- genera un `.report.json` con conteos y advertencias.

Usa `--strict` cuando la escena ya esté estabilizada para bloquear exportaciones con colecciones o nombres inválidos.

No se habilita compresión agresiva de forma ciega: primero se valida el GLB base, después se activa Meshopt/gltfpack/KTX2 en una segunda etapa cuando el decoder/transcoder esté servido por la aplicación.
