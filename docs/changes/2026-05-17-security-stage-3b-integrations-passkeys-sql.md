# Seguridad base · Etapa 3B · Integraciones, passkeys y SQL

Fecha: 2026-05-17
Rama: `feature/security-foundation-env-permissions`

## Objetivo

Completar la aplicación progresiva de permisos centrales en endpoints críticos que quedaron pendientes en la Etapa 3.

## Cambios aplicados en esta etapa

### 1. Test de Resend protegido

Archivo:

```txt
src/app/api/admin/integrations/test-resend/route.ts
```

Antes:

- Leía y verificaba sesión manualmente.
- Bloqueaba viewer de forma local.

Ahora:

- Usa `requireAdminPermission()` desde `src/lib/adminPermissions.ts`.
- Requiere:

```txt
integrations:test
```

Mantiene:

- lectura de credenciales desde `getResendCredentials()`;
- prueba real contra Resend;
- auditoría con `recordCredentialAudit()`;
- no expone secretos al frontend.

### 2. Test de Cloudinary protegido

Archivo:

```txt
src/app/api/admin/integrations/test-cloudinary/route.ts
```

Antes:

- Leía y verificaba sesión manualmente.
- Bloqueaba viewer de forma local.

Ahora:

- Usa `requireAdminPermission()` desde `src/lib/adminPermissions.ts`.
- Requiere:

```txt
integrations:test
```

Mantiene:

- lectura de credenciales desde `getCloudinaryCredentials()`;
- prueba real contra Cloudinary Admin API `/usage`;
- auditoría con `recordCredentialAudit()`;
- no expone secretos al frontend.

## Cambios NO aplicados y motivo

### 1. Ruta principal de integraciones

Archivo pendiente:

```txt
src/app/api/admin/integrations/route.ts
```

Motivo:

Este archivo es grande y sensible. Maneja:

```txt
credenciales cifradas
merge DB/env
validaciones live contra Cloudinary
Meta
Google Ads
Vercel
TikTok
MercadoLibre
MercadoPago
Stripe
WhatsApp
registro en integration_audit
```

No se reescribió en esta etapa para evitar romper el flujo de credenciales ya funcional.

Pendiente recomendado:

```txt
GET    -> integrations:read
POST   -> integrations:manage
DELETE -> integrations:delete o integrations:manage
```

La forma segura de hacerlo es una mini-etapa específica: `Etapa 3C · Integrations main route`, editando solo autorización inicial y preservando todo el cuerpo actual.

### 2. Lista de passkeys

Archivo pendiente:

```txt
src/app/api/admin/passkeys/route.ts
```

Se intentó proteger con:

```txt
passkeys:read
```

pero la herramienta bloqueó la modificación por seguridad. No se forzó el cambio.

Pendiente recomendado:

```txt
GET /api/admin/passkeys -> passkeys:read
```

### 3. Rename/Delete de passkeys

No se encontraron rutas dinámicas claras por búsqueda para:

```txt
/api/admin/passkeys/[id]
rename passkey
delete passkey
```

Pendiente:

- Ubicar si la UI llama otro endpoint.
- No crear rutas nuevas hasta confirmar la implementación real.

### 4. SQL

No se encontró ruta real:

```txt
src/app/api/admin/sql/route.ts
/api/admin/sql
```

Pendiente:

- Buscar implementación real si existe en otro nombre.
- No crear ruta SQL nueva dentro de este PR sin confirmación.
- Si existe ejecución SQL, debe requerir:

```txt
sql:execute
```

## Estado acumulado hasta 3B

Completado:

```txt
products -> permisos centrales
team -> permisos centrales
passkeys register/options -> permisos centrales
passkeys register/verify -> permisos centrales
integrations/test-resend -> permisos centrales
integrations/test-cloudinary -> permisos centrales
```

Pendiente:

```txt
integrations/route.ts principal
passkeys/route.ts list
passkeys rename/delete si existen
sql route si existe
adminAudit.ts
auditoría acciones admin
superadmin requiere passkey
backup codes
```

## Regla para futuras IAs

No duplicar helpers. Usar:

```txt
src/lib/adminPermissions.ts
src/lib/adminCredentialAudit.ts
src/lib/integrationCredentials.ts
src/lib/adminPasskeys.ts
src/lib/adminApi.ts
```

No tocar rutas pre-login de passkeys como si fueran rutas autenticadas:

```txt
/api/admin/passkeys/auth/options
/api/admin/passkeys/auth/verify
```

Esas deben seguir funcionando antes de que exista sesión admin porque son parte del login con huella / Face ID.
