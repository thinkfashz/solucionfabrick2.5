# Quincho del 390-1 — medidas, materiales y ubicación

Quincho **cubierto** de 6,00 × 3,20 m con muro de piedra al fondo, parrilla,
horno de barro y barra de 3,60 m con cinco taburetes. Se construyó a partir de la
referencia del cliente y quedó **al oriente de la casa**, sobre el jardín
(`x 14,90…20,90` · `z 1,90…5,10`), abierto hacia el poniente y con 5,40 m de
espacio libre al frente.

## 1. Medidas de la referencia

| Concepto | Medida |
|---|---|
| Largo total | 6,00 m |
| Fondo total | 3,20 m |
| Altura total (cubierta) | 2,70 m |
| Altura de cubierta sobre el mesón | 0,90 m útiles bajo el alero |
| Barra: largo | 3,60 m |
| Barra: fondo | 1,00 m |
| Barra: altura | 1,05 m |
| Espacio útil al frente de la barra | 5,40 m |
| Taburetes | 5 |

## 2. Ubicación exacta en la escena

Constante `QUINCHO` de `src/lib/plano390Data.ts`:

| Elemento | Valor |
|---|---|
| `x0, x1` | 14,90 → 20,90 m (6,00 m) |
| `z0, z1` | 1,90 → 5,10 m (3,20 m) |
| `height` | 2,70 m |
| `bar.x0, bar.x1` | 15,60 → 19,20 m (3,60 m) |
| `bar.z0, bar.z1` | 3,95 → 4,95 m (1,00 m) |
| `bar.h` | 1,05 m |
| `stools` | 5 |
| `frontSpaceM` | 5,40 m |

## 3. Partes y mobiliario

| Elemento | Centro | Medidas (x · y · z) | Material |
|---|---|---|---|
| Losa de piso | `[17,9, 0,012, 3,5]` | 6,20 × 0,05 × 3,40 m | Porcelanato brillante |
| Muro de piedra al fondo (norte) | `[17,9, 1,35, 1,90]` | 6,00 × 2,70 × 0,14 m | Piedra rústica procedural |
| Muro lateral este | `[20,90, 1,35, 3,50]` | 0,14 × 2,70 × 3,20 m | Piedra rústica procedural |
| Postes de acero (4) | esquinas interiores | 0,12 × 2,70 × 0,12 m | Acero negro `#161a1c` |
| Cielo de listones | `[17,9, 2,655, 3,50]` | 6,00 × 0,06 × 3,20 m | Pino |
| Vigas (4) | `x 2,35 · 3,20 · 4,05 · 4,90` a `y 2,60` | 0,08 × 0,09 × 3,20 m | Roble |
| Cubierta exterior | `[17,9, 2,75, 3,50]` | 6,25 × 0,12 × 3,45 m | Gris grafito `#2b3034` |
| Mesón de trabajo | `[17,9, 0,45, 2,28]` | 5,60 × 0,90 × 0,60 m | Grafito `#3a3f43` |
| Cubierta del mesón | `[17,9, 0,92, 2,28]` | 5,70 × 0,06 × 0,66 m | Piedra clara `#7b756a` |
| Parrilla | `[18,85, 0,99, 2,28]` | 1,00 × 0,14 × 0,58 m | Acero |
| Rejillas de la parrilla | 6 barras en `x 18,45…19,25` a `y 1,07` | r 0,012, largo 0,50 m | Acero oscuro |
| Campana de la parrilla | `[18,85, 1,78, 2,12]` | 1,25 × 0,42 × 0,55 m | Acero grafito |
| Ducto de la campana | `[18,85, 2,34, 2,12]` | 0,42 × 0,70 × 0,42 m | Acero |
| Horno de barro: base | `[20,20, 0,98, 2,40]` | 1,00 × 0,16 × 0,70 m | Piedra |
| Horno de barro: domo | `[20,20, 1,06, 2,40]` | Semiesfera r 0,50 m | Greda `#8a6a52` |
| Boca del horno | `[20,20, 1,20, 2,90]` | 0,34 × 0,24 × 0,02 m | Interior negro |
| Lavaplatos | `[15,95, 0,955, 2,28]` | 0,55 × 0,02 × 0,40 m | Acero oscuro |
| Grifería | `[15,95, 1,10, 2,10]` | r 0,02, h 0,30 m | Acero |
| Repisa con plantas | `[16,40, 1,55, 2,03]` | 1,20 × 0,05 × 0,24 m | Pino |
| Macetas + follaje (2) | `x 16,10` y `16,70` | r 0,09/0,13 m | Greda + verde |
| LED bajo la repisa | `[17,90, 1,50, 1,99]` | 4,40 × 0,02 × 0,05 m | Emisivo cálido |
| Barra: cuerpo | `[17,40, 0,50, 4,45]` | 3,60 × 1,00 × 1,00 m | Piedra rústica |
| Barra: tapa | `[17,40, 1,075, 4,45]` | 3,80 × 0,05 × 1,10 m | Granito oscuro `#2f3335` |
| Taburetes (5) | `x 15,95 + 0,65·i` (`i` 0…4) a `z 5,42` | Asiento r 0,19 m a 0,73 m; respaldo 0,36 × 0,32 × 0,05 m | Mimbre `#6d5f4e` / `#4a4238` |
| Lámparas colgantes (3) | `x 16,40 · 17,40 · 18,40` a `z 4,45` | Campana cónica + ampolleta emisiva | Acero negro |
| Focos de pared (2) | `x 16,30` y `19,50` a `y 2,05` | r 0,05, h 0,12 m | Emisivos cálidos |

## 4. Iluminación del quincho

| Fuente | Detalle |
|---|---|
| Luces reales `QUINCHO_LIGHTS` (2) | `[16,6 · 4,45]` y `[18,2 · 4,45]` a `y 2,05`; color `#ffd9a0`; intensidad 1,1 (día) / 1,7 (atardecer) / 2,6 (noche); `distance 6` |
| Lámparas colgantes | 3 ampolletas emisivas `emissiveIntensity 2,2` |
| LED de repisa | Tira emisiva cálida bajo la repisa del mesón |
| Focos de pared | 2 focos emisivos sobre el muro de piedra |

## 5. Cámara de seguridad

`CAM-06 · Quincho · barra y parrilla` — zona `Quincho`, montada en la esquina
nororiente de la cubierta (`[20,40, 2,42, 2,15]`), mirando la barra y la parrilla
(`[16,5, 1,15, 4,35]`), FOV 64°.

## 6. Colisiones

El jugador no puede atravesar el muro de piedra, el lateral este ni la barra
(`QUINCHO.bar`). El resto de la cubierta queda transitable, con entrada libre
por el poniente y por el frente sur.

Planta y elevación cotadas: [quincho.svg](./quincho.svg)
