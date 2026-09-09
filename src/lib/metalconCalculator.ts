export type MetalconInput = {
  widthM: number;
  heightM: number;
  spacingCm: 40 | 60;
  osbWidthCm: 120 | 122;
  hasDoor: boolean;
  hasWindow: boolean;
};

export type MetalconEstimate = {
  baseStuds: number;
  openingReinforcements: number;
  totalStuds: number;
  trackMeters: number;
  osbSheets: number;
  openings: number;
};

export function calculateMetalcon(input: MetalconInput): MetalconEstimate {
  const widthM = Math.max(.8, Math.min(20, input.widthM || 0));
  const heightM = Math.max(1.8, Math.min(5, input.heightM || 0));
  const openings = Number(input.hasDoor) + Number(input.hasWindow);
  const baseStuds = Math.floor((widthM * 100) / input.spacingCm) + 1;
  const openingReinforcements = openings * 4;
  const sheetHeightM = input.osbWidthCm === 122 ? 2.44 : 2.4;
  const grossArea = widthM * heightM;
  const openingArea = (input.hasDoor ? 1.89 : 0) + (input.hasWindow ? 1.44 : 0);
  const osbSheets = Math.max(1, Math.ceil(Math.max(0, grossArea - openingArea) / ((input.osbWidthCm / 100) * sheetHeightM) * 1.1));
  return {
    baseStuds,
    openingReinforcements,
    totalStuds: baseStuds + openingReinforcements,
    trackMeters: Math.ceil(widthM * 2 * 10) / 10,
    osbSheets,
    openings,
  };
}
