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
- Se subieron fixes hasta `dd03e82e`; esperando build de Vercel (proyecto `solucionfabrick`, team `think-fastzs-projects`).

### Pendiente / ideas
- Verificar producción `https://www.solucionesfabrick.com/herramientas/proyecto-390-1`.
- Iterar si el jugador pide: más muebles, mejor colisión en puerta principal, sonidos, video de intro.
- housefabrick (`/app/`): NO tocar (olvidado a petición del jugador).
