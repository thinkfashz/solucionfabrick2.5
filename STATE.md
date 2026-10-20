# STATE — solucionfabrick2.5

Bitácora de trabajo (se actualiza al cierre de cada hito).

## Última sesión — 2026-10-20: Plano v2 "Mediterránea 148 m²" + skill del visor

### Hecho
- **Distribución nueva** según la planta capturada (reemplaza los 127 m² con terraza norte y quincho): norte Dorm. 2 · Cocina · Dorm. 1; centro Baño · Pasillo · Comedor · Ensuite · Vestíbulo; sur Dorm. 3 · Living · **Garaje**; **porche centrado**; garaje al oriente. Ver `docs/proyecto-390-1/plano-v2.md`.
- **Fachada mediterránea**: muros crema (estuco procedural), franja/cornisa blanca, portal de piedra de 3,05 m, techo plano, adoquín en la entrada, escalones, setos, árboles y apliques de muro.
- **Interiores v2** (`Plano3903D.tsx` reescrito, ~900 líneas): porcelanato blanco brillante, muro de TV de 3,80 m (panel 2,20 / TV 1,40×0,79 / mueble 2,60), cocina con isla 2,40×1,00 + barra 1,05 y taburetes 0,75, refri 1,85, torre de hornos y alacenas a 1,40, baño (ducha 0,90 / vanitorio 0,80 / espejo 1,00 a 1,40 / inodoro 0,60×0,40), ensuite, tres dormitorios con cama, clóset y escritorio, garaje con auto.
- **Instalaciones**: 17 interruptores/enchufes (1,10 / 0,30-1,20), 6 **apliques** (4 exteriores con luz), **luces on/off** (`lightsOn`) y **puertas/ventanas/portón animados** (`openHouse`) con conmutadores en el HUD.
- **Vegetación animada** (sway con `useFrame`), sombras 2048 del sol del sur y downlights; luces puntuales limitadas (~6) por rendimiento móvil.
- **Tour más rápido**: 2,0 m/s, pausa 1,8 s, **17 paradas** con ficha `meta`; **12 cámaras CCTV** con `CCTV_OFFSET` para no meter el lente en cuadro; selector de escena con 12 destinos.
- **Skill global nueva `visor-casa-fabrick`** (~/.config/opencode/skills/): contrato de datos, orden de construcción, reglas de cámara/tour, `references/medidas.md` (capturas del cliente) y `references/errores.md` (011 errores documentados). Guardada también en EverOS y Supermemory.
- **Docs**: `plano-v2.md` nuevo; `escena.md` y `README.md` con la nota v2; `cocina.md`/`quincho.md` quedan como legado del 127 m².

### Errores corregidos y documentados
`wallSize` invertía el eje; `AnimatedFigure` exige sus props; `require` en cliente; hielos de piso en umbrales (losa base continua); exceso de luces puntuales. Todo en `references/errores.md` (007–011).

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

### Sesión 3 — tour cinematográfico, touch-look, porcelanato, cocina y quincho
- **Tour cinematográfico** (`TOUR_STOPS` de 15 paradas, ahora con cocina, isla, quincho, barra y vista aérea): avance a 1,25 m/s, pausa 2,4 s, mirada con adelanto (lerp 2,2), FOV 49 en tour, micro-movimiento de cámara humana (rotateX/Y/Z) y overlay en el HUD con barras cinematográficas, rótulo por parada y puntos de progreso (`onTour` → `tourIndex`).
- **Touch-look**: capa de arrastre en `Plano390Controls` (funciona con dedo y mouse) que acumula `input.lookDx` (giro) y ajusta `input.pitch`; el rig consume `lookDx` una vez por frame. Hint "Arrastra para mirar · joystick para moverte".
- **Piso porcelanato brillante**: textura procedural `makePorcelainTexture()` (losas 1,20 m + vetas) con `roughness 0.08` y `envMapIntensity 1.7`; recibidor, cocina-comedor, pasillo, clóset y baño en porcelanato; dormitorios en madera real.
- **Luz fría HDR**: sol `#eef6ff` a 3,1, relleno cenital frío, ambiente/hemisférica azuladas, `environmentIntensity 0.9`, sombras 2048 con `normalBias 0.02`; lámparas frías de día y cálidas de noche; tira LED continua en el pasillo.
- **Cocina completa según referencia** (4,50 × 3,50 m): L de muebles bajos 0,90 m + encimera 0,05 m, alacenas 0,90 m desde 1,50 m con LED, refri de acero 1,94 m, torre de doble horno, placa + campana + ducto, lavaplatos, isla 1,80 × 0,90 × 0,95 m con 3 taburetes. El comedor se movió al este y la alfombra se reubicó.
- **Quincho nuevo** (al oriente de la casa, `x 14,90…20,90` · `z 1,90…5,10`): muro de piedra procedural (`makeStoneTexture()`), lateral este, postes negros, cielo de listones + cubierta 2,70 m, mesón 5,60 m con parrilla + campana + ducto, horno de barro en domo, lavaplatos, repisa con plantas, barra de 3,60 × 1,00 × 1,05 m con 5 taburetes de mimbre, 3 colgantes y 2 luces cálidas reales. Colisiones propias y `CAM-06 Quincho` en el circuito.
- **Fix "punto negro" de CCTV**: se eliminó la viñeta `inset 0 0 190px rgba(0,0,0,.85)` que tapaba la vista en móvil; scanlines bajadas a 40 %.
- **Documentación nueva**: `docs/proyecto-390-1/` con `README.md`, `escena.md` (inventario completo con coordenadas), `cocina.md`, `quincho.md`, `cocina.svg` y `quincho.svg` (planos cotados).

### Sesión 4 — tour operativo, cámaras sin "punto negro" y selector de escena
- **Bug del tour**: el rig aplicaba `smooth(step)` sobre un lerp ya diminuto (`step ≈ 0,017`), así que la cámara avanzaba ~0,08 % por frame y nunca llegaba a la parada (el rótulo quedaba clavado en "Fachada sur"). Ahora avanza `travel / dist` con `travel = velocidad · delta` (velocidad constante real), pausa 2,2 s y aceleración ×2,4 en tramos largos. Al entrar al tour hay corte directo a la parada 1.
- **"Punto negro" de CCTV (causa real)**: la cámara virtual estaba en el centro de la carcasa; el cilindro del lente, a 0,16 m delante, subtendía ~49° y tapaba casi toda la pantalla. Se adelanta la cámara **0,36 m** sobre el eje de mira (`CCTV_OFFSET`) y se eliminaron scanlines y viñeta del overlay (solo esquinas, REC, nombre, reloj y contador compacto). El gradiente global bajó a 0,38/0,58.
- **13 cámaras CCTV** (antes 6): se sumaron cocina/isla, deck exterior, baño, sauna, parrilla del quincho, jardín/fachada y dormitorio 2, con FOV y encuadres propios (circuito de 91 s).
- **17 paradas de tour** (antes 15): se agregaron "Detalle de cocina" y "Parrilla del quincho"; cada parada trae `meta` (ficha técnica corta) que el HUD muestra bajo el rótulo. Barras cinematográficas de 3,5 vh (antes 6 vh) para no tapar la vista.
- **Selector de escena** (`SCENES`, 11 destinos) con tween de 1,15 s desde cualquier modo (`input.jump` + `spotTween` con `idx −1`). La barra inferior ahora tiene dos filas: **Modo** (Libre · Tour cine · Cámaras) y **Escena** (scroll horizontal). Los puntos de foto se movieron al panel **Ficha**.
- **Documentación**: `README.md` y `escena.md` actualizados (cámaras, tour, selector, causa del punto negro).

### Pendiente / ideas
- Validar en móvil real: rendimiento con 8 point lights + sombras 2048 (bajar a 1024 si calienta).
- Ideas: sonido ambiente por estancia, exportar captura del modo Cine, banda sonora en el tour.
- housefabrick (`/app/`): NO tocar (olvidado a petición del jugador).
