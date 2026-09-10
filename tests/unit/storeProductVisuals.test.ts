import { describe, expect, it } from 'vitest';
import { resolveStoreProductImage, STORE_VISUALS } from '@/lib/storeProductVisuals';

describe('store product visuals', () => {
  it('gives the starter products distinct, relevant reference images when no stored media exists', () => {
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

  it('always prefers stored product media over capacity-based reference artwork', () => {
    const realImage = 'https://res.cloudinary.com/disghf6xc/image/upload/v1/products/real-tcl.jpg';
    const image = resolveStoreProductImage({
      name: 'Aire Acondicionado Inverter TCL SaveIN 12000 BTU WiFi',
      category_name: 'Climatización',
      image_url: realImage,
    });
    expect(image).toBe(realImage);
  });

  it('mirrors known TCL source images through the Fabrick Cloudinary library', () => {
    const image = resolveStoreProductImage({
      name: 'Aire Acondicionado Inverter TCL SaveIN 12000 BTU WiFi',
      category_name: 'Climatización',
      image_url: 'https://tclstore.cl/cdn/shop/files/00-portada.jpg?v=1',
    });
    expect(image).toContain('res.cloudinary.com/disghf6xc/image/upload');
    expect(image).toContain('/soluciones-fabrick/productos/aire-tcl/tcl-savein-12000-btu-wifi.jpg');
  });

  it('uses the stable transparent PNG for the air entry card and fallback when no product photo exists', () => {
    const image = resolveStoreProductImage({ name: 'Climatización para tu hogar', category_name: 'Climatización' });
    expect(image).toBe(STORE_VISUALS.airCalculatorPng);
    expect(image).toContain('/f_png/');
    expect(image).toContain('air-split-premium-v10.png');
  });
});
