# Seguridad base · Etapa 1 · Env centralizado

Fecha: 2026-05-17
Rama: `feature/security-foundation-env-permissions`
PR objetivo: `security-foundation-env-permissions`

## Objetivo

Cerrar la base de seguridad sin reconstruir módulos existentes. Esta etapa no toca passkeys, permisos por API ni auditoría de acciones todavía. Solo fortalece la validación central de variables críticas para que la app no opere mal configurada en producción.

## Estado previo encontrado

Ya existía `src/lib/env.ts` con validación avanzada de variables. No se creó un archivo duplicado ni se movió la arquitectura.

También ya existen piezas reales de seguridad:

- `src/lib/adminAuth.ts` para sesión admin firmada.
- `src/middleware.ts` para proteger rutas `/admin` y bloquear acciones de viewer/demo.
- `src/lib/adminPasskeys.ts` para WebAuthn/Passkeys.
- `/admin/login` con botón Huella / Face ID.
- `/admin/seguridad` para registrar passkeys.
- `/admin/sesiones` para auditoría de sesiones e IPs.
- PR #183 ya mergeado: menú móvil, sesiones superadmin, Resend/Cloudinary desde DB cifrada y auditoría de credenciales.

## Cambio realizado en esta etapa

Archivo modificado:

```txt
src/lib/env.ts
```

Cambios:

1. Se mantuvo `src/lib/env.ts` existente.
2. Se corrigió la validación de cifrado de integraciones para aceptar `INTEGRATIONS_ENC_KEY` o `ENCRYPTION_KEY`, sin exigir ambas al mismo tiempo.
3. Se añadió validación explícita de `ADMIN_INIT_SECRET` en producción.
4. Se añadió validación explícita de `WEBAUTHN_ORIGIN`.
5. Se añadió advertencia de producción si falta `WEBAUTHN_RP_ID`.
6. Se cambió email provider de error fatal a advertencia cuando no hay env fallback, porque Resend puede venir desde DB cifrada.
7. Se cambió MercadoPago de error fatal a advertencia para no bloquear producción si pagos reales aún no están activos.
8. Se añadieron accessors typed para:
   - `ADMIN_INIT_SECRET`
   - `INTEGRATIONS_ENC_KEY`
   - `NEXT_PUBLIC_INSFORGE_URL`
   - `NEXT_PUBLIC_INSFORGE_ANON_KEY`
   - `WEBAUTHN_RP_ID`
   - `WEBAUTHN_ORIGIN`

## Por qué se hizo así

La app ya tiene módulos reales. La regla para esta fase es no reconstruir ni duplicar. El objetivo es crear una base segura reutilizable para las siguientes etapas.

Esta validación central permitirá que futuras etapas importen desde `src/lib/env.ts` en vez de leer `process.env` directamente.

## Variables críticas para producción

Obligatorias:

```txt
ADMIN_SESSION_SECRET
ADMIN_PASSWORD_PEPPER
ADMIN_INIT_SECRET
NEXT_PUBLIC_INSFORGE_URL
NEXT_PUBLIC_INSFORGE_ANON_KEY
INSFORGE_API_KEY
INTEGRATIONS_ENC_KEY o ENCRYPTION_KEY
```

Recomendadas para Passkeys/WebAuthn:

```txt
WEBAUTHN_RP_ID=solucionesfabrick.com
WEBAUTHN_ORIGIN=https://www.solucionesfabrick.com
```

Opcionales/según módulo:

```txt
RESEND_API_KEY
SMTP_HOST
SMTP_USER
SMTP_PASS
CLOUDINARY_API_SECRET
MERCADO_PAGO_ACCESS_TOKEN
NEXT_PUBLIC_MP_PUBLIC_KEY
NEXT_PUBLIC_SENTRY_DSN
CRON_SECRET
NEWSLETTER_SECRET
TURNSTILE_SECRET_KEY
```

## Próxima etapa

Etapa 2 debe crear un helper central de permisos sin mover lo existente:

```txt
src/lib/adminPermissions.ts
```

Ese helper debe definir roles y acciones reutilizables para aplicar progresivamente en:

```txt
/api/admin/passkeys/*
/api/admin/team
/api/admin/products
/api/admin/integrations/*
/api/admin/sql
```

## Regla para futuras IAs

No reconstruir módulos. Antes de crear archivos nuevos, revisar si ya existe:

```txt
src/lib/adminAuth.ts
src/lib/adminPasskeys.ts
src/lib/env.ts
src/lib/integrationCredentials.ts
src/lib/adminCredentialAudit.ts
src/middleware.ts
src/app/admin/seguridad/page.tsx
src/app/admin/login/page.tsx
src/app/admin/sesiones/page.tsx
```

Si una mejora necesita modificar esos módulos, hacerlo de forma incremental y documentarlo aquí en `docs/changes`.

## Pendiente para cerrar seguridad real

1. Crear `src/lib/adminPermissions.ts`.
2. Aplicar permisos por API, no solo por UI.
3. Crear `src/lib/adminAudit.ts` para auditoría de acciones admin.
4. Auditar passkeys, credenciales, usuarios y productos.
5. Crear modo `superadmin requiere passkey`.
6. Crear backup codes.
7. Añadir tests/CI en etapa posterior.
