# Manual del operador del panel admin

> Última actualización: **2026-05-13** · Audiencia: operador owner / admin con acceso a `/admin`.

Este documento describe **cómo opera el panel** desde el día a día. No es documentación de API ni de arquitectura — para eso, ver `docs/api.md` y `docs/architecture.md`.

---

## 1. Acceso

URL: `https://APP_URL/admin/login`

### Primer acceso (bootstrap)

1. Verificar que `ADMIN_EMAIL` y `ADMIN_INITIAL_PASSWORD` están seteadas en Vercel.
2. Visitar `/admin/setup`. Si no existe ningún `admin_users`, el endpoint `/api/admin/init-account` crea la primera cuenta owner.
3. Inmediatamente después, **rotar la password**:
   ```bash
   npm run admin:set-password
   ```
   El script lee la nueva password por stdin (nunca por argv/env). Hash: scrypt + `ADMIN_PASSWORD_PEPPER` (memoria `owner password hash`).

### Login normal

1. Email + password.
2. Si la cuenta tiene TOTP habilitado, el endpoint devuelve `TOTP_REQUIRED` y la UI pide el código de 6 dígitos.
3. Si el TOTP falla, se intenta como **backup code** (`XXXX-XXXX-XX`). Cada código es single-use.
4. Después de **5 intentos fallidos por IP** queda bloqueado por 15 minutos (rate-limit persistente en `admin_login_attempts`).

---

## 2. Operaciones de seguridad

### 2.1. Habilitar TOTP

```bash
npm run admin:enable-totp
```

El script imprime la URI `otpauth://...` y un secret base32. Escanear con Authy/Google Authenticator/1Password. El secret se cifra con AES-GCM usando una clave derivada de `ADMIN_SESSION_SECRET` (memoria `totp 2fa`).

### 2.2. Generar backup codes

```bash
npm run admin:generate-backup-codes
```

Imprime **una sola vez** 10 códigos `XXXX-XXXX-XX` (alfabeto Crockford, ~50 bits). Guardarlos en gestor de password. Cada uso los borra del array `admin_users.backup_codes` y la respuesta de login muestra `remaining=N` en el audit (memoria `backup codes`).

### 2.3. Desbloquear una IP atrapada en rate-limit

Como owner autenticado:

```http
POST /api/admin/unlock
{ "ip": "1.2.3.4" }
```

O directamente desde `/admin/sql`:

```sql
DELETE FROM admin_login_attempts WHERE ip = '1.2.3.4';
```

### 2.4. Revisar el audit log

`/admin/sql`:

```sql
SELECT ts, ip, email, outcome, reason
FROM admin_login_audit
ORDER BY ts DESC LIMIT 50;
```

Outcomes posibles (enum cerrado): `success`, `rate_limited`, `unknown_user`, `invalid_password`, `totp_required`, `totp_invalid`, `totp_decrypt_failed`, `not_approved`, `misconfigured`, `bad_request`, `error`.

---

## 3. Módulos del panel

Los 30 módulos viven en `src/app/admin/`. Resumen por área:

### 3.1. Comercial

| Módulo               | Para qué sirve                                                              |
|----------------------|-----------------------------------------------------------------------------|
| `/admin/productos`   | Catálogo (`productos`). Crear/editar, importar desde URL, asignar variantes. |
| `/admin/pedidos`     | Lista de `orders`. Cambiar status, ver items, descargar factura.            |
| `/admin/cotizaciones`| Cotizaciones del cliente público.                                            |
| `/admin/inventario`  | `inventory` por bodega. Scan de SKU.                                         |
| `/admin/materiales`  | Catálogo de materiales para proyectos.                                       |
| `/admin/proyectos`   | Showroom público (`projects`).                                               |
| `/admin/clientes`    | Lista de usuarios InsForge.                                                  |
| `/admin/facturas`    | `invoices`; integración con proveedor SII si `BILLING_PROVIDER` está seteado. |
| `/admin/pagos`       | Estado MP de cada pedido.                                                    |
| `/admin/envios`      | Envíos creados (Chilexpress/Starken/Correos Chile).                          |
| `/admin/entregas`    | Próximas entregas; vista calendario.                                         |
| `/admin/tienda`      | Configuración de la tienda (`configuracion`).                                |

### 3.2. Contenido

| Módulo               | Para qué sirve                                                              |
|----------------------|-----------------------------------------------------------------------------|
| `/admin/blog`        | Posts (`blog_posts`). Importar desde Markdown.                              |
| `/admin/medios`      | Assets en `media_assets` (Cloudinary).                                       |
| `/admin/home`        | Secciones del home reordenables.                                             |
| `/admin/editor`      | Editor visual del CMS.                                                       |
| `/admin/manual`      | Versión interactiva de este manual (cuando el módulo se conecte aquí).       |
| `/admin/publicar`    | Publicar a redes — `/api/admin/social/*`.                                    |
| `/admin/publicidad`  | Crear ads en Meta — `/api/meta/ads/create`.                                  |

### 3.3. Operación

| Módulo               | Para qué sirve                                                              |
|----------------------|-----------------------------------------------------------------------------|
| `/admin/login`       | Login (la única página pública del namespace `/admin`).                     |
| `/admin/configuracion` | Centro de integraciones — campos env-managed bloqueados con badge.        |
| `/admin/equipo`      | Operadores. Invitaciones (`admin_invitations`).                              |
| `/admin/unirse`      | Página pública de canjeo de invitación (`/api/admin/invitations/redeem`).    |
| `/admin/setup`       | Wizard de setup inicial (DB, primer admin).                                  |
| `/admin/sql`         | Consola SQL contra InsForge. Limitaciones en memoria `insforge sql limits`. |
| `/admin/estado`      | Dashboard de salud (DB, integraciones críticas, latencia).                   |
| `/admin/observatory` | Vista interactiva en tiempo real del sistema (3D + HUD + mobile).            |
| `/admin/reportes`    | Reportes agregados (ventas, conversión).                                     |
| `/admin/errores`     | Lista de `admin_error_logs` con filtro y dismiss.                            |
| `/admin/vercel-logs` | Proxy a Vercel REST (`vercelClient`).                                         |

---

## 4. Tareas frecuentes

### 4.1. Crear un producto

1. `/admin/productos` → "Nuevo producto".
2. Llenar nombre, precio, descripción, categoría.
3. (Opcional) "Importar desde URL" → pega URL externa, el endpoint `/api/admin/productos/import-from-url` resuelve título + imagen + precio.
4. Subir imagen principal (Cloudinary firmado vía `/api/admin/cloudinary`).
5. Asignar variantes en la pestaña "Variantes".
6. Guardar.

### 4.2. Cambiar precio masivo

`/admin/sql` con un `UPDATE` parametrizado:

```sql
UPDATE productos
SET precio = ROUND(precio * 1.05),
    updated_at = NOW()
WHERE categoria = 'metalcon';
```

> Verificar el `WHERE` con un `SELECT count(*) FROM productos WHERE …` antes del UPDATE.

### 4.3. Conectar Meta Ads (sin OAuth fusionado)

Hoy: **manual** (token de larga vida). Ver `docs/integrations/README.md` para los aliases env válidos.

1. Ir a Meta Business → Ads → System User → generar token con scope `ads_management`, `pages_read_engagement`, `pages_manage_posts`.
2. Pegar en Vercel como `META_ACCESS_TOKEN`. (Alternativamente, en `/admin/configuracion` → Meta. El env var tiene precedencia y bloquea el campo.)
3. Validar con `GET /api/admin/integrations/test` body `{ provider: 'meta' }`.

### 4.4. Diagnosticar un error de cliente

1. Buscar el error en Sentry (DSN: `NEXT_PUBLIC_SENTRY_DSN`).
2. Si es server-side, también aparece en `admin_error_logs`. Filtrar por path en `/admin/errores`.
3. Cruzar con `/admin/vercel-logs` para ver el contexto del request.

### 4.5. Refrescar tipos de cambio manualmente

```bash
curl -X POST https://APP_URL/api/cron/refresh-rates \
  -H "Authorization: Bearer $CRON_SECRET"
```

Insertará un snapshot nuevo en `exchange_rates` y dejará la fecha visible en `/api/currency/status`.

---

## 5. Trabajos que NO hace el admin (todavía)

- **Multi-tenant**: hoy hay un solo tenant implícito. La columna `tenant_id` no existe en ninguna tabla (memoria `tenants` está en plan).
- **Rotación automática de credenciales**: solo Resend está soportada (memoria `credential rotation`), y Resend todavía no está fusionado.
- **Bulk export de pedidos a CSV**: pendiente. Mientras tanto, `/admin/sql` con `COPY (SELECT …) TO STDOUT WITH CSV` y copy-paste.

---

## 6. Operaciones de emergencia

| Situación                                      | Acción                                                                              |
|------------------------------------------------|-------------------------------------------------------------------------------------|
| Olvidé la password                             | `npm run admin:set-password` desde una sesión con acceso a la DB.                   |
| Perdí el TOTP y los backup codes                | `npm run admin:disable-totp` desde una sesión con acceso a la DB → re-enable después. |
| Sospecha de credenciales filtradas             | Rotar `ADMIN_SESSION_SECRET` (invalida todas las cookies y TOTP secrets) + rotar passwords + regenerar backup codes. |
| Provider externo cambió API y rompió un módulo | Apagar el módulo desactivando su env var. La UI mostrará el provider como "no configurado" en lugar de explotar. |
| Necesito sacar la app de producción            | Vercel dashboard → Deployments → revertir al deploy verde anterior (sección 4 del runbook). |

---

## 7. Para profundizar

- Arquitectura: `docs/architecture.md`
- Modelo de datos: `docs/data-model.md`
- Catálogo de API: `docs/api.md`
- Deploy + variables: `docs/deploy-runbook.md`
- Seguridad del admin (detalle interno): `docs/security-private-mode.md`

---

## 8. Carriers de envío reales {#envio-carriers}

La app incluye drivers completos para **Chilexpress**, **Starken** y **Correos de Chile**. Sin credenciales, el checkout usa las tarifas manuales de `/admin/envios`. Con credenciales, las tarifas son en tiempo real vía API.

### Variables de entorno por carrier

| Carrier | Variables requeridas | Opcional |
|---------|---------------------|---------|
| Chilexpress | `CHILEXPRESS_API_KEY` `CHILEXPRESS_ACCOUNT` | `CHILEXPRESS_BASE_URL` |
| Starken | `STARKEN_USER` `STARKEN_PASS` `STARKEN_RUT_EMISOR` | `STARKEN_BASE_URL` |
| Correos de Chile | `CORREOSCHILE_USER` `CORREOSCHILE_PASS` `CORREOSCHILE_CONTRATO` | `CORREOSCHILE_BASE_URL` |

```bash
# Chilexpress — Developer Portal (https://developers.chilexpress.cl/)
CHILEXPRESS_API_KEY=tu_ocp_apim_subscription_key
CHILEXPRESS_ACCOUNT=tu_numero_de_cuenta

# Starken — portal B2B
STARKEN_USER=tu_usuario
STARKEN_PASS=tu_contraseña
STARKEN_RUT_EMISOR=12345678-9

# Correos de Chile — portal empresas
CORREOSCHILE_USER=tu_usuario
CORREOSCHILE_PASS=tu_contraseña
CORREOSCHILE_CONTRATO=tu_numero_contrato
```

### Arquitectura del módulo

```
src/lib/shipping/
├── carrier.ts              ← Interfaz CarrierDriver + tipos
└── drivers/
    ├── chilexpress.ts      ← REST API + caché de comunas por región
    ├── starken.ts          ← JWT auth + tabla estática de fallback
    └── correoschile.ts     ← Basic→Bearer auth + tarifa 2024 de fallback
```

### Fallback automático

Si el API de un carrier no responde o las credenciales son incorrectas, el driver devuelve cotizaciones basadas en la tabla de tarifas estática publicada. El checkout nunca falla por un carrier caído.

### Verificar estado

Entra a `/admin/envios`: si falta alguna credencial, verás un banner ámbar listando exactamente qué variables configurar. Si todo está listo, verás un banner verde.

---

## 9. Importador de productos

El importador (`/admin/importar`) usa 4 estrategias en cascada para traer productos desde cualquier tienda, incluyendo las protegidas por Cloudflare:

| # | Estrategia | Cuándo se usa |
|---|-----------|---------------|
| 1 | User-Agent desktop (Chrome) | Primera opción — directa |
| 2 | User-Agent móvil (Android) | Fallback cuando UA desktop es bloqueado |
| 3 | Jina.ai Reader (gratuito) | Cloudflare — convierte a Markdown legible |
| 4 | Microlink.io API | Último recurso — metadata estructurada |

Variable opcional para mayor cuota en Microlink Pro:
```bash
MICROLINK_API_KEY=tu_clave_microlink
```

---

## 10. Historial de mejoras

### Mayo 2026 — sesión actual

| Mejora | Descripción |
|--------|-------------|
| Carriers de envío reales | Chilexpress, Starken y Correos de Chile con API real + fallback estático. 18 tests. |
| Banner de estado de carriers | `/admin/envios` muestra variables faltantes en tiempo real. |
| Migración a pnpm | Cambio de npm a pnpm v10.33.0. CI y Vercel actualizados. |
| Fix exhaustive-deps | `searchQuery` faltaba en el useMemo de `filteredProducts` en `/tienda`. |

### Sesión anterior

| Mejora | Descripción |
|--------|-------------|
| Rediseño de /tienda | Hero verde, buscador en tiempo real, categorías con emoji, filtros de precio. |
| Importador anti-Cloudflare | 4 estrategias de bypass en cascada. |
| Panel de configuración ampliado | Logo, WhatsApp, SEO, redes y colores desde el admin. |
| 36+ tablas DB | Esquema completo con productos, pedidos, sesiones, notificaciones, blog y config. |
| 146 endpoints de API | CRUD completo, webhooks de pago, tracking y push notifications. |
- Integraciones: `docs/integrations/README.md`
