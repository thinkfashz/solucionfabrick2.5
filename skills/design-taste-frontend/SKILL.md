---
name: design-taste-frontend
description: Skill local de Soluciones Fabrick para que cualquier IA mejore interfaces con criterio premium, mobile-first, sin UI genérica ni sobre-animada.
---

# Design Taste Frontend · Soluciones Fabrick

Skill local inspirada en Taste Skill de Leonxlnx. Esta versión está adaptada al proyecto `solucionfabrick2.5` para mejorar UI/UX sin romper rendimiento, checkout, tienda, admin ni flujos SaaS.

## Lectura obligatoria antes de tocar UI

Antes de generar o modificar código visual, declara mentalmente:

> Reading this as: tienda / SaaS / admin de Soluciones Fabrick para clientes reales en móvil, con lenguaje premium oscuro, comercial, rápido y confiable, usando Tailwind 3.4, React/Next y movimiento moderado.

No preguntes si el cambio está claro por captura o por contexto. Aplica directamente y deja el resultado usable.

## Diales por defecto

- DESIGN_VARIANCE: 6/10
- MOTION_INTENSITY: 4/10
- VISUAL_DENSITY: 5/10

Interpretación:

- Diseño moderno, pero no raro.
- Animaciones suaves, nunca pesadas.
- Mucha claridad móvil, sin saturar.
- Evitar efectos que ralenticen Android.

## Reglas visuales del proyecto

1. Mobile-first siempre. Primero pantalla 360-430px, luego desktop.
2. El usuario final debe entender en 3 segundos qué puede hacer.
3. Usar jerarquía clara: título, ayuda corta, acción primaria.
4. No duplicar CTAs con la misma intención.
5. No meter botones redundantes si la acción ya existe en navbar.
6. No usar iconos falsos como logo. Usar logo/wordmark real de Soluciones Fabrick o marca del tenant.
7. Mantener una paleta coherente: negro/zinc + amarillo Fabrick + verde solo para comprar/pagar/éxito.
8. Usar bordes y sombras solo para separar jerarquía real.
9. Evitar cards gigantes cuando un layout más simple comunica mejor.
10. Evitar textos largos en hero, drawers y botones.

## Tienda pública

Prioridades:

- Portada clara y rápida.
- Catálogo visible.
- Cards con imagen, categoría, stock, precio y acción clara.
- Carrito/bolso siempre accesible desde navbar.
- Checkout directo, sin fricción.
- GPS solo como ayuda opcional, nunca bloqueante.

Botones:

- Comprar / Obtener ahora: verde o amarillo fuerte, alto contraste.
- Agregar al bolso: amarillo o neutro con icono claro.
- Buscar / Filtrar: neutro oscuro con borde sutil.
- No usar dos botones con el mismo objetivo en el mismo viewport.

Drawer móvil:

- Debe abrir rápido.
- Debe incluir búsqueda y filtros si aplica.
- No debe mostrar hero interno largo.
- Debe agrupar: Navegación, Cuenta, Soporte.
- No usar copy decorativo como “Compra, cuenta y seguimiento” si ocupa espacio sin función.

## Agente IA

- Debe ser una burbuja flotante limpia.
- Puede moverse por toda la pantalla.
- No mostrar iconos extra de mover si ensucian la interfaz.
- Arrastrar mueve; tocar abre.
- Debe mantenerse dentro del viewport tras resize/orientación.
- No debe tapar carrito, checkout, formularios o botones críticos.

## Admin / SaaS

- Densidad mayor que tienda, pero con orden.
- Usar secciones: Estado, Acción rápida, Configuración, Logs.
- Mostrar errores con lenguaje humano y acción siguiente.
- No ejecutar migraciones SQL/RLS salvo solicitud explícita.
- No mezclar SaaS pesado en tienda si el SaaS está desactivado.

## Performance

- No usar animaciones infinitas grandes sobre imágenes.
- Evitar blur excesivo y sombras enormes en listas largas.
- Usar `min-h-[100dvh]` en pantallas completas, no `h-screen`.
- Mantener componentes interactivos como hojas `use client` aisladas.
- No importar librerías nuevas sin verificar `package.json`.
- Proyecto usa Tailwind 3.4: no actualizar a Tailwind v4.

## Pre-flight antes de entregar

Antes de finalizar cualquier cambio UI, revisar:

- ¿Se ve bien en Android vertical?
- ¿El texto cabe sin cortar?
- ¿El CTA principal está claro?
- ¿El botón tiene contraste?
- ¿Hay acciones duplicadas?
- ¿Hay iconos/logo falsos?
- ¿La UI se siente más simple que antes?
- ¿No se ralentiza la tienda?
- ¿Vercel compila?

## Prompt corto para futuras IAs

Usa esta instrucción si una IA continúa el proyecto:

> Sigue la skill local `design-taste-frontend`. Mejora la interfaz con criterio premium, mobile-first, simple y rápido. No generes UI genérica. No dupliques acciones. Usa la marca real de Soluciones Fabrick. Mantén Tailwind 3.4. Prioriza claridad, rendimiento y checkout usable en Android.
