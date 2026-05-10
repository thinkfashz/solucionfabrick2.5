# Deploy runbook

> Última actualización: **2026-05-09**.

Pasos exactos para hacer deploy a producción, hacer rollback, y la lista canónica de variables de entorno requeridas.

---

## 1. Plataforma

- **Hosting**: Vercel (plan Hobby actualmente — el límite de 1×/día en cron jobs es intencional; ver memoria `vercel cron limits`).
- **Runtime**: Node 20.x (Vercel default).
- **Framework**: Next.js 15 (App Router).
- **Backend de datos**: InsForge (`https://txv86efe.us-east.insforge.app` por default; sobrescribible vía `NEXT_PUBLIC_INSFORGE_URL`).

---

## 2. Pre-deploy checklist

Antes de cada release manual:

1. ✅ Branch fusionada a `main` (PR aprobado, conflictos resueltos vía `git fetch --unshallow` previo).
2. ✅ Pipeline `.github/workflows/ci.yml` verde en `main` (lint + typecheck + tests con cobertura ≥ umbrales + build, matriz Node 20.x/22.x).
3. ✅ Pipeline `.github/workflows/e2e.yml` verde sobre el preview anterior.
4. ✅ Sin secretos en `git diff origin/main` (revisión visual del PR).
5. ✅ `CHANGELOG.md` actualizado con la sección Unreleased + Conventional Commits.
6. ✅ Migraciones DDL idempotentes en `scripts/create-tables.sql` (si aplica).

---

## 3. Procedimiento de deploy

### 3.1. Auto-deploy (path principal)

Vercel observa `main` y promueve automáticamente con cada push:

```
push a main → Vercel build → preview → si workflow `vercel.yml` lo aprueba, promote a producción
```

### 3.2. Deploy manual desde CLI (excepcional)

```bash
# Una sola vez:
npm i -g vercel
vercel login
vercel link

# Para promover una branch:
vercel pull --environment=production
vercel build --prod
vercel deploy --prebuilt --prod
```

> **Importante**: si `vercel deploy` falla con _"Hobby accounts are limited to daily cron jobs"_, alguien añadió una expresión sub-diaria en `vercel.json`. Revertir antes de re-intentar.

### 3.3. Aplicar cambios de schema

Si el PR incluye DDL nuevo en `scripts/create-tables.sql`:

1. Hacer login en `/admin/sql` con el operador owner.
2. Pegar el bloque nuevo (todo es `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, idempotente).
3. Verificar con un `SELECT 1 FROM <nueva_tabla> LIMIT 0` que la tabla quedó creada.

> **No usar** `auth.jwt()`, `auth.uid()`, ni `ALTER TABLE … ENABLE ROW LEVEL SECURITY` con políticas que las invocan — InsForge devuelve `INTERNAL_ERROR · function auth.jwt() does not exist` (memoria `insforge sql limits`).

---

## 4. Rollback

### 4.1. Rollback de aplicación (Vercel)

```
Vercel dashboard → Deployments → encontrar el deploy verde anterior → "Promote to Production"
```

Tiempo: ~30s (no rebuild — Vercel reactiva el bundle existente).

### 4.2. Rollback de schema (Postgres / InsForge)

Sin tool de migración formal: **no hay `migrate down` automático**. El procedimiento manual es:

1. Identificar el cambio que causa el problema (`git log scripts/create-tables.sql -p`).
2. Escribir el `ALTER TABLE` inverso (`DROP COLUMN`, `DROP TABLE IF EXISTS`).
3. Ejecutarlo desde `/admin/sql`.

> **Antes de operar producción, siempre hacer un dump primero** (InsForge dashboard → Database → Backup).

### 4.3. Rollback de credenciales comprometidas

Si rotas `INTEGRATIONS_ENC_KEY`, **todos los valores cifrados quedan inválidos**. Después del rollover:

1. Cambiar `INTEGRATIONS_ENC_KEY` en Vercel.
2. Re-introducir cada provider en `/admin/configuracion` (la primera POST post-key re-cifra todos los campos).

---

## 5. Variables de entorno

Lista canónica extraída de `grep -rh "process.env\." src/`. Marca **público** las que se exponen al cliente (prefijo `NEXT_PUBLIC_`).

### 5.1. Requeridas en producción

| Variable                          | Tipo       | Propósito                                               |
|-----------------------------------|------------|---------------------------------------------------------|
| `NEXT_PUBLIC_INSFORGE_URL`        | público    | URL del backend InsForge.                               |
| `NEXT_PUBLIC_INSFORGE_ANON_KEY`   | público    | Anon key del proyecto InsForge.                         |
| `INSFORGE_URL`                    | server     | URL backend (server-side).                              |
| `INSFORGE_API_KEY`                | server     | Service-role key de InsForge.                           |
| `ADMIN_SESSION_SECRET`            | server     | HMAC de cookies admin + KDF de TOTP secret.             |
| `ADMIN_PASSWORD_PEPPER`           | server     | Pepper del scrypt local del password admin.             |
| `INTEGRATIONS_ENC_KEY`            | server     | AES-256-GCM key (hex 64, base64 32B o utf-8 32 chars). Sin esta var, las credenciales viajan plaintext en DB. |
| `NEXT_PUBLIC_APP_URL`             | público    | URL pública canónica del sitio.                         |
| `NEXT_PUBLIC_SITE_URL`            | público    | Alias del anterior.                                     |

### 5.2. Pagos

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `MP_ACCESS_TOKEN` (alias `MERCADO_PAGO_ACCESS_TOKEN` / `MERCADOPAGO_ACCESS_TOKEN`) | Access token MP. |
| `MP_PUBLIC_KEY` (alias `MERCADO_PAGO_PUBLIC_KEY` / `MERCADOPAGO_PUBLIC_KEY`) | Public key MP. |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` (alias `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` / `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY`) | Public key (browser SDK). |
| `MP_WEBHOOK_SECRET` / `PAYMENTS_WEBHOOK_SECRET` / `MERCADO_PAGO_WEBHOOK_SECRET` | HMAC de `/api/payments/webhook`. |

### 5.3. Envíos (Chile)

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `CHILEXPRESS_API_KEY` / `NEXT_PUBLIC_CHILEXPRESS_API_KEY` | API key Chilexpress (cotización). |
| `STARKEN_USER`, `STARKEN_PASS`    | Credenciales Starken.                                      |
| `CORREOSCHILE_USER`, `CORREOSCHILE_PASS` | Credenciales Correos Chile.                          |
| `SHIPPING_ORIGIN_COMUNA`, `SHIPPING_ORIGIN_REGION` | Origen default para cotizaciones.            |

### 5.4. Facturación

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `BILLING_PROVIDER`                | Identificador del proveedor (ej. `openfactura`).           |
| `BILLING_API_KEY`, `BILLING_BASE_URL` | Credenciales del proveedor.                            |
| `BILLING_RUT_EMISOR`, `BILLING_RAZON_SOCIAL` | Datos del emisor SII.                            |

### 5.5. Marketing / publicidad

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `META_ACCESS_TOKEN`               | Token Graph API (env-managed, ver `integrationsEnvMap`).   |
| `META_AD_ACCOUNT_ID`              | Ad Account ID (env-managed).                               |
| `META_PAGE_ID`                    | Página FB (env-managed; alias `META_FACEBOOK_PAGE_ID`).    |
| `GOOGLE_ADS_ACCESS_TOKEN`         | Token Google Ads.                                          |
| `TIKTOK_ADS_ACCESS_TOKEN`         | Token TikTok Ads.                                          |

### 5.6. Vercel REST (para `/admin/vercel-logs`)

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `VERCEL_API_TOKEN`                | API token (env-managed).                                   |
| `VERCEL_PROJECT_ID`               | Project ID (env-managed).                                  |
| `VERCEL_TEAM_ID`                  | Team ID (env-managed, opcional).                           |
| `VERCEL_URL`                      | Provista automáticamente por Vercel.                       |

### 5.7. Storage / media

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `MEDIA_BUCKET`                    | Nombre del bucket InsForge para media.                      |

### 5.8. Email transaccional

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `RESEND_API_KEY`                  | API key Resend (alias `RESEND_KEY`).                       |
| `RESEND_FROM`                     | Remitente verificado (alias `RESEND_FROM_EMAIL`).          |

### 5.9. Push notifications

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`    | Clave pública VAPID (browser).                             |
| `VAPID_PUBLIC_KEY`                | Idem (server-side).                                        |
| `VAPID_PRIVATE_KEY`               | Clave privada VAPID.                                       |
| `VAPID_SUBJECT`                   | mailto/URL del owner (RFC 8292).                           |

### 5.10. Seguridad

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `TURNSTILE_SECRET_KEY`            | Secret key Cloudflare Turnstile.                           |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`  | Site key (browser).                                        |
| `CRON_SECRET`                     | Bearer que protege `/api/cron/*` y `/api/setup-db`.        |

### 5.11. Observabilidad

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `NEXT_PUBLIC_SENTRY_DSN`          | DSN Sentry para el cliente.                                |

### 5.12. Setup inicial (no se usan en runtime)

| Variable                          | Propósito                                                  |
|-----------------------------------|------------------------------------------------------------|
| `ADMIN_EMAIL`                     | Email del primer owner para `/api/admin/init-account`.     |
| `ADMIN_INITIAL_PASSWORD`          | Password inicial (se rota inmediatamente vía `npm run admin:set-password`). |
| `NEXTAUTH_URL`                    | Solo si se reactivara NextAuth (actualmente no se usa).    |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`     | Número de contacto.                                         |

### 5.13. Generación / rotación

```bash
# Secretos para session/HMAC (32 bytes hex):
openssl rand -hex 32

# Pepper de password (64 bytes hex):
openssl rand -hex 64

# AES-256-GCM key:
openssl rand -hex 32
```

> Rotar `ADMIN_PASSWORD_PEPPER` invalida todos los `password_hash` (los operadores deben re-`npm run admin:set-password`).
> Rotar `ADMIN_SESSION_SECRET` invalida todas las cookies y todos los TOTP secrets cifrados (los operadores deben re-`npm run admin:enable-totp`).
> Rotar `INTEGRATIONS_ENC_KEY` invalida todos los `integrations.credentials` cifrados (re-introducir cada provider en `/admin/configuracion`).

---

## 6. Smoke tests post-deploy

```bash
# 1. Ping público
curl -s https://APP_URL/api/health | jq

# 2. Sitemap
curl -sI https://APP_URL/sitemap.xml | head -1

# 3. Login admin (UI manual)
# Verificar que el branch banner del admin no muestra `INSFORGE_API_KEY missing`.

# 4. Healthcheck admin (requiere sesión)
# Desde /admin/estado verificar que las cards muestran ✅ verde para los providers configurados.
```

Si alguno falla, **rollback inmediato** (sección 4.1). El deploy roto puede coexistir como preview pero nunca debe ser el alias `production`.

---

## 7. Incident playbook resumido

| Síntoma                                        | Acción inmediata                                                              |
|------------------------------------------------|-------------------------------------------------------------------------------|
| 5xx masivo en /api/checkout                    | Promover deploy anterior; revisar `/admin/error-logs`.                         |
| Login admin bloqueado (rate-limit erróneo)     | `POST /api/admin/unlock` con bearer del owner; o `DELETE FROM admin_login_attempts WHERE ip=…`. |
| Webhook MP rechazado (HMAC inválido)           | Verificar que `MP_WEBHOOK_SECRET` coincide con el configurado en Mercado Pago.  |
| `INTEGRATIONS_ENC_KEY` perdida                 | Sin recuperación. Re-introducir cada provider; el GCM auth tag protege contra tampering pero no permite descifrar sin la key.|
| Cron `/api/cron/refresh-rates` no ejecuta      | Vercel dashboard → Crons → ver si el deploy actual lo registró; revisar `vercel.json`. |

---

## 8. Contactos

- **Owner técnico**: Ver `.github/CODEOWNERS`.
- **Soporte InsForge**: dashboard del proyecto → "Contact support".
- **Soporte Vercel**: vercel.com/help (Hobby = best-effort, sin SLA).
