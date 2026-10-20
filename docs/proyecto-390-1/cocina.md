# Cocina del 390-1 — medidas y ubicación

La cocina se reconstruyó a partir de la referencia del cliente: **4,50 × 3,50 m**
en L, con isla de 1,80 × 0,90 m y alacenas altas. Está dentro del ambiente
«Cocina · Comedor» (44,21 m²), en su esquina **poniente-sur**, dejando el comedor
y el estar hacia el oriente y el norte.

## 1. Medidas de la referencia

| Concepto | Medida |
|---|---|
| Superficie de la cocina | 4,50 × 3,50 m |
| Altura de cielo | 2,60 m (en el visor: 2,70 m de muro) |
| Muebles bajos (altura) | 0,90 m |
| Encimera | 0,05 m de espesor, 0,60 m de profundidad (+0,02 de voladizo) |
| Alacenas (altura) | 0,90 m |
| Alacenas (arranque) | 1,50 m desde el piso |
| Isla | 1,80 × 0,90 m |
| Altura de isla | 0,95 m |
| Ancho de paso de trabajo | 1,20 m |
| Ancho de paso en isla | 1,00 m |

## 2. Ubicación exacta en la escena

Coordenadas: `x` → este, `z` → sur, `y` → altura.

### Muebles bajos y encimera

| Elemento | Centro | Medidas (x · y · z) | Rango |
|---|---|---|---|
| Muebles bajos ala oeste | `[0,55, 0,45, 3,35]` | 0,60 × 0,90 × 3,00 m | x 0,25…0,85 · z 1,85…4,85 |
| Encimera ala oeste | `[0,575, 0,93, 3,35]` | 0,72 × 0,05 × 3,12 m | — |
| Muebles bajos ala sur | `[2,40, 0,45, 5,25]` | 3,10 × 0,90 × 0,60 m | x 0,85…3,95 · z 4,95…5,55 |
| Encimera ala sur | `[2,40, 0,93, 5,22]` | 3,20 × 0,05 × 0,68 m | — |

### Alacenas

| Elemento | Centro | Medidas | Rango |
|---|---|---|---|
| Alacena oeste | `[0,43, 1,95, 3,20]` | 0,36 × 0,90 × 2,60 m | y 1,50…2,40 · z 1,90…4,50 |
| Alacena sur | `[2,65, 1,95, 5,37]` | 2,50 × 0,90 × 0,36 m | y 1,50…2,40 · x 1,40…3,90 |
| Tira LED oeste | `[0,62, 1,475, 3,20]` | 0,05 × 0,02 × 2,50 m | Emisiva cálida |
| Tira LED sur | `[2,65, 1,475, 5,18]` | 2,40 × 0,02 × 0,05 m | Emisiva cálida |

### Electrodomésticos

| Elemento | Centro | Medidas | Notas |
|---|---|---|---|
| Refrigerador doble puerta | `[0,58, 0,97, 0,80]` | 0,66 × 1,94 × 0,70 m | Acero cepillado, con junta y manillas |
| Torre de hornos | `[0,58, 1,10, 1,50]` | 0,66 × 2,20 × 0,70 m | Madera roble + 2 hornos de vidrio negro |
| Manillas de hornos | `[0,955, 1,22 / 1,70, 1,50]` | 0,03 × 0,03 × 0,44 m | Acero |
| Placa de cocción | `[0,58, 0,965, 2,85]` | 0,52 × 0,02 × 0,75 m | Vidrio negro |
| Campana | `[0,58, 1,80, 2,85]` | 0,52 × 0,14 × 0,82 m | Acero |
| Ducto de extracción | `[0,50, 2,22, 2,85]` | 0,30 × 0,72 × 0,30 m | Sube al cielo |
| Lavaplatos del mesón | `[2,70, 0,962, 5,18]` | 0,55 × 0,015 × 0,42 m | Acero oscuro + grifería de 0,30 m |

### Isla (1,80 × 0,90 m · alto 0,95 m)

| Elemento | Centro | Medidas |
|---|---|---|
| Cuerpo en madera de pino | `[3,00, 0,46, 3,20]` | 0,90 × 0,92 × 1,80 m |
| Encimera de cuarzo | `[3,00, 0,955, 3,20]` | 1,02 × 0,06 × 1,90 m |
| Lavaplatos de isla | `[3,00, 0,99, 3,00]` | 0,38 × 0,012 × 0,50 m |
| Grifería de isla | `[3,00, 1,12, 3,30]` | Cilindro r 0,02, h 0,28 m |
| Taburetes (3) | `[3,66, ·, 2,60 / 3,20 / 3,80]` | Asiento r 0,19 m a 0,72 m; respaldo 0,05 × 0,35 × 0,36 m |

## 3. Cómo se ve en la escena

| Zona | Medidas finales | Verificación |
|---|---|---|
| Área de trabajo en L | 3,00 m (lado oeste) + 3,10 m (lado sur) | Esquinas y paso libre de 1,20 m frente a la isla |
| Isla centrada en el área | `x 2,55…3,45` · `z 2,30…4,10` | Deja 1,00 m de paso hacia el comedor |
| Comedor movido al este | mesa en `[6,50, 0,78, 3,90]` | Libera la cocina y mantiene el estar junto a la ventana norte |

## 4. Acabados

| Superficie | Acabado |
|---|---|
| Muebles bajos | Madera de roble (PBR `wood-oak`) |
| Alacenas | Blanco hueso `#f1efe8`, `roughness 0.55` |
| Encimeras e isla | Cuarzo claro `#f4f2ec`, `roughness 0.16`, `envMapIntensity 1.2` |
| Isla (cuerpo) | Madera de pino (PBR `wood-pine`) |
| Vidrios de hornos y placa | Negro `#111518` / `#101315`, `roughness 0.10–0.12` |
| Piso | Porcelanato brillante de losa grande (1,20 m) |
| Iluminación | LED cálido bajo alacenas + luz fría del ambiente |

Planta cotada: [cocina.svg](./cocina.svg)
