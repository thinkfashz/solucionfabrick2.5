# Admin UI refresh inspirado en next-shadcn-admin-dashboard-baseui

## Fecha
2026-05-17

## Referencia

Repositorio usado como referencia visual:

```txt
https://github.com/arhamkhnz/next-shadcn-admin-dashboard-baseui
```

Licencia del repositorio de referencia: MIT.

No se importan datos de prueba ni se copian secretos. La intención es adaptar el estilo visual y experiencia de navegación al admin actual de Soluciones Fabrick.

## Objetivo

Actualizar el admin para que tenga una interfaz más moderna, oscura por defecto, responsive y modular:

- sidebar más limpio;
- navegación por secciones;
- topbar ordenado;
- tarjetas más consistentes;
- estilo oscuro predominante;
- datos reales de la app;
- sin fake data en módulos;
- mantener rutas y lógica actual.

## Reglas

- No romper rutas existentes.
- No reemplazar módulos completos sin necesidad.
- No meter dashboards demo.
- No usar datos mock si existe endpoint real.
- Si no hay datos reales, mostrar estado vacío o error controlado.
- Mantener compatibilidad móvil.
- Hacer migración por etapas.

## Etapa 1

Base visual global:

```txt
src/components/admin/AdminShell.tsx
src/components/admin/ui.tsx
```

## Etapas futuras

1. Migrar dashboard principal.
2. Migrar tablas de productos/clientes/pedidos.
3. Migrar módulos de integraciones.
4. Migrar AI Developer.
5. Normalizar cards, badges, headers y empty states.
6. Revisar build.
