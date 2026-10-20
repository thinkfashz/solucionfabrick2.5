# STATE — solucionfabrick2.5

Bitácora de trabajo (se actualiza al cierre de cada hito).

## Última sesión — 2026-10-20 (4): corte de planta, códigos y luz de día

### Hecho
- **Causa raíz del desorden en las capturas**: no había solapes de datos. La vista “Plano 3D” mostraba los muros completos de 2,80 m y, a 71°, cada tabique tapaba el ambiente vecino. Se implementó **corte de planta a `PLAN.planCutH = 1,15 m`** con tapa de poché oscura del mismo espesor (0,25 ext / 0,12 int) y offset de 0,8 mm por muro para evitar z-fighting. En planta los muros usan materiales neutros; el limón queda para el 3D.
- **Ocultos en planta**: losa, cielorraso, franja, portal, cornisas, zócalos, muro de TV, downlights, apliques, interruptores, cámaras, lámpara del comedor, alacenas altas, campana y backsplash alto. Roperos y refri se recortan a 1,15 m. Aberturas recortadas al corte (marcos, hojas, dinteles, casing, vidrios; portón como umbral).
- **Capa de anotación**: textura de canvas 1536 px sobre plano de 14,6 × 13,2 m con retícula 1/5 m, nombre, medidas, m², norte y escala. Con `audit` suma códigos `M-xx` (48 muros), `F-xx` (45 muebles) y `P-xx` (11 puertas). Una sola textura/draw call por rendimiento.
- **Auditoría nueva** (`src/lib/plano390Audit.ts`): muros cruzados/duplicados/fuera de envolvente, vanos sin apoyo/tapados/solapados, ambientes superpuestos/contenidos, bordes sin muro, superficie declarada, muebles fuera de ambiente/mueble-muro/mueble-mueble, barrido de puertas y mueble alto ante ventana. Resultado real: **0 errores, 0 avisos, 2 notas válidas** (ensuite en Dorm. 1 y lavandería en Garaje).
- **Falsos positivos corregidos**: alineación por espesor en la normal del vano, span en el eje del vano, jambas por contacto, tolerancia de 12 cm para sillas y exclusión de ducha bajo ventana alta.
- **Luz de día**: exposición 0,78 (planta 0,88), sol 1,38, hemisférica 0,38, entorno 0,62, porcelanato roughness 0,38 / env 0,48. Puntuales de día 0,10–0,20 y apagadas en planta; apliques 0,35 día / 1,1 noche. Se elimina el blanco quemado del centro.
- **Césped procedural** (`makeGrassTexture`): la textura `pastoCalle` era mitad pasto y mitad hormigón. Nueva textura 512² con 11.000 briznas, repeat 16 × 12. En planta se cubre con base neutra `#e8ecdd`.
- **Plano táctil**: órbita 1 dedo, pinza 2 dedos, rueda (radio 7–30 m, pitch 0,35–1,5). Toque < 8 px sobre el piso de un ambiente entra a su escena (`ROOM_SCENE`); no dispara al arrastrar. Escenas nuevas `pasillo` y `distribuidor` (SCENES 18 → 20).
- **UI**: botón “Auditoría del plano”, tarjeta de hallazgos en el panel 2D con resumen y notas válidas, botón “Abrir Plano 3D con códigos”. El SVG no lleva 104 códigos ilegibles; la lectura vive en la capa 3D con pinza.
- **Enlaces**: `?vista=plano&audit=1` (o `codigos=1`), `?vista=plano&manos=0`.
- **Verificación**: `tsc` limpio en 3D/UI/Map2D/Walkthrough/CameraRig/Data/Audit; auditoría 0/0/2; errores 056–061 documentados en `visor-casa-fabrick`; `SKILL.md` y `docs/proyecto-390-1/plano-v2.md` (iteración 7) actualizados.

### Pendiente
- Revisar en producción las capturas de `?vista=plano&audit=1`: legibilidad de códigos con pinza, etiquetas de ambientes y ausencia de brillo. Ajustar tamaño de fuente o radio inicial si hace falta.
- Confirmar que el toque de ambiente no compite con la órbita en pantallas con guantes.

## Sesión — 2026-10-20 (3): geometría del plano v2 y plano elevado táctil

### Hecho
- **Causa raíz del “baño sin muro”**: el ambiente x 9,46…11,20 / z 3,61…5,40 estaba rotulado “Ensuite” pero es el **paso** del comedor al vestíbulo (hueco del tabique x 9,34…9,46 / z 3,80…5,20, `p-vest`). Se convirtió en **Distribuidor** y el baño privado se mudó al noroeste del Dorm. 1 (1,74 × 2,10 m, muro oriente con puerta de 0,70 m, ducha 0,90 × 1,20, vanitorio 0,80 y WC).
- **Camas**: `Bed` acepta `rot`; Dorm. 1 y 2 giran la cabecera al oriente (muro sólido, fuera de la ventana); Dorm. 3 se ancla al muro norte (ya no flota). Veladores, alfombras, clósets, escritorios y `FURNITURE_2D` recolocados. Dorm. 1 queda en 12,19 m² netos + 3,65 m² de ensuite.
- **Lavandería cerrada** de 1,44 × 2,45 m en la esquina SW del garaje (muro oriente, muro norte y puerta de 0,70 m que abre al garaje). Lavadora, secadora, mesón y estante adentro; el auto corrió al oriente.
- **Baño principal** reordenado: ducha al norte, WC al poniente, vanitorio al sur; la puerta abre hacia adentro y no barre el inodoro.
- **Living**: butacas enfrentadas al norte y al sur de la mesa; corredor libre de 1,8 m al muro de TV; consola del muro sur acortada a 0,90 m.
- **Comedor**: respaldos de sillas laterales en Z hacia afuera (±0,75 m) y cabeceras con la rotación corregida.
- **Cielorraso**: solo se excluye el porche; garaje, lavandería y ensuite lo reciben (fin del “techo negro”). Pisos superpuestos con 5 mm de offset.
- **Exterior** a arena cálida `#d8c6a4`; luz extra de cocina sobre la línea de muebles; apliques e interruptores flotantes pegados a su muro; cámaras CCTV fuera de camas/muebles.
- **Plano elevado táctil**: en `planView` el rig orbita alrededor de (7,3 · 0 · 5,5) con arrastre de un dedo (yaw/pitch), pinza de dos dedos y rueda para el radio (7–30 m), conservando el tween de entrada.
- **Tour**: 62 paradas (21 informativas); bordea el auto por el norte para entrar a la lavandería y vuelve por el pasillo oriental.
- **Skills**: errores 048–055 en `visor-casa-fabrick/references/errores.md`; nueva skill hermana `arquitectura-fabrick` (medidas de baño, cocina, dormitorio, estructura Metalcon, paleta y `checklist-geometria.md`).

### Validación
- `esbuild` sobre los 3 archivos tocados: sin errores de sintaxis.
- Auditoría estática (`node` sobre el contrato): vanos calzan con tramos de muro; muebles 2D dentro de su ambiente y sin solapes; ninguna cama bajo ventana; ningún interruptor, aplique o cámara dentro de muro o mueble; **ruta del tour sin choques** con muros ni blockers.
- Sin `node_modules` local: el typecheck real corre en Vercel (`ignoreBuildErrors: false`); el gate es el build.

### Próximo
- Capturas del teléfono: retrato y horizontal; `?vista=plano&manos=0`, `?vista=cocina`, `?vista=baño`, `?vista=quincho`.
- Si el build de Vercel falla, revisar tipos de `Bed`/`Wardrobe` (`rot`) y el array de butacas.
- Pendientes de producto: césped exterior más realista, tocar una habitación del plano para entrar y transiciones de escena.

## Última sesión — 2026-10-20 (2): corrección de 12 capturas + plano 3D + giro horizontal

### Hecho
- **12 capturas verticales revisadas** (03:39–04:41): cámaras pegadas a isla/muebles, FOV de túnel, muros/piso sin contraste, paneles y cojines flotantes, armarios girados, NPC en tour y baño apuntando a una pared.
- **FOV adaptativo**: objetivo horizontal 74° libre / 78° tour convertido a vertical con el aspect, límites 50–94°, recalculado cada frame. `BASE_FOV`/`TOUR_FOV` pasaron a 62/64 solo como arranque.
- **16 paradas del tour recolocadas** con ≥ 0,6 m al mueble y ≥ 0,25 m al muro; isla desde el comedor (z 4,0), cocina desde z 4,05, porche z 14,2, fachada en 3/4, baño desde la esquina SE, pasillo mirando a dormitorio 2. NPC ocultos en tour/CCTV/plano.
- **Muros verde limón**: interior `#c9ef63`, fachada `#c9e77a`; porcelanato blanco, cielo raso blanco, portal de piedra y franja blanca. Plano 2D, leyenda y ficha sincronizados.
- **Mobiliario**: `Desk` con panel de corcho pegado al muro, lámpara, cuaderno y `rot`; `Chair` con patas/respaldo; armarios 2/3 girados −90° contra el muro oriente; dormitorios 1/3 con escritorio al oriente; huellas `FURNITURE_2D` actualizadas; sin cojines flotantes.
- **Cocina**: orden ventana/lavaplatos (x 4,6) → placa/campana (5,7) → horno (6,05) → refri al ras (6,9) → isla/barra; tabla de picar y frutero; se descartó despensa alta que dejaba 0,34 m de paso.
- **Plano 3D elevado**: escena `plano` `[7.3, 16.5, 11.2]` → `[7.3, 0, 5.5]`; `planView` oculta cielo, techo, cielo del porche, downlights (conserva sus luces), CCTV, manos, NPC y joysticks; el rig saltea la caminata para que la cámara no baje a 1,62 m. Botón **Ver 3D** en el panel Plano, chip “Plano 3D” y `?vista=plano`.
- **Táctil**: joysticks 112/104 px con recorrido escalado, cruz direccional y `env(safe-area-inset-bottom)`; `LabJoystick` acepta `size`/`accent`.
- **Onboarding horizontal**: `Plano390RotateHint` anima un teléfono 90°, ofrece fullscreen + orientation lock y “Seguir en vertical”; descarte por sesión, oculto en horizontal y en plano 3D.
- **CCTV**: CAM-07 y CAM-12 separadas de la cara del muro; carcasa de 0,16 m libre.
- **Skill**: errores **026–038** documentados en `references/errores.md` y reglas nuevas en `SKILL.md` (FOV, retiro de cámara, actores, plano 3D, joysticks, orientación).

### Validación
- `esbuild` sobre los 9 archivos tocados: sin errores de sintaxis.
- Sin `node_modules` local: typecheck/lint real corre en Vercel (`ignoreBuildErrors: false`).
- Deploy del commit base `c4e93145`: **Ready** en producción (`https://www.solucionesfabrick.com/herramientas/proyecto-390-1`).
- Ajustes menores de cierre (salir del plano con “Libre” devuelve al living; el aviso de giro se apaga en plano; base neutra bajo el plano para que el césped no se lea rayado) van en el push final; el alias de producción queda con la versión más nueva.

### Próximo
- Validar con capturas del teléfono en retrato y horizontal; revisar plano 3D y hint.
- Si el verde limón exterior resulta demasiado fuerte, volver `matWallExt` a crema y dejar solo interiores lime.
- Pendientes de producto: miniaturas de video en vivo, texturas nuevas de personajes, tour POV de NPC, sonido ambiente y HUD de medición en vivo.

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

### Sesión 5 — plano 2D, panel de cámaras y POV humano (2026-10-19)
- **Plano 2D** (`Plano390Map2D.tsx`): planta vista desde arriba generada con el mismo
  contrato (`ROOMS`, `WALLS`, `OPENINGS`, `FURNITURE_2D`, `CCTV_CAMERAS`). Muros con
  espesor real, ventanas en azul, puertas con hoja y arco de giro, portón punteado,
  mobiliario, cotas 14,60 × 11,00, escala 1 m y norte. Estilo blueprint oscuro.
- **Panel "Plano"** en el header (junto a Ficha), con leyenda, superficies y salto a
  cámara tocando su cono. `FURNITURE_2D` se agregó a `plano390Data.ts`.
- **Panel de cámaras con miniaturas**: en modo Cámaras aparece una tira inferior con
  una tarjeta por cámara (miniplano centrado en la zona + cono). Tocar salta a esa
  cámara (`cine.index` + `cine.jump`). El reloj CCTV subió para no quedar tapado.
- **POV humano**: `FirstPersonHands` (antebrazos, manos y dedos) colgado de la cámara,
  con respiración y balanceo; botón **mano** para mostrar/ocultar. Oculto en CCTV.
- **Puertas automáticas en tour** (`autoDoors`): la hoja abre a < 2,9 m de la cámara.
  El portón del garaje sigue solo con el interruptor global.
- **Terminaciones**: zócalo en los 4 lados de cada ambiente, casing blanco en puertas
  y ventanas, alféizar solo con `sill > 0,2`, backsplash de piedra en cocina, manijas
  de puerta a 1,02 m (antes estaban a 5 cm del piso).
- **Mobiliario**: mesas de luz + lámparas en los 3 dormitorios, cabeceras con arte,
  tríptico en el living, cojines y manta, 2 sillas de cabecera en el comedor, centros
  de mesa y 2 plantas interiores.
- **Cielo real**: `Sky` de drei (día/atardecer) y `Stars` de noche, manteniendo el
  color de fondo como respaldo.
- **Errores nuevos documentados**: 012 (capturas headless con WebGL matan el server),
  013 (manija a 5 cm), 014 (`axis` es la normal del muro).

### Sesión 6 — correcciones visuales del cliente (2026-10-20)
- **Hueco de 6,29 m²** entre cocina y dormitorio 1 (x 7,40…9,34) sin piso ni cielo:
  se agregó el ambiente 13 **Despensa / café** (1,94 × 3,36; 6,51 m²), abierto, con
  mueble de café, repisas, alacena alta y luz de trabajo. El borde con el comedor
  quedó en z 3,61 (antes 3,49, dejaba una franja de 12 cm sin terminar).
- **Zócalos**: `trimRuns()` recorta cada borde contra `WALLS` y descuenta puertas/pasos;
  guardapolvo de 0,14 m + remate, material satinado. Antes se dibujaban los 4 lados
  del ambiente y flotaban en los pasos abiertos, y solo 4 cm se veían sobre el piso.
- **Cocina**: ventana a 1,00 m sobre el lavaplatos (x 4,05…5,05); alacena de 0,50 m a
  la izquierda; peto + paños laterales (no tapan el vano); se eliminó la torre de
  hornos que atravesaba la encimera (horno empotrado); refri al ras del muro.
- **Living**: sofá al oriente (7,75…8,65) para liberar la puerta; consola y arte en el
  muro sur libre (7,85…9,25); sillón, mesa de centro, alfombra, lámpara de pie y
  plantas; se quitó el tríptico sobre el ventanal.
- **LED**: núcleo `MeshBasicMaterial` + halo aditivo; marco de luz del panel de TV,
  tira bajo la barra, luz de despensa, downlight nuevo; noche más contrastada.
- **Materiales**: muro `#e7d8c1`, porcelanato `envMapIntensity 1,45`, exposición 1,00.
- **Controles**: dock de 6 botones de 48 px con etiqueta; escenas de 44 px; luz
  Día/Atardecer/Noche en el header; `?vista=living|cocina|tv|despensa&luz=night&manos=0`.
- **Errores nuevos**: 015–023 en la skill `visor-casa-fabrick`.
- **Pendiente**: validación visual en teléfono (o captura remota); type-check real en
  Vercel; revisar rendimiento con 7 point lights + sombras 2048.
- **Enlace directo corregido**: `?vista=` ahora se pasa como `initialScene` al rig y
  el salto se encola cuando el Canvas ya está montado (antes se perdía por el Suspense;
  `?luz=` sí funcionaba). Documentado como error 024 en la skill.
- **Cámara estable**: `camera`/`gl` del `<Canvas>` pasaron a constantes de módulo.
  Los literales inline hacían que R3F recreara la cámara en cada render y el salto
  de `?vista=` volvía al exterior. Documentado como error 025.
- **Cámara, fix definitivo**: se quitaron `camera` y `gl` del `<Canvas>`; un
  `CameraBootstrap` dentro del Canvas fija posición/lookAt/fov una sola vez. R3F
  reaplicaba la prop `camera` en cada render y devolvía la vista al exterior.

## Iteración 5 — ruta humana y HUD oculto (2026-10-20)

- **HUD**: se eliminó el dock persistente, la tira de escenas, el minimapa y el
  botón gigante de salida. Queda un botón de 40 px que abre un menú plegable
  (modos, luces, puertas, manos, luz, ambientes, plano, ficha y cámaras).
- **Ficha del tour**: tarjeta con miniatura + marcador, desvanecimiento y botón
  para ocultar; el progreso cuenta solo paradas informativas.
- **Tour**: ~47 waypoints `info:false` y 19 paradas; ruta fachada → living →
  comedor/cocina → pasillo → baño → dormitorios → garaje/lavandería → jardín →
  quincho → lateral poniente → aérea. El portón del garaje abre en el tour.
- **Interiores**: TV centrado en z 9,00; cocina con herrajes y cajones; baños con
  vanitorio, mampara, descarga y toallero; recibidor amueblado; lavandería en el
  garaje; quincho con pérgola, parrilla y mesón de piedra.
- **Materiales**: porcelanato cálido `#e7dfd2`, muros `#c8db8a`, exposición 0,92,
  sol 2,45 / atardecer 1,9 / noche 0,2, hemisférica 0,5.
- **Errores nuevos**: 039–047 documentados en `visor-casa-fabrick`.
- **Pendiente**: build de Vercel (gate real), capturas del usuario y confirmar
  el origen del panel CCTV de 12 miniaturas de su captura.
