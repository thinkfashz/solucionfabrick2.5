# Validación PR #204 · Demo 24h y Perfil Admin

Este documento acompaña el PR `feat: make admin demo access and profile management real`.

## Objetivo

Validar que el flujo sea real y no estático:

- creación de link demo 24h;
- acceso viewer temporal;
- bloqueo por IP en el primer acceso;
- auditoría de accesos en base de datos;
- notificación por Resend si está configurado;
- contador de expiración dentro del admin demo;
- feedback de usuario demo guardado en base de datos;
- perfil admin editable;
- avatar guardado en Cloudinary si está configurado.

## Migración requerida

Ejecutar en InsForge/Postgres antes del preview funcional:

```sql
scripts/create-admin-demo-profile-tables.sql
```

Tablas esperadas:

- `demo_tokens`
- `demo_access_audit`
- `demo_session_events`
- `demo_feedback`
- `admin_profiles`

## Validación técnica

Ejecutar antes de merge:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Validación funcional

### 1. Links demo

1. Entrar a `/admin/equipo/demo`.
2. Crear un link demo 24h.
3. Confirmar que aparece en la lista.
4. Copiar el link.
5. Confirmar en base de datos que existe un registro en `demo_tokens`.

### 2. Primer acceso demo

1. Abrir el link en navegador invitado.
2. Confirmar que entra en modo viewer.
3. Confirmar cookies:
   - `sf_demo_mode`
   - `sf_demo_sid`
   - `sf_demo_expires_at`
4. Confirmar que `demo_tokens.accesos` aumenta.
5. Confirmar que se guarda:
   - `locked_ip`
   - `ultimo_ip`
   - `ultimo_user_agent`
   - `ultimo_dispositivo`
6. Confirmar registro en `demo_access_audit`.

### 3. Bloqueo por IP

1. Intentar abrir el mismo link desde otra IP.
2. Confirmar que la API responde bloqueo.
3. Confirmar registro `blocked_ip_mismatch` en `demo_access_audit`.

### 4. Feedback demo

1. En el modo demo, abrir el formulario de feedback.
2. Enviar comentario.
3. Confirmar registro en `demo_feedback`.

### 5. Perfil admin

1. Entrar a `/admin/perfil`.
2. Editar nombre, teléfono, bio y redes.
3. Guardar.
4. Confirmar registro en `admin_profiles`.
5. Subir avatar.
6. Confirmar si se guarda en Cloudinary o como fallback en base de datos.

## Variables / integraciones

Resend debe venir desde el helper existente:

```ts
getResendCredentials({ preferDb: true })
```

Cloudinary debe venir desde el helper existente:

```ts
getCloudinaryCredentials({ preferDb: true })
```

No se deben crear credenciales duplicadas.

## Deploy

Este PR debe mantenerse como draft hasta que:

1. la migración esté ejecutada;
2. el build pase;
3. el preview funcione;
4. el flujo demo/perfil sea probado manualmente.
