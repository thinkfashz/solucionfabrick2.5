# STATE — solucionfabrick2.5

Bitácora de trabajo (se actualiza al cierre de cada hito).

## Última sesión — 2026-10-19: Recorrido 3D Proyecto 390-1 (127 m²)

### Hecho
- Nueva página `/herramientas/proyecto-390-1` (metadata + canonical; NO tocar `page.tsx` del lab Metalcon).
- Contrato compartido: `src/lib/plano390Data.ts` (habitaciones 1..11, muros con vanos, PHOTO_SPOTS con cuña, TOUR_STOPS, NPC_SPOTS).
- Trabajo dividido en agentes:
  - `Plano3903D.tsx`: escena (terreno, losas con texturas procedurales, muros+vidrio, techo a dos aguas, pérgola, mobiliario, 2 NPCs `AnimatedFigure`, sol a 50° con sombra 0,84·h, pinos).
  - `Plano390CameraRig.tsx` + `Plano390Controls.tsx`: rig primera persona con colisiones AABB eje a eje, modo tour guiado (TOUR_STOPS) y tween a spots de foto; joysticks reutilizando `MetalconLabJoystick` vía módulo mutable `input`.
  - `Plano390UI.tsx`: intro estilo videojuego (negro + dorado #F6C64A), HUD, minimapa SVG, chips de foto y tarjeta con cuña de dirección.
  - `Plano390Walkthrough.tsx` (padre) une todo; selector Día/Atardecer/Noche.

### Fixes de build aplicados (React 19 strict)
- `JSX.Element` → `ReactElement` (namespace JSX global no existe en React 19).
- `ReactElement | null` (el componente devuelve `null` en `stage==='ready'`).
- Literal `{...}[step]` de comma-operator en JSX → array `[...][step]`.
- Import de `AnimatedFigure` es **named**: `{ AnimatedFigure } from '../monitoring/AnimatedFigure'`.

### Estado del deploy
- Deploy **Ready** en producción (`https://www.solucionesfabrick.com/herramientas/proyecto-390-1`).

### Sesión 2 — mejoras HD + CCTV
- **Texturas reales de los visores** en `Plano3903D`: `useViewerTextures` (`/flow/fabrick-tex-*`), PBR oak/pine (`/materials/wood-*`), césped `pastoCalle`; cerámica queda procedural. Cielorraso interior + puerta de entrada + marco de vidrio con reflejos.
- **Iluminación**: `RoomEnvironment` + PMREM (entorno de estudio), ACES Filmic + PCFSoft en el Canvas, sol con sombras y bias, 6 lámparas interiores cálidas con emisivo, hemisférica y fondo/fog por hora (día/atardecer/noche).
- **Controles**: suavizado de aceleración/giro, pitch (mirar arriba/abajo) con joystick derecho, sprint con Shift, bobbing sutil, colisiones AABB iguales.
- **CCTV / Cine**: `CCTV_CAMERAS` (Sala, Pasillo, Terraza, Fachada exterior, Dormitorio) con carcasas visibles (carcasa+lente+LED, poste en exterior), modo `cctv` en el rig con corte suave 1,1 s, sway y FOV propio; cada 7 s cambia y se puede saltar con "Siguiente cámara". HUD con scanlines, REC, reloj, contador y cámaras en el minimapa.
- **Fixes UI**: link `/herramientas` (typo), colores SVG, chips de foto con estilo real, `ReactElement | null`.

### Pendiente / ideas
- Validar en móvil real: rendimiento con 6 point lights + sombras 2048 (bajar a 1024 si calienta).
- Ideas: sonido ambiente por estancia, más cámaras (baño/sauna), exportar captura del modo Cine.
- housefabrick (`/app/`): NO tocar (olvidado a petición del jugador).
