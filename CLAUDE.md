# Claude / Agent Guide · Soluciones Fabrick

Lee antes de editar UI:

1. `skills/design-taste-frontend/SKILL.md`
2. `AGENTS.md`
3. `.github/copilot-instructions.md`

## Design Read por defecto

Reading this as: tienda/SaaS/admin para Soluciones Fabrick, usado en Android, iPhone y PC, con una estética premium oscura, comercial, confiable y rápida.

## Reglas

- Mobile-first, pero validando Android, iPhone/Safari y PC/desktop.
- Tailwind 3.4, no actualizar a v4.
- Mantener componentes interactivos aislados como `use client`.
- No duplicar CTAs.
- No usar logos falsos.
- No sobrecargar con motion/blur.
- Si mejoras tienda: catálogo, búsqueda, filtros, stock, precio, bolso y checkout son prioridad.
- En PC, aprovechar el ancho con grids y filtros claros, no estirar layouts móviles.
- Si mejoras admin: estado claro, acción siguiente y errores humanos.
- No tocar migraciones SQL/RLS salvo solicitud explícita.

## Antes de cerrar una tarea

- Build compatible con Vercel.
- Sin imports muertos.
- UI usable en 360-430px.
- UI usable en iPhone/Safari.
- UI profesional en PC/desktop.
- Contraste legible.
- CTA principal visible.
- Sin burbujas flotantes tapando acciones críticas.
