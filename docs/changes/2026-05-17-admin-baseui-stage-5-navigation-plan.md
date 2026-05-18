# Migración visual admin · Etapa 5 · Navegación unificada

## Fecha
2026-05-17

## Rama

```txt
feature/admin-baseui-stage-5-navigation
```

## Tipo de PR

PR apilado sobre:

```txt
feature/admin-baseui-stage-4-system-security
```

## Objetivo

Unificar navegación del admin para que móvil y escritorio sean coherentes, sin rutas muertas ni módulos duplicados.

## Archivos principales a revisar

```txt
src/components/admin/AdminContextMenu.tsx
src/components/admin/AdminShell.tsx
```

## Reglas

- No tocar barra inferior móvil si ya funciona.
- Mejorar menú hamburguesa móvil.
- No romper sidebar PC.
- Eliminar o corregir rutas inexistentes.
- Evitar módulos duplicados.
- Agrupar por bloques claros.
- Mantener rutas reales existentes.
- Si una ruta no existe, apuntar al módulo real equivalente o marcar pendiente.

## Rutas inexistentes detectadas en etapa 4

```txt
/admin/database
/admin/diagnostico-apis
```

Si aparecen en navegación, deben corregirse.

## Resultado esperado

- Menú móvil más claro.
- Sidebar PC coherente.
- Mismas áreas funcionales visibles.
- Sin links muertos hacia rutas inexistentes.
- Mejor preparación para módulo final de navegación modular.
