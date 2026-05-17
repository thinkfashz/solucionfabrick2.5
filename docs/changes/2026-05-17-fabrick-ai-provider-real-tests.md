# Mejora: Tests reales para proveedores IA

## Fecha
2026-05-17

## Contexto

Las tarjetas 3D de OpenAI, OpenRouter y Claude tenían una barra visual simulada. El módulo necesitaba probar credenciales reales sin exponer secretos.

## Implementación

Se creó:

```txt
src/app/api/admin/ai-developer/test-provider/route.ts
```

Y se actualizó:

```txt
src/components/admin/FabrickAIProviderCards.tsx
```

## Funcionamiento

Cada tarjeta 3D ahora puede llamar:

```txt
POST /api/admin/ai-developer/test-provider
```

con:

```json
{ "provider": "openai" }
```

También soporta:

```txt
openrouter
claude
```

## Seguridad

El endpoint:

- exige permiso `integrations:test`;
- bloquea viewer/demo;
- lee credenciales con `resolveIntegrationCredentials()`;
- usa DB-first y Vercel fallback;
- no devuelve API keys;
- audita éxito/fallo;
- devuelve latencia, proveedor, modelo y fuente.

## UI

Las tarjetas 3D ahora muestran:

- progreso animado;
- estado OK / ERROR;
- latencia real;
- modelo usado;
- fuente de credencial `db` o `env`;
- error real si falta credencial o proveedor falla.

## Pendiente

Los inputs dentro de las tarjetas IA siguen siendo guía visual. El guardado oficial de credenciales continúa en `/admin/integraciones`.

Pendiente futuro:

- agregar OpenAI y Claude visualmente al array de proveedores de `/admin/integraciones`;
- permitir guardado real desde esas tarjetas solo si se decide fusionarlas con el centro oficial;
- ejecutar typecheck/lint/build antes de merge.
