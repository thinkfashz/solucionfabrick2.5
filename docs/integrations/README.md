# Integraciones

> Última actualización: **2026-05-09**.

Este directorio cataloga, **por proveedor**, qué integraciones están vivas en `main` hoy y cómo se configuran. Es la contraparte humana del map central `src/lib/integrationsEnvMap.ts`.

Para detalles de cifrado, env-vars y precedencia env→DB, ver `docs/architecture.md §4.3` y `CHANGELOG.md` (Fase 2A/2B).

---

## 1. Tabla resumen — qué hay en `main`

| Proveedor                | Helper en `src/lib/`                       | Endpoint admin                                  | Estado en `main` |
|--------------------------|--------------------------------------------|-------------------------------------------------|------------------|
| **InsForge**             | `insforge.ts`, `insforge-admin.ts`, `insforgeAuth.ts` | toda la app                            | ✅ Core dependency |
| **Mercado Pago**         | `mercadopago.ts`, `mercadopagoStatus.ts`   | `/api/payments/{mercadopago,mp-status,webhook}` | ✅                |
| **Cloudinary**           | (inline en route)                          | `/api/admin/cloudinary`                         | ✅                |
| **Meta (FB/IG Ads)**     | `metaCredentials.ts`, `meta.ts`            | `/api/meta/{ads,upload}`, `/api/meta/ads/create` | ✅ (sin OAuth — token manual) |
| **Vercel REST**          | `vercelClient.ts`                          | `/api/admin/vercel/{deployments,logs}`          | ✅                |
| **Sentry**               | `@sentry/nextjs` directo                   | `/api/admin/test-sentry`                        | ✅                |
| **Cloudflare Turnstile** | `turnstile.ts`                             | (validación inline en endpoints públicos)       | ✅                |
| **WhatsApp**             | `whatsapp.ts`                              | (link generado client-side; no API directa)     | ✅                |
| **Web Push (VAPID)**     | `push.ts`                                  | `/api/push/{public-key,subscribe,unsubscribe,send}` | ✅            |
| **Chilexpress / Starken / Correos Chile** | `shipping/`                | `/api/shipping/{quote,tracking}`                | ✅ (lectores parciales) |
| **Mercado Libre (seller)** | _(plan)_                                 | _(plan: `/api/admin/ml/oauth/*`)_                | ❌ No fusionado   |
| **Google OAuth**         | _(plan: `googleCredentials.ts`)_           | _(plan: `/api/admin/google/oauth/*`)_            | ❌ No fusionado   |
| **TikTok for Business**  | _(plan)_                                   | _(plan: `/api/admin/tiktok/oauth/*`)_            | ❌ No fusionado   |
| **Resend (email)**       | _(plan: `resendCredentials.ts`)_           | _(plan: `/api/admin/integrations/rotate`)_       | ❌ No fusionado   |
| **OpenRouter (IA)**      | _(parcial: `/api/agent/chat` mencionado en PR #143; verificar en main)_ | —      | 🟡 Parcial        |

Las filas con ❌ son del plan maestro (memorias internas) pero **no** están en `scripts/create-tables.sql` ni en el árbol de archivos actual. Si vas a fusionar uno, ver memorias vivas: `oauth providers`, `mercadolibre oauth`, `resend integration`, `credential rotation`.

---

## 2. Cómo se persisten las credenciales

Tres caminos, en orden de precedencia:

1. **Variable de entorno** declarada en `INTEGRATIONS_ENV_MAP`.
   - Si está seteada → la UI de `/admin/configuracion` muestra el campo bloqueado con etiqueta `gestionado por env (VAR)`.
   - POST a `/api/admin/integrations` que intente sobrescribir un campo env-managed devuelve `409 ENV_VAR_PRESENT`.
2. **Fila en `integrations` (DB)**, columna `credentials jsonb`, **cifrada por valor** con AES-256-GCM si `INTEGRATIONS_ENC_KEY` está seteada.
3. **Hardcoded fallback** (solo InsForge URL/anon-key — exclusivamente para que la app arranque sin env vars; no usar para credenciales de otros providers).

---

## 3. Aliases de env vars (snapshot del map vivo)

Memoria viva: `integrations env map`. Aliases activos en `INTEGRATIONS_ENV_MAP`:

| Provider     | Field                          | Env vars aceptadas                                   |
|--------------|--------------------------------|------------------------------------------------------|
| `meta`       | `access_token`                 | `META_ACCESS_TOKEN`                                  |
| `meta`       | `ad_account_id`                | `META_AD_ACCOUNT_ID`                                 |
| `meta`       | `page_id`                      | `META_FACEBOOK_PAGE_ID`, `META_PAGE_ID`              |
| `meta`       | `instagram_business_id`        | `META_INSTAGRAM_BUSINESS_ID`                         |
| `vercel`     | `api_token`                    | `VERCEL_API_TOKEN`                                   |
| `vercel`     | `project_id`                   | `VERCEL_PROJECT_ID`                                  |
| `vercel`     | `team_id`                      | `VERCEL_TEAM_ID`                                     |

Providers `google`, `google_ads`, `tiktok`, `cloudinary` aparecen en el map pero **vacíos** porque ningún runtime de `main` los lee desde env (sus credenciales sólo viven en DB hoy).

> **Regla**: añadir un alias al map sin cablear el helper consumidor (`get*Credentials()`) deja la UI bloqueada y el runtime sin la credencial. Memoria viva: `env-managed credentials`.

---

## 4. Plantillas para nuevos providers

Cuando se fusione un provider del plan (ej. Mercado Libre), el PR debe incluir:

1. Helper `src/lib/<provider>Credentials.ts` que use `readEnvFromMap('<provider>', '<field>')` para cada campo.
2. Entrada en `INTEGRATIONS_ENV_MAP` con todos los aliases env aceptados (o explícitamente `[]` si no hay).
3. Si tiene OAuth: `src/app/api/admin/<provider>/oauth/{start,callback}/route.ts` siguiendo el patrón `mlOAuth` (state HMAC con `ADMIN_SESSION_SECRET`, callback persiste con `encryptCredentials` a `integrations(provider)` `onConflict:'provider'`).
4. Test unit del helper en `tests/unit/<provider>Credentials.test.ts`.
5. Card en `/admin/configuracion` (UI) con `apiKeyUrl`, `apiKeyLabel`, `instructions[]` si aplica.
6. Documentar la integración en este directorio (`docs/integrations/<provider>.md`).

---

## 5. Cron de healthcheck (planificado, no fusionado)

El plan original (memoria `integrations healthcheck`) define un cron diario `/api/cron/integrations-healthcheck` que corre `runIntegrationsHealthcheck()` y persiste a `integration_health_log` + `integration_quota_snapshots`, enviando un email consolidado a `ADMIN_ALERT_EMAIL` vía Resend cuando hay fallas.

**Prerequisitos para fusionarlo en `main`**:

- Resend integrado (provider + helper + env vars).
- Tablas `integration_health_log` y `integration_quota_snapshots` añadidas a `scripts/create-tables.sql`.
- Cron declarado en `vercel.json` con `0 9 * * *` (Hobby: 1×/día — memoria `vercel cron limits`).

---

## 6. Documentos por proveedor (pendientes)

A futuro, este directorio contendrá un archivo por provider con:

- Cómo conseguir las credenciales (links + screenshots si es legal).
- Scopes / permisos mínimos.
- Endpoints del runtime que las consumen.
- Procedimiento de rotación.
- Cómo probar la conexión desde `/admin/configuracion`.

Hoy solo existe este índice. Crearlos en PRs separados a medida que se fusionen los módulos.
