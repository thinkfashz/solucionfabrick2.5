# Catálogo de API

> Última actualización: **2026-05-09** · Generado a partir de `find src/app -name "route.ts"`.

**85 endpoints** · 40 admin (`/api/admin/*`) · 44 públicos (`/api/*`) · 1 cron (`/api/cron/*`).

Todos los handlers viven en App Router (Next.js 15). Cada `route.ts` exporta funciones HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Para un detalle exacto del verbo soportado por endpoint, consulta el archivo apuntado.

---

## 1. Convenciones generales

- **Auth admin**: cookie firmada `fabrick_admin_session` (`src/lib/adminAuth.ts`). Cualquier request a `/api/admin/*` que no sea login/setup pasa por `requireAdminSession()`.
- **Auth pública**: header `Authorization: Bearer <jwt-insforge>` (validado contra `/api/auth/sessions/current` de InsForge desde `src/lib/insforgeAuth.ts`).
- **Rate-limit**: solo en `/api/admin/login` (persistente, tabla `admin_login_attempts`). El resto depende de Vercel + WAF.
- **Errores**: respuestas JSON `{ error: string, code?: string }`. Códigos cerrados conocidos:
  - `ENV_VAR_PRESENT` (POST `/api/admin/integrations`)
  - `TOTP_REQUIRED`, `TOTP_INVALID`, `TOTP_DECRYPT_FAILED` (`/api/admin/login`)
  - `RATE_LIMITED`, `BAD_REQUEST`, `MISCONFIGURED` (varios)

---

## 2. Endpoints públicos

### Salud / diagnóstico

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/health`                 | GET    | Healthcheck simple (200 + timestamp).                    |
| `/api/cms/events`             | POST   | Bus de eventos del CMS (memoria `cmsBus`).               |

### Auth / cuenta del cliente

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/leads`                  | POST   | Capta leads del agente IA y formularios públicos.        |
| `/api/location/reverse`       | GET    | Geocoding inverso (lat/lng → comuna/región).             |

### Catálogo / contenido

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/productos`              | GET    | Lista pública de productos.                              |
| `/api/proyectos`              | GET    | Showroom público de proyectos.                           |
| `/api/materials`              | GET    | Catálogo de materiales públicos.                         |
| `/api/site-structure/[key]`   | GET    | KV de textos editables del sitio.                        |
| `/blog/rss.xml`               | GET    | Feed RSS del blog.                                       |

### Comercio

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/checkout`               | POST   | Inicia checkout (orquesta orders + Mercado Pago).        |
| `/api/checkout/validate`      | POST   | Pre-valida items + reserva inventario.                   |
| `/api/checkout/transfer`      | POST   | Checkout vía transferencia bancaria (sin MP).            |
| `/api/inventory/reserve`      | POST   | Reserva temporal de stock.                               |
| `/api/inventory/release`      | POST   | Libera reserva (timeout/cancel).                         |
| `/api/orders/check/validate`  | POST   | Validación posterior al pago.                            |
| `/api/coupons/validate`       | POST   | Valida un cupón sin canjearlo.                           |
| `/api/favorites`              | GET, POST | Wishlist del usuario.                                  |
| `/api/favorites/[productId]`  | DELETE | Quita un producto de favoritos.                          |
| `/api/quotes`                 | GET, POST | Cotizaciones del usuario.                              |
| `/api/quotes/mine`            | GET    | Cotizaciones del usuario autenticado.                    |
| `/api/quotes/[id]`            | GET    | Detalle de una cotización.                               |
| `/api/cotizaciones`           | POST   | Endpoint público de cotización rápida (formulario).      |
| `/api/presupuesto`            | POST   | Genera presupuesto (helpers todavía sin fusionar).       |
| `/api/invoices/[id]/pdf`      | GET    | PDF de factura.                                          |
| `/api/billing/status`         | GET    | Estado del proveedor de facturación electrónica.         |

### Pagos

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/payments/mercadopago`   | POST   | Crea preferencia de Mercado Pago.                        |
| `/api/payments/mp-status`     | GET    | Status de un pago MP (público, masked).                  |
| `/api/payments/webhook`       | POST   | Webhook MP — verifica HMAC con `PAYMENTS_WEBHOOK_SECRET`/`MP_WEBHOOK_SECRET`. |

### Envíos

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/shipping/quote`         | POST   | Cotiza un envío (Chilexpress, Starken, Correos Chile).    |
| `/api/shipping/tracking/[code]` | GET  | Tracking público por código.                             |

### Currency

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/currency/status`        | GET    | Última hora de actualización de tipos de cambio.          |

### Push (PWA)

| Path                              | Verbos | Descripción                                          |
|-----------------------------------|--------|------------------------------------------------------|
| `/api/push/public-key`            | GET    | Devuelve `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.             |
| `/api/push/subscribe`             | POST   | Persiste suscripción push.                           |
| `/api/push/unsubscribe`           | POST   | Borra suscripción.                                   |
| `/api/push/send`                  | POST   | Envía notificación (auth requerida).                 |
| `/api/pwa/track`                  | POST   | Telemetría PWA → `pwa_events`.                       |

### Meta (publicidad pública)

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/meta/ads`               | GET    | Lee anuncios del Ad Account configurado.                 |
| `/api/meta/ads/create`        | POST   | Crea creativo + ad set + ad.                             |
| `/api/meta/upload`            | POST   | Sube creativo (imagen) al Ads Manager.                   |

### Sync (datos externos → DB)

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/sync`                   | POST   | Sync orquestado.                                         |
| `/api/sync/images`            | POST   | Sync de imágenes (Cloudinary).                           |
| `/api/sync/prices`            | POST   | Sync de precios (proveedor externo).                     |
| `/api/sync/test`              | GET    | Modo test de sync.                                       |

### Setup (uso único)

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/setup-db`               | POST   | Aplica DDL inicial — protegido por `CRON_SECRET`/owner.  |

---

## 3. Endpoints admin (`/api/admin/*`)

### Sesión + auditoría

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/admin/login`            | POST   | Login con password+TOTP+backup-codes. Audit + rate-limit. |
| `/api/admin/logout`           | POST   | Borra cookie de sesión.                                  |
| `/api/admin/me`               | GET    | Perfil del operador autenticado.                         |
| `/api/admin/unlock`           | POST   | Limpia un block del rate-limit (owner only).             |
| `/api/admin/init-account`     | POST   | Inicializa primera cuenta admin si no existe.            |
| `/api/admin/invitations`      | GET, POST | Invitaciones pendientes a operadores.                  |
| `/api/admin/invitations/redeem`| POST  | Canjea invitación → crea `admin_users`.                  |
| `/api/admin/team`             | GET    | Lista de operadores.                                     |

### Catálogo / contenido

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/admin/blog`             | GET, POST | Lista/crea posts.                                      |
| `/api/admin/blog/[id]`        | GET, PUT, DELETE | Detalle/edición.                                |
| `/api/admin/blog/import-md`   | POST   | Importa post desde Markdown.                             |
| `/api/admin/materials`        | GET, POST | Materiales.                                            |
| `/api/admin/materials/[id]`   | GET, PUT, DELETE | Detalle.                                        |
| `/api/admin/media`            | GET, POST | Assets media (Cloudinary).                             |
| `/api/admin/media/[id]`       | DELETE | Borra asset.                                             |
| `/api/admin/home/sections`    | GET, POST | Secciones home.                                        |
| `/api/admin/home/sections/[id]`| PUT, DELETE | Detalle/edición.                                  |
| `/api/admin/home/sections/reorder`| POST | Reordena secciones.                                  |
| `/api/admin/site-structure/[key]` | GET, PUT | KV genérico de textos editables.                  |
| `/api/admin/productos/import-from-url` | POST | Importa producto desde URL externa (caché 24h en plan, no en main). |

### Pedidos / pagos

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/admin/orders/[id]`      | GET, PATCH | Detalle/cambio de status.                            |
| `/api/admin/payments/mp-status`| GET   | Status MP (con detalle, admin only).                     |

### Operación / observabilidad

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/admin/health`           | GET    | Healthcheck del backend (DB + integraciones críticas).   |
| `/api/admin/diagnostico`      | GET    | Diagnóstico extendido (env, schema, conexiones).         |
| `/api/admin/estado`           | GET    | Estado agregado para `/admin/estado`.                    |
| `/api/admin/error-logs`       | GET    | Lista de `admin_error_logs`.                             |
| `/api/admin/error-logs/[id]`  | GET, DELETE | Detalle / dismiss.                                  |
| `/api/admin/test-sentry`      | POST   | Lanza un error de prueba a Sentry.                       |
| `/api/admin/sql`              | POST   | Endpoint raw SQL (limitaciones en memoria `insforge sql limits`). |
| `/api/admin/setup`            | GET, POST | Estado del setup inicial.                              |
| `/api/admin/setup-tables`     | POST   | Aplica `scripts/create-tables.sql`.                      |
| `/api/admin/settings`         | GET, PUT | Lee/escribe `configuracion`.                           |

### Integraciones

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/admin/integrations`     | GET, POST | Lista (con `source: env\|db`, `envManaged`, `envVar`) / upsert por provider. POST devuelve `409 ENV_VAR_PRESENT` si el body intenta sobrescribir un campo gestionado por env. |
| `/api/admin/integrations/test`| POST   | Prueba conectividad de un provider (smoke).              |
| `/api/admin/cloudinary`       | GET, POST | Helpers Cloudinary (firma upload, listar assets).       |

### Vercel (logs/deploys)

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/admin/vercel/deployments`| GET   | Lista deploys recientes (vía `vercelClient`).            |
| `/api/admin/vercel/logs`      | GET    | Logs de runtime/edge filtrables.                         |

### Social

| Path                          | Verbos | Descripción                                              |
|-------------------------------|--------|----------------------------------------------------------|
| `/api/admin/social/posts`     | GET, POST | Programación de posts.                                 |
| `/api/admin/social/publish`   | POST   | Publica inmediato.                                       |
| `/api/admin/social/upload`    | POST   | Sube media para post programado.                         |

---

## 4. Cron jobs (Vercel)

| Path                          | Schedule        | Descripción                                              |
|-------------------------------|-----------------|----------------------------------------------------------|
| `/api/cron/refresh-rates`     | (configurable, 1×/día por límite Hobby) | Refresca `exchange_rates` desde proveedor externo. Protegido por header `Authorization: Bearer $CRON_SECRET`. |

> Vercel Hobby limita los cron a **una vez al día**. Cualquier paso sub-diario rompe el deploy (memoria viva: `vercel cron limits`).

---

## 5. Cómo regenerar este catálogo

```bash
# Lista cruda de routes:
find src/app -name "route.ts" | sort

# Cuenta:
find src/app/api/admin -name "route.ts" | wc -l   # admin
find src/app/api -name "route.ts" -not -path "*admin*" | wc -l  # público + cron
```

Si añades un endpoint nuevo, **edita esta tabla en el mismo PR** y actualiza el contador del bloque inicial de `docs/inventory.md §1`.
