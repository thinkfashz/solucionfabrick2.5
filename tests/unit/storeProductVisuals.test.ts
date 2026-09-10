import { describe, expect, it } from 'vitest';
import { resolveStoreProductImage, STORE_VISUALS } from '@/lib/storeProductVisuals';

describe('store product visuals', () => {
  it('gives the starter products distinct, relevant reference images', () => {
    const names = [
      'Cemento Especial 25 kg',
      'Aditivo impermeabilizante para hormigón 1 L',
      'Llana metálica para terminación de hormigón',
      'Nivel láser cruzado compacto',
      'Kit de instalación Split · hasta 5 m',
      'Soporte mural para unidad exterior',
      'Cable eléctrico THHN 2,5 mm · 100 m',
      'Foco LED exterior 50 W IP65',
      'Lámpara colgante LED premium',
      'Plafón LED slim premium',
    ];
    const images = names.map((name) => resolveStoreProductImage({ name }));
    expect(new Set(images).size).toBe(names.length);
  });

  it('uses the stable transparent PNG for the air entry card and fallback', () => {
    const image = resolveStoreProductImage({ name: 'Climatización para tu hogar', category_name: 'Climatización' });
    expect(image).toBe(STORE_VISUALS.airCalculatorPng);
    expect(image).toContain('/f_png/');
    expect(image).toContain('air-split-premium-v10.png');
  });
});
