# Seguridad base · Etapa 4 · Auditoría de acciones admin

Fecha: 2026-05-17
Rama: `feature/security-foundation-env-permissions`

## Objetivo

Crear una capa común para registrar acciones críticas del panel admin sin romper endpoints existentes y sin guardar secretos en logs.

## Archivo creado

```txt
src/lib/adminAudit.ts
```

## Qué hace adminAudit.ts

Expone helpers best-effort:

```txt
recordAdminAudit()
recordAdminFailure()
recordAdminBlocked()
```

Registra en la tabla esperada:

```txt
admin_action_audit
```

Campos usados:

```txt
actor_email
actor_role
tenant_id
action
resource
resource_id
status
ip
user_agent
metadata
```

## Diseño de seguridad

El helper:

1. Nunca rompe una acción admin si la tabla de auditoría no existe todavía.
2. Redacta campos sensibles en metadata.
3. No guarda contraseñas, tokens ni API keys.
4. Usa `insforgeAdmin` server-side.
5. Guarda IP y user agent cuando la request está disponible.

Campos redactados automáticamente si aparecen en metadata:

```txt
password
temporaryPassword
api_key
apiKey
api_secret
secret
token
access_token
refresh_token
```

También redacta cualquier clave que contenga:

```txt
password
secret
token
api_key
apikey
```

## Endpoints auditados en esta etapa

### 1. Productos

Archivo:

```txt
src/app/api/admin/products/route.ts
```

Audita:

```txt
PATCH -> update products
DELETE -> delete products
fallos de lectura/update/delete
```

Metadata guardada:

```txt
patch permitido: activo, featured
error si falla InsForge
resourceId = product id
```

### 2. Equipo

Archivo:

```txt
src/app/api/admin/team/route.ts
```

Audita:

```txt
POST -> create team user
PATCH approve -> update team
PATCH reject -> delete team
PATCH set_role -> update team
fallos de signUp, signIn, upsert y updates
```

No guarda contraseña temporal en metadata.

### 3. Passkeys registration

Archivo:

```txt
src/app/api/admin/passkeys/register/verify/route.ts
```

Audita:

```txt
passkey creada correctamente
challenge faltante
challenge inválido
verificación WebAuthn fallida
error inesperado guardando passkey
```

Metadata guardada:

```txt
nombre del dispositivo
tenantId
deviceType
backedUp
transports
aaguid
rpID/origin solo en fallo de verificación
```

No guarda llave pública ni datos biométricos. La app nunca ve huella, cara o iris.

## Tabla recomendada

Si la tabla no existe, crear en InsForge/Postgres:

```sql
create table if not exists public.admin_action_audit (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_role text,
  tenant_id text,
  action text not null,
  resource text not null,
  resource_id text,
  status text not null default 'success',
  ip text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_action_audit_actor on public.admin_action_audit(actor_email);
create index if not exists idx_admin_action_audit_resource on public.admin_action_audit(resource, resource_id);
create index if not exists idx_admin_action_audit_created_at on public.admin_action_audit(created_at desc);
```

## Pendiente

Auditar en etapas siguientes:

```txt
integrations/route.ts principal
credenciales modificadas desde DB
passkeys list/delete/rename si aparecen rutas
SQL si existe endpoint real
configuración del sistema
pagos/webhooks
contenido/blog
```

## Estado tras Etapa 4

Completado:

```txt
src/lib/adminAudit.ts creado
productos auditados
equipo auditado
registro de passkeys auditado
metadata sensible redactada
```

Pendiente:

```txt
superadmin requiere passkey
backup codes
CI/CD
health check
Sentry completo
```

## Regla para futuras IAs

No crear otro helper de auditoría. Usar:

```txt
src/lib/adminAudit.ts
```

Si se necesita auditar algo nuevo, añadir llamadas `recordAdminAudit()` o `recordAdminFailure()` en el endpoint correspondiente y documentarlo en `docs/changes`.
