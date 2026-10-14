// Escala MMI (Mercalli Modificada) con etiquetas en español y tabla determinística
// MMI → parámetros físicos del escenario sísmico (SeismicConfig).
//
// Tabla MMI→parámetros:
// La magnitud de cada nivel se calibró invirtiendo la fórmula de `seismicScenario`
// (base 2.3 + (Mw-4)*1.48 + (2.8 - log10(hipo+12)*2.05) + ajuste_de_suelo) para que
// el MMI resultante quede cerca del nivel elegido con los hipo/distancias indicados.
// XI y XII quedan saturados por el tope Mw 9.5 del slider (el MMI calculado ronda 11.0–11.4).
// Dirección (directionDeg) no se deriva: se mantiene como libre elección del usuario.
//   MMI | Mw  | prof. | dist. | dur. | suelo | freq (Hz)
//    I  | 5.1 |  120  |  250  |   5  | roca  |   1.2
//    II | 5.7 |   90  |  200  |   7  | roca  |   1.4
//   III | 6.2 |   70  |  150  |   9  | roca  |   1.6
//    IV | 6.2 |   55  |  110  |  11  | firme |   1.8
//    V  | 6.7 |   45  |   80  |  14  | firme |   2.0
//    VI | 7.2 |   35  |   55  |  17  | firme |   2.2
//   VII | 7.7 |   28  |   40  |  22  | firme |   2.4
//  VIII | 8.3 |   22  |   28  |  26  | firme |   2.6
//   IX  | 8.2 |   14  |   12  |  30  | blando|   2.8
//    X  | 8.7 |   12  |    8  |  36  | blando|   3.0
//    XI | 9.3 |   10  |    4  |  44  | blando|   3.2
//   XII | 9.5 |    8  |    0  |  55  | blando|   3.4
import type { SeismicConfig } from '../seismicComparisonModel';

export type MmiLevel = { mmi: number; roman: string; label: string; effect: string };

export const MMI_LEVELS: readonly MmiLevel[] = [
  { mmi: 1, roman: 'I', label: 'I Imperceptible', effect: 'Solo lo registran instrumentos; no se percibe.' },
  { mmi: 2, roman: 'II', label: 'II Muy leve', effect: 'Vibración leve en pisos altos; pocos la notan.' },
  { mmi: 3, roman: 'III', label: 'III Leve', effect: 'Sacude lámparas y ventanas, como un camión pasando.' },
  { mmi: 4, roman: 'IV', label: 'IV Moderada', effect: 'Sacude edificios y vajilla; se escuchan crujidos.' },
  { mmi: 5, roman: 'V', label: 'V Fuerte', effect: 'Muebles se mueven; daño muy leve en edificaciones bien construidas.' },
  { mmi: 6, roman: 'VI', label: 'VI Muy fuerte', effect: 'Daño leve en edificaciones bien construidas; objetos caen.' },
  { mmi: 7, roman: 'VII', label: 'VII Destructiva', effect: 'Daño leve en edificaciones bien construidas, moderado en mal construidas.' },
  { mmi: 8, roman: 'VIII', label: 'VIII Muy destructiva', effect: 'Daño grave en bien construidas; colapso parcial de construcciones débiles.' },
  { mmi: 9, roman: 'IX', label: 'IX Violenta', effect: 'Daño severo en bien construidas; deslizamientos y daño generalizado.' },
  { mmi: 10, roman: 'X', label: 'X Extrema', effect: 'Destrucción generalizada; fisuras en el terreno.' },
  { mmi: 11, roman: 'XI', label: 'XI Catastrófica', effect: 'Destrucción masiva; líneas férreas deformadas.' },
  { mmi: 12, roman: 'XII', label: 'XII Total', effect: 'Transformación total del terreno; objetos proyectados.' },
];

export const MMI_COLORS: readonly string[] = [
  '#2f9e44', '#4cab2e', '#7cb518', '#b5b515',
  '#e6c21f', '#FFE600', '#ffb020', '#ff8c1a',
  '#f76b1c', '#e8442a', '#a4133c', '#6a040f',
];

export const MMI_PARAMS: Record<number, Pick<SeismicConfig, 'magnitude' | 'depthKm' | 'distanceKm' | 'duration' | 'soil' | 'frequencyHz'>> = {
  1: { magnitude: 5.1, depthKm: 120, distanceKm: 250, duration: 5, soil: 'rock', frequencyHz: 1.2 },
  2: { magnitude: 5.7, depthKm: 90, distanceKm: 200, duration: 7, soil: 'rock', frequencyHz: 1.4 },
  3: { magnitude: 6.2, depthKm: 70, distanceKm: 150, duration: 9, soil: 'rock', frequencyHz: 1.6 },
  4: { magnitude: 6.2, depthKm: 55, distanceKm: 110, duration: 11, soil: 'firm', frequencyHz: 1.8 },
  5: { magnitude: 6.7, depthKm: 45, distanceKm: 80, duration: 14, soil: 'firm', frequencyHz: 2.0 },
  6: { magnitude: 7.2, depthKm: 35, distanceKm: 55, duration: 17, soil: 'firm', frequencyHz: 2.2 },
  7: { magnitude: 7.7, depthKm: 28, distanceKm: 40, duration: 22, soil: 'firm', frequencyHz: 2.4 },
  8: { magnitude: 8.3, depthKm: 22, distanceKm: 28, duration: 26, soil: 'firm', frequencyHz: 2.6 },
  9: { magnitude: 8.2, depthKm: 14, distanceKm: 12, duration: 30, soil: 'soft', frequencyHz: 2.8 },
  10: { magnitude: 8.7, depthKm: 12, distanceKm: 8, duration: 36, soil: 'soft', frequencyHz: 3.0 },
  11: { magnitude: 9.3, depthKm: 10, distanceKm: 4, duration: 44, soil: 'soft', frequencyHz: 3.2 },
  12: { magnitude: 9.5, depthKm: 8, distanceKm: 0, duration: 55, soil: 'soft', frequencyHz: 3.4 },
};

export function clampMmi(mmi: number): number {
  return Math.min(12, Math.max(1, Math.round(mmi)));
}

export function mmiLabel(mmi: number): string {
  return MMI_LEVELS[clampMmi(mmi) - 1].label;
}

// Patrón de vibración [buzz, pausa, buzz, ...] proporcional a la intensidad MMI activa.
export function vibrationPatternForMmi(mmi: number): number[] {
  const level = clampMmi(mmi);
  if (level <= 3) return [20, 220, 20, 220, 20];
  if (level <= 5) return [30, 140, 40, 120, 60];
  if (level <= 7) return [40, 90, 80, 70, 120];
  if (level <= 9) return [60, 50, 120, 40, 180];
  return [80, 25, 160, 25, 240];
}
