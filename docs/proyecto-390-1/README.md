# Proyecto №390-1 · Casa 127 m² — carpeta de documentación

Aquí vive **todo** lo que hay que saber del visor 3D de la Casa 390-1: dónde está,
cómo está construido, qué mueble va en qué coordenada y con qué medidas.

- **Visor publicado**: <https://www.solucionesfabrick.com/herramientas/proyecto-390-1>
- **Ruta del código**: `src/app/herramientas/proyecto-390-1/page.tsx`
- **Escena 3D**: `src/components/store/plano390/`
- **Contrato de datos** (medidas y posiciones): `src/lib/plano390Data.ts`

## Índice

| Documento | Qué contiene |
|---|---|
| [escena.md](./escena.md) | Inventario de la escena: estancias, muros, mobiliario, personajes, luces y cámaras, con coordenadas. |
| [cocina.md](./cocina.md) | Cocina completa: medidas de la referencia del cliente y su ubicación exacta en la escena. |
| [quincho.md](./quincho.md) | Quincho cubierto: medidas de la referencia, materiales, parrilla, horno de barro y barra. |
| [cocina.svg](./cocina.svg) | Planta cotada de la cocina (4,50 × 3,50 m). |
| [quincho.svg](./quincho.svg) | Planta y elevación cotadas del quincho (6,00 × 3,20 m). |

## Sistema de coordenadas de la escena

```
x → Este  (0,00 = muro poniente de la casa, 14,00 = muro oriente)
z → Sur   (0,00 = muro norte, 11,00 = muro sur; z negativo = terraza al norte)
y → altura sobre el piso (0,00 = nivel de piso terminado)
```

Alturas de referencia:

| Elemento | Medida |
|---|---|
| Altura de muro (alero) | 2,70 m (`PLAN.wallH`) |
| Altura de ojo de cámara | 1,62 m (`PLAN.eyeH`) |
| Mueble bajo de cocina | 0,90 m (+ 0,05 m de encimera) |
| Alacenas | 0,90 m de alto, arrancan a 1,50 m |
| Isla de cocina | 0,95 m de alto |
| Barra del quincho | 1,05 m de alto |
| Cubierta del quincho | 2,70 m |

## Archivos del visor y responsabilidad de cada uno

| Archivo | Rol |
|---|---|
| `Plano390Walkthrough.tsx` | Página: estado (`stage`, `mode`, `spot`, `light`, `cctvIndex`, `tourIndex`) y configuración del `<Canvas>` (sombras, ACES, píxel ratio). |
| `Plano3903D.tsx` | Escena: terreno, muros, techo, pisos (porcelanato/madera), cocina, quincho, mobiliario, personajes, luces y carcasas CCTV. |
| `Plano390CameraRig.tsx` | Cámara: modo libre (colisiones, sprint, bob), tour cinematográfico a velocidad constante, circuito CCTV con la cámara fuera de la carcasa, spots de foto, salto a escena y consumo del arrastre táctil. |
| `Plano390Controls.tsx` | Overlay DOM: joysticks, botones de salir del tour/Cine y capa de arrastre para mirar. |
| `Plano390UI.tsx` | Intro, HUD, minimapa, overlay CCTV sin viñeta, rótulo del tour con ficha, barra inferior de **Modo** y **Escena**, tarjetas de foto y ficha técnica. |
| `src/lib/plano390Data.ts` | **Fuente única de verdad**: `PLAN`, `ROOMS`, `WALLS`, `PHOTO_SPOTS`, `TOUR_STOPS`, `SCENES`, `NPC_SPOTS`, `CCTV_CAMERAS`, `QUINCHO`. |

## Cómo se edita

1. **Medidas y posiciones** → `src/lib/plano390Data.ts`. Si mueves un muro o un
   ambiente, actualiza también este documento.
2. **Mobiliario** → grupos dentro de `Plano3903D.tsx`, cada bloque comentado con
   su medida (busca por `{/* ── ... */}`).
3. **Recorrido** → array `TOUR_STOPS` (posición + punto de mira + rótulo + ficha corta por parada).
4. **Cámaras** → array `CCTV_CAMERAS` (posición, objetivo, FOV, zona).
5. **Escenas del selector** → array `SCENES` (posición + punto de mira).
5. **Luces** → `LAMPS` y `QUINCHO_LIGHTS` en `Plano3903D.tsx`.

Después de editar: `git push origin main` (Vercel despliega solo) y verificar
`pnpm build` en el deploy.

## Materiales y texturas

| Superficie | Material | Origen |
|---|---|---|
| Piso de áreas comunes (recibidor, cocina-comedor, pasillo, baño) | Porcelanato brillante | Canvas procedural `makePorcelainTexture()` (losas de 1,20 m + vetas suaves), repetido 2×2 por ambiente |
| Piso de dormitorios y sauna | Madera | Foto real `pisoMadera` de los otros visores + PBR `wood-oak` |
| Muro interior | Drywall | Foto real `intDrywall` |
| Muro exterior | Metalcon | Foto real `extMetalcon` |
| Cubierta | Calamina | Foto real `techoCalamina` |
| Muro del quincho | Piedra rústica | Canvas procedural `makeStoneTexture()` |
| Cielo del quincho y muebles de madera | Pino / roble | PBR `wood-pine` / `wood-oak` |
| Encimeras e isla | Cuarzo claro `#f4f2ec` | Material liso, `roughness 0.16` |
| Acero (refri, campana, parrilla) | Acero cepillado | `metalness 0.8–0.9`, `roughness 0.24–0.3` |

## Iluminación

- Entorno PMREM (`RoomEnvironment`) + `environmentIntensity 0.9`: da reflejos
  HDR al porcelanato y al acero.
- Tono ACES Filmic, exposición 1,06.
- Día: sol **frío** `#eef6ff` a 3,1 + relleno cenital norte 0,5 + ambiente
  `#dbe8fa` 0,48 + hemisférica 0,72. Lámparas interiores en blanco frío.
- Atardecer: sol `#ffb46e` 2,2 y lámparas en tono cálido.
- Noche: luna `#93abd8`, lámparas cálidas a 2,8 y quincho a 2,6.
- Sombras: `PCFSoftShadowMap`, mapa 2048², cámara de sombra −18…18 × −20…20.

## Modos del visor

| Modo | Qué hace | Cómo se sale |
|---|---|---|
| **Libre** | Primera persona con colisiones, joysticks, arrastre para mirar y teclado. | — |
| **Tour cine** | Recorrido automático de 17 paradas con rótulo, ficha técnica y puntos de progreso. | Botón «Salir del recorrido guiado» o chips de Modo. |
| **Cámaras** | Circuito de 13 cámaras CCTV cada 7 s con REC, reloj y contador. | Botón «Salir de Cine» o chips de Modo. |

### Tour cinematográfico

El avance es de **velocidad constante real** (`travel / dist`): cada frame la
cámara recorre `1,45 m/s · delta` metros, con multiplicador de hasta ×2,4 en
tramos largos y pausa de 2,2 s por parada. Al entrar hay un corte directo a la
primera parada para no atravesar muros; la mirada se interpola con adelanto y
se suma un micro-movimiento de cámara humana (yaw, pitch y roll mínimos).

### Cámaras CCTV

La cámara virtual se adelanta 0,36 m sobre el eje de mira para salir de la
carcasa 3D; sin ese desfase el lente (a 0,16 m) tapa casi todo el encuadre y se
ve como un círculo negro. El overlay ya no usa viñeta ni scanlines a pantalla
completa: solo marco de esquinas, REC, nombre, reloj y contador.

### Selector de escena

La barra inferior tiene dos filas: **Modo** (Libre · Tour cine · Cámaras) y
**Escena** (once destinos con desplazamiento horizontal). Tocar una escena pone
la cámara en modo libre y viaja con un tween de 1,15 s. Los puntos de foto
(Foto 41, 44, 50 y 58) se movieron al panel **Ficha** para no saturar la barra.
