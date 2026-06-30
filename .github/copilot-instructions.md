# Copilot Instructions · Soluciones Fabrick

Antes de proponer código visual, aplica la skill local:

- `skills/design-taste-frontend/SKILL.md`

## Lectura del proyecto

Soluciones Fabrick es una app Next.js/React/Tailwind 3.4 con tienda pública, checkout, admin, SaaS y módulos de cotización. La experiencia principal se prueba en Android móvil.

## Reglas obligatorias

- Mobile-first siempre.
- No crear UI genérica tipo template.
- No duplicar acciones: si el bolso está en navbar, no crear otro botón igual en el hero.
- Usar logo/wordmark real, nunca iconos aleatorios como marca.
- Verde solo para éxito/pago/comprar; amarillo para marca/CTA principal; negro/zinc como base.
- Mantener Tailwind 3.4. No migrar a v4.
- Evitar animaciones infinitas pesadas, blur excesivo y sombras que ralenticen Android.
- En rediseños, auditar la pantalla actual antes de cambiarla.
- En tienda, priorizar catálogo, stock, precio, carrito, checkout y búsqueda.
- No tocar SQL/RLS/migraciones sin instrucción explícita.

## Pre-flight

Antes de finalizar, verifica: contraste, textos sin cortar, CTA claro, responsive móvil, sin acciones duplicadas, sin logos falsos, sin imports innecesarios y build compatible con Vercel.
