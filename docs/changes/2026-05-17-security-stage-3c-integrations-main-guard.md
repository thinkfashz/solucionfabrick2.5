# Seguridad base · Etapa 3C · Protección de integraciones principales

Fecha: 2026-05-17
Rama: `feature/security-foundation-env-permissions`

## Objetivo

Proteger la ruta principal de integraciones sin reescribir `src/app/api/admin/integrations/route.ts`, porque ese archivo maneja credenciales cifradas y validaciones live contra proveedores externos.

## Archivo modificado

```txt
src/middleware.ts
```

## Por qué se protegió desde middleware

La ruta principal:

```txt
src/app/api/admin/integrations/route.ts
```

es grande y sensible. Contiene:

```txt
cifrado y descifrado de credenciales
merge DB/env
validación live Cloudinary
validación live Meta
validación live Google Ads
validación live Vercel
validación live TikTok
validación live MercadoLibre
validación live MercadoPago
validación live Stripe
validación live WhatsApp
auditoría integration_audit
```

Reescribirla completa en esta etapa aumentaba el riesgo de romper credenciales, Cloudinary, Resend o proveedores externos. Por eso se aplicó un guard incremental en middleware.

## Reglas añadidas

Para cualquier ruta bajo:

```txt
/api/admin/integrations
/api/admin/integrations/*
```

ahora se exige sesión admin válida.

Reglas específicas:

```txt
viewer -> bloqueado en toda la zona de integraciones
GET /api/admin/integrations -> requiere sesión admin válida y no viewer
POST /api/admin/integrations -> solo superadmin
DELETE /api/admin/integrations -> solo superadmin
/api/admin/integrations/test-resend -> ya protegido en Etapa 3B con integrations:test
/api/admin/integrations/test-cloudinary -> ya protegido en Etapa 3B con integrations:test
```

## Qué se preservó

No se tocó el archivo grande de integraciones. Se preservó:

```txt
validación de proveedores
cifrado de credenciales
merge de valores DB/env
masking de secretos
integration_audit existente
mensajes de error específicos
```

## Pendiente para etapa futura

Cuando el sistema esté más estable, se puede hacer una etapa de refactor controlado:

```txt
Etapa futura: mover requireAdminPermission() dentro de src/app/api/admin/integrations/route.ts
```

Para eso se recomienda:

1. Extraer validadores por proveedor a archivos pequeños.
2. Extraer `getClient()` a helper compartido.
3. Reemplazar `requireAdmin()` local por `requireAdminPermission()`.
4. Mantener exactamente las mismas respuestas de error.
5. Probar Cloudinary, Resend, Vercel y MercadoPago antes de merge.

## Estado tras 3C

Completado:

```txt
integrations main protegida desde middleware
viewer bloqueado en integraciones
POST/DELETE principal de integraciones limitado a superadmin
lógica interna de credenciales preservada
```

Pendiente:

```txt
passkeys list endpoint protegido dentro de route.ts
passkeys rename/delete si aparecen rutas dinámicas
adminAudit.ts
auditoría global de acciones admin
superadmin requiere passkey
backup codes
```

## Regla para futuras IAs

No reescribir `src/app/api/admin/integrations/route.ts` de golpe. Si se modifica, hacerlo por extracción progresiva y con pruebas por proveedor.
