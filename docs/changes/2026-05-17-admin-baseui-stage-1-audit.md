# Migración visual admin · Etapa 1 · Auditoría de páginas críticas

## Fecha
2026-05-17

## Objetivo

Revisar páginas críticas antes de modificarlas para evitar reescrituras innecesarias y no romper datos reales.

## Resultado de revisión

### /admin/productos

Estado: ya alineada.

- Usa datos reales desde `/api/admin/products`.
- Tiene métricas reales.
- Tiene tarjetas y tabla.
- Tiene filtros, búsqueda, edición, delete y toggles.
- No usa datos demo.
- No se reescribió completa para evitar romper operación.

### /admin/integraciones

Estado: ya alineada y sensible.

- Centro oficial de credenciales.
- Guarda/testea/revela credenciales.
- Tiene proveedores reales.
- Usa instrucciones y cuotas.
- No se reescribió completa porque es un archivo grande y sensible.

### /admin/equipo

Estado: ya alineada.

- Usa `/api/admin/team` y `/api/admin/invitations`.
- Crea usuarios reales.
- Genera contraseñas temporales.
- Genera invitaciones reales.
- Muestra auditoría, IPs y roles.
- No usa datos demo.

### /admin/sesiones

Estado: ya alineada.

- Usa `/api/admin/sessions`.
- Muestra resumen superadmin, IPs, dispositivos, user-agent y auditoría.
- Tiene filtros y detalle expandible.
- No usa datos demo.

### /admin

Estado: ya alineada y real.

- Usa datos reales de InsForge.
- Carga productos, pedidos, entregas y leads.
- Usa realtime de InsForge.
- Tiene gráficas y KPIs reales.
- No se reescribió para evitar romper dashboard.

## Cambios reales hechos en esta etapa hasta ahora

- Se creó `docs/ADMIN_BASEUI_MIGRATION_MEMORY.md`.
- Se creó `src/components/admin/baseui-kit.tsx`.
- Se creó `src/components/admin/AdminBaseThemeFrame.tsx`.
- Se aplicó el frame visual global en `src/app/admin/layout.tsx`.
- Se migró `/admin/modulos` al kit visual BaseUI.

## Próximo bloque

Revisar y migrar si hace falta:

```txt
/admin/estado
/admin/monitor
/admin/sql
/admin/vercel-logs
/admin/configuracion
```

Regla: no modificar páginas ya alineadas salvo que haya una mejora clara y segura.
