import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/app/checkout/page.tsx', 'utf8');
const visual = readFileSync('src/app/checkout/checkout-reference.module.css', 'utf8');
const checkout = readFileSync('src/components/checkout/CheckoutAppV2.tsx', 'utf8');
const checkoutApi = readFileSync('src/app/api/checkout/route.ts', 'utf8');
const metalconViewer = readFileSync('src/components/store/MetalconCinematicViewer.tsx', 'utf8');
const metalconAssembly = readFileSync('src/components/store/MetalconAssembly3D.tsx', 'utf8');
const metalconMonitoring = readFileSync('src/components/store/StructuralMonitoringSimulator.tsx', 'utf8');
const metalconPlans = readFileSync('src/lib/metalconAssembly.ts', 'utf8');

describe('shopping visual flow contract', () => {
  it('keeps the shopping redesign isolated to the checkout presentation layer', () => {
    expect(page).toContain('checkout-reference.module.css');
    expect(page).toContain('<CheckoutAppV2 />');
    expect(visual).toContain('Shopping visual layer only');
    expect(visual).toContain('--sf-yellow: #f6c64a');
  });

  it('covers checkout, processing and payment-result screens in the visual layer', () => {
    expect(visual).toContain('Panel de resumen y formulario');
    expect(visual).toContain('Pantalla modal mientras se crea la orden');
    expect(visual).toContain('Estados de pago: proceso, aprobado, revisión, abandono y rechazo');
    expect(visual).toContain('Totales con aspecto de comprobante');
  });

  it('preserves the existing Mercado Pago and reservation checkout contract', () => {
    expect(checkout).toContain("paymentMethod: 'mercadopago'");
    expect(checkout).toContain("fetch('/api/checkout'");
    expect(checkout).toContain('stableCheckoutOrderKey');
    expect(checkoutApi).toContain('createOrderWithReservations');
    expect(checkoutApi).toContain('createMercadoPagoPreference');
  });

  it('does not present bank transfer as a separate implemented checkout backend', () => {
    expect(checkout).not.toContain("paymentMethod: 'transferencia'");
    expect(checkout).not.toContain("paymentMethod: 'bank_transfer'");
  });

  it('keeps the shopping layer responsive and reduced-motion friendly', () => {
    expect(visual).toContain('@media (max-width: 1023px)');
    expect(visual).toContain('@media (max-width: 639px)');
    expect(visual).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('keeps Metalcon on a real Three.js 360 viewer with complete plan presets', () => {
    expect(metalconViewer).toContain("from '@react-three/fiber'");
    expect(metalconViewer).toContain('OrbitControls');
    expect(metalconViewer).toContain('Cinematic 4D');
    expect(metalconViewer).toContain('Biblioteca procedural de suelo');
    expect(metalconViewer).toContain("['profiles', 'Perfiles'");
    expect(metalconViewer).toContain('4D montaje');
    expect(metalconViewer).toContain('family-6x8');
    expect(metalconPlans).toContain("'compact-5x5'");
    expect(metalconPlans).toContain("'family-6x8'");
    expect(metalconPlans).toContain("'studio-45x58'");
  });

  it('frames openings with localized members instead of a single full-wall X', () => {
    expect(metalconAssembly).toContain('OpeningFrame');
    expect(metalconAssembly).toContain('doble jamba');
    expect(metalconAssembly).toContain('dintel compuesto');
    expect(metalconAssembly).toContain('montantes cortos');
    expect(metalconAssembly).toContain('clearWallIntervals');
    expect(metalconAssembly).toContain('DiagonalMember');
    expect(metalconAssembly).not.toContain('Brace direction={-1}');
  });

  it('keeps the seismic simulator separate, full-mesh and explicitly non-certified', () => {
    expect(metalconMonitoring).toContain('Profundidad hipocentral');
    expect(metalconMonitoring).toContain('Distancia epicentral');
    expect(metalconMonitoring).toContain('Magnitud del escenario');
    expect(metalconMonitoring).toContain('Intensidad MMI');
    expect(metalconMonitoring).toContain('PGA proxy');
    expect(metalconMonitoring).toContain('Deriva proxy');
    expect(metalconMonitoring).toContain('Propagación de onda P');
    expect(metalconMonitoring).toContain('Ranking de paneles');
    expect(metalconMonitoring).toContain('Reparación referencial');
    expect(metalconMonitoring).toContain('no un modelo de ingeniería sísmica');
    expect(metalconMonitoring).toContain('No uses este resultado para decidir habitabilidad');
  });
});
