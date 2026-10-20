# Escena del visor 390-1 — inventario completo

Este documento describe **todo** lo que hay dentro de la escena 3D del visor
`/herramientas/proyecto-390-1`, con las coordenadas reales usadas en el código.
Coordenadas: `x` → este (m), `z` → sur (m), `y` → altura (m).

---

## 1. Terreno y exterior

| Elemento | Posición | Medidas / notas |
|---|---|---|
| Césped | centro `[7, −0,02, 7]`, rotado −90° en X | Plano 62 × 46 m con textura real `pastoCalle` |
| Árboles (6) | `[−2,4·6,6]`, `[−2,9·12,4]`, `[22,9·2,2]`, `[22,6·10,2]`, `[16,0·−2,4]`, `[−2,7·−2,2]` | Árboles de 3 niveles de copa; se movieron para dejar libre el quincho |
| Cobertizo del acceso | junto a la fachada sur | Estructura de metalcon + calamina |

## 2. Envolvente de la casa

| Elemento | Medidas |
|---|---|
| Huella de la casa | 14,00 × 11,00 m (x 0,25…13,75; z 0,25…10,75) |
| Altura de muro | 2,70 m |
| Cubierta | Dos aguas, caballete a lo largo de `x` en `z = 5,50`; alero de ~0,40 m |
| Tabiques | Definidos en `WALLS` de `plano390Data.ts` (los tramos de vidrio también bloquean el paso) |
| Puerta de entrada | Fachada sur, en el eje del recibidor (`x ≈ 5,1`) |
| Paño corredizo a terraza | Muro norte de la cocina-comedor (`x 0,25…6,40`) |

## 3. Estancias (`ROOMS`)

| # | Nombre | m² | Rango x | Rango z | Piso |
|---|---|---|---|---|---|
| 1 | Recibidor | 7,17 | 3,62…6,34 | 6,85…10,75 | Porcelanato |
| 2 | Vestidor | 7,53 | 0,25…3,62 | 8,65…10,75 | Madera |
| 3 | Cocina · Comedor | 44,21 | 0,25…8,40 | 0,25…5,55 | Porcelanato |
| 4 | Pasillo | 8,73 | 3,62…11,70 | 5,69…6,85 | Porcelanato |
| 5 | Dormitorio 2 | 14,00 | 6,48…10,30 | 6,99…10,75 | Madera |
| 6 | Dormitorio 3 | 14,00 | 10,44…13,75 | 6,99…10,75 | Madera |
| 7 | Dormitorio principal | 16,00 | 11,09…13,75 | 0,25…5,55 | Madera |
| 8 | Clóset | 3,96 | 11,70…13,75 | 5,69…6,85 | Porcelanato |
| 9 | Baño | 5,32 | 8,54…10,95 | 0,25…2,42 | Porcelanato |
| 10 | Sauna | 5,60 | 8,54…10,95 | 2,56…4,86 | Madera |
| 11 | Terraza | 21,50 | al norte (`z < 0`) | — | Deck de madera |

## 4. Mobiliario por estancia

### Recibidor / estar (3)
| Mueble | Posición | Medidas |
|---|---|---|
| Sofá | `[4,2, ·, 0,55]` bajo la ventana norte | 2,10 × 0,75 m, alto de espalda 0,62 m |
| Alfombra | `[5,7, 0,067, 2,0]` | 2,40 × 1,80 m |
| Mesa de centro | `[4,2, ·, 2,6]` | 1,10 × 0,55 m |
| Comedor (mesa) | `[6,5, 0,78, 3,9]` | 2,00 × 0,90 m |
| Bancas (6) | alrededor de la mesa | Cilindros r 0,20/0,24, h 0,45 m |

### Cocina (3) → detalle en [cocina.md](./cocina.md)

### Dormitorio principal (7)
| Mueble | Posición | Medidas |
|---|---|---|
| Cabecera | `[12,4, 0,90, 5,40]` | 1,90 × 1,20 × 0,12 m |
| Base de cama | `[12,4, 0,19, 4,30]` | 1,80 × 0,26 × 2,05 m |
| Colchón | `[12,4, 0,47, 4,30]` | 1,80 × 0,35 × 2,00 m |
| Manta | `[12,4, 0,68, 4,05]` | 1,80 × 0,08 × 1,30 m |
| Veladores (2) | `[12,0, ·, 5,05]` y `[12,8, ·, 5,05]` | 0,60 × 0,14 × 0,35 m |
| Cómodas (2) | `[11,35, ·, 4,90]` y `[13,45, ·, 4,90]` | 0,45 × 0,50 × 0,45 m |

### Dormitorios 2 y 3 (5 y 6)
Camas de 1,80 × 2,05 m centradas en `x = 8,3` y `x = 12,1`, apoyadas en el muro sur
(`z ≈ 10,62`), con veladores a los costados.

### Baño (9) y Sauna (10)
Lavamanos, inodoro y ducha en el baño; bancas de madera de dos niveles y estufa en
la sauna. Pisos de porcelanato (baño) y madera (sauna).

### Terraza (11)
Deck de madera, pérgola de listones, baranda perimetral y escalerilla de 0,20 m
hacia el jardín. Es el punto de partida natural del tour al mediodía.

## 5. Personajes (NPC)

Definidos en `NPC_SPOTS` (5 figuras). Reutilizan `AnimatedFigure` (maniquí GLB
animado con `index` 0/1) del simulador sísmico:

| # | Zona | Comentario |
|---|---|---|
| 1 | Recibidor | Personaje que recibe al visitante |
| 2 | Cocina-comedor | Frente a la isla |
| 3 | Pasillo | De paso hacia los dormitorios |
| 4 | Terraza | Junto a la pérgola |
| 5 | Quincho | Apoyado en la barra |

## 6. Iluminación

| Tipo | Detalle |
|---|---|
| Entorno | `RoomEnvironment` vía PMREM, `environmentIntensity 0.9` (reflejos HDR) |
| Sol | Direccional con sombras, posición `[7, 17,6, 14,8]`, mapa 2048², `normalBias 0,02` |
| Relleno cenital | Direccional fría sin sombra desde `[4, 8, −14]` |
| Ambiente / hemisférica | Fría de día, azulada de noche |
| Lámparas de techo `LAMPS` (6) | Cocina-comedor `[3,9 · 2,4]`, pasillo `[7,4 · 6,3]`, dorm. 2 `[8,3 · 8,9]`, dorm. 3 `[12,1 · 8,9]`, principal `[12,4 · 2,6]`, baño `[9,6 · 1,3]` |
| Tira LED del pasillo | Losa emisiva `[7,4, 2,665, 6,27]`, 7,60 × 0,09 m — blanco frío de día, cálido de noche |
| LED bajo alacenas | Tiras emisivas cálidas bajo las alacenas de la cocina |
| Luces del quincho `QUINCHO_LIGHTS` (2) | Bajo la barra: `[16,6 · 4,45]` y `[18,2 · 4,45]` |

## 7. Cámaras CCTV / modo Cine (`CCTV_CAMERAS`)

| ID | Nombre | Zona | Posición | Mira a | FOV |
|---|---|---|---|---|---|
| CAM-01 | Sala · cocina-comedor | Sala | `[7,85, 2,40, 0,62]` | `[2,2, 0,9, 3,9]` | 63° |
| CAM-02 | Pasillo · distribución | Pasillo | `[10,95, 2,36, 6,08]` | `[4,3, 1,15, 6,35]` | 58° |
| CAM-03 | Terraza · pérgola | Terraza | `[5,85, 2,32, −2,50]` | `[1,6, 1,0, 0,6]` | 66° |
| CAM-04 | Fachada · acceso principal | Exterior | `[1,30, 3,05, 15,10]` | `[7,0, 1,7, 10,6]` | 52° |
| CAM-05 | Dormitorio principal | Dormitorio | `[13,30, 2,38, 0,90]` | `[11,9, 1,05, 4,7]` | 60° |
| CAM-06 | Quincho · barra y parrilla | Quincho | `[20,40, 2,42, 2,15]` | `[16,5, 1,15, 4,35]` | 64° |

Circuito: 7 s por cámara, transición suave de 1,1 s, balanceo leve de cámara de
seguridad. El HUD muestra `REC`, ID, reloj y contador de cámaras. La cámara
exterior (CAM-04) se monta sobre un poste de 3,05 m.

## 8. Recorrido cinematográfico (`TOUR_STOPS`)

15 paradas, cámara a 1,62 m de altura, avance a 1,25 m/s, pausa de 2,4 s por
parada, mirada suavizada y micro-movimiento de cámara humana:

1. Fachada sur → 2. Acceso principal → 3. Recibidor → 4. Sala de estar →
5. Cocina → 6. Isla de cocina → 7. Terraza → 8. Pasillo → 9. Dormitorio 3 →
10. Dormitorio 2 → 11. Baño y sauna → 12. Dormitorio principal → 13. Quincho →
14. Barra del quincho → 15. Vista aérea.

Cada parada trae `label` y `note`; el HUD los muestra con barras cinematográficas
y puntos de progreso.

## 9. Puntos de foto (`PHOTO_SPOTS`)

Seis puntos guiados con tween de 1,4 s. Al elegir uno, la cámara viaja al punto y
queda mirando el objetivo marcado; el HUD muestra la tarjeta con la cuña de visión.

## 10. Controles

| Entrada | Acción |
|---|---|
| Joystick izquierdo | Caminar / retroceder / lateral |
| Joystick derecho | Girar (X) y mirar arriba-abajo (Y) |
| Arrastrar sobre la escena (dedo o mouse) | Girar la vista directamente |
| `WASD` / flechas | Mover |
| `Q` / `E` | Girar |
| `Shift` | Correr (×1,6) |
| Chips inferiores | Libre · Tour cine · Cine CCTV · puntos de foto |
| Botón `Ficha` | Ficha técnica del proyecto |

Colisiones: AABB eje a eje contra `WALLS` ampliados por el radio del jugador
(0,30 m) más los volúmenes del quincho (muro de piedra, lateral este y barra).
Límites del mundo: x −3,2…22,4 y z −4,8…15,8.
