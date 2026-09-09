import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/app/checkout/page.tsx', 'utf8');
const visual = readFileSync('src/app/checkout/checkout-reference.module.css', 'utf8');
const checkout = readFileSync('src/components/checkout/CheckoutAppV2.tsx', 'utf8');
const checkoutApi = readFileSync('src/app/api/checkout/route.ts', 'utf8');
const metalconViewer = readFileSync('src/components/store/MetalconCinematicViewer.tsx', 'utf8');
const metalconMonitoring = readFileSync('src/components/store/StructuralMonitoringSimulator.tsx', 'utf8');

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

  it('keeps Metalcon on a real Three.js 360 viewer with configurable scene layers', () => {
    expect(metalconViewer).toContain("from '@react-three/fiber'");
    expect(metalconViewer).toContain('OrbitControls');
    expect(metalconViewer).toContain('Cinematic 4D');
    expect(metalconViewer).toContain('Biblioteca procedural de suelo');
    expect(metalconViewer).toContain("['profiles', 'Perfiles'");
    expect(metalconViewer).toContain('4D montaje');
  });

  it('keeps the seismic simulator separate, parameterized and explicitly non-certified', () => {
    expect(metalconMonitoring).toContain('Profundidad del hipocentro');
    expect(metalconMonitoring).toContain('Magnitud del escenario');
    expect(metalconMonitoring).toContain('Propagación de ondas');
    expect(metalconMonitoring).toContain('Puntos críticos');
    expect(metalconMonitoring).toContain('Reparación referencial');
    expect(metalconMonitoring).toContain('no sustituyen análisis estructural');
    expect(metalconMonitoring).toContain('no uses este resultado para decidir habitabilidad');
  });
});
