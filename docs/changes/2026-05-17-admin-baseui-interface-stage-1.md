# Migración visual admin · BaseUI/shadcn inspired · Etapa 1

## Fecha
2026-05-17

## Referencia visual

Se tomó como referencia el repositorio:

```txt
https://github.com/arhamkhnz/next-shadcn-admin-dashboard-baseui.git
```

El repositorio externo usa licencia MIT, por lo que se puede adaptar su enfoque visual y de arquitectura respetando atribución.

## Objetivo

Adaptar el admin de Soluciones Fabrick a una interfaz oscura, moderna, modular y consistente, sin meter datos demo y sin romper los datos reales actuales.

## Decisión técnica

No se copió el proyecto externo completo. Se creó una capa propia de UI reusable inspirada en su enfoque:

```txt
src/components/admin/baseui-kit.tsx
```

Esta capa trae:

- `AdminBasePage`
- `AdminBaseGrid`
- `AdminBaseCard`
- `AdminBaseMetric`
- `AdminBaseButton`

## Página migrada en esta etapa

```txt
src/app/admin/modulos/page.tsx
```

La página ahora usa el nuevo shell visual con:

- hero oscuro estilo dashboard moderno;
- métricas reales del flujo modular;
- tarjetas de navegación hacia módulos reales;
- mapa completo de módulos existente;
- sin datos de prueba;
- sin cambiar lógica ni fuentes de datos reales.

## Reglas de la migración

- No tocar `main` directo.
- No crear datos demo.
- No reemplazar datos reales.
- No duplicar módulos.
- Migrar por etapas.
- Mantener diseño dark por defecto.
- Mantener rutas reales.
- Mantener compatibilidad móvil.

## Siguiente etapa recomendada

1. Aplicar `AdminBasePage` a `/admin/ai-developer`.
2. Crear un wrapper visual para tablas reales.
3. Migrar páginas de alto impacto:
   - `/admin/productos`
   - `/admin/integraciones`
   - `/admin/equipo`
   - `/admin/sesiones`
4. No alterar queries ni endpoints hasta que el diseño esté estable.
