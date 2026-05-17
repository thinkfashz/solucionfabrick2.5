# Mejora: Fabrick AI Developer con chat real

## Fecha
2026-05-17

## Contexto

El Módulo 8 tenía una UI tipo chat, pero todavía respondía de forma simulada. Se necesitaba un endpoint real para consultar proveedores IA usando credenciales seguras.

## Implementación

Se creó:

```txt
src/app/api/admin/ai-developer/chat/route.ts
```

Y se conectó:

```txt
src/app/admin/ai-developer/page.tsx
```

## Capacidades actuales

- Soporta proveedores `auto`, `openai`, `openrouter`, `claude`.
- Soporta modos `lectura`, `propuesta`, `pr`.
- Lee credenciales con `resolveIntegrationCredentials()`.
- Usa DB cifrada primero y Vercel env como fallback.
- Bloquea viewer/demo.
- Audita éxito y fallo con `admin_action_audit` mediante `recordAdminAudit()` y `recordAdminFailure()`.
- No hace merge.
- No hace deploy.
- No toca `main`.
- No expone API keys.

## Estado por secciones

```txt
Sección 1: credenciales IA server-side avanzada
Sección 2: endpoint chat completado
Sección 3: UI conectada al endpoint completada
Sección 4: herramientas Git controladas pendiente
Sección 5: auditoría básica completada; auditoría de herramientas pendiente
```

## Pendientes

- Agregar OpenAI y Claude visualmente dentro de `/admin/integraciones` oficial.
- Crear endpoints de test real para proveedores IA.
- Crear herramientas Git controladas: leer repo, leer archivos, proponer cambios, crear rama y crear PR.
- Ejecutar `pnpm typecheck`, `pnpm lint` y `pnpm build` antes de merge.

## Regla para continuar

Las herramientas Git deben implementarse en modo seguro. Pueden preparar ramas y PRs, pero no pueden hacer merge ni deploy automático.
