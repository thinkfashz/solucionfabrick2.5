# Modo privado: contraseña de propietario blindada con cripto

Este documento describe la **Fase 1** del plan de privatización de Soluciones
Fabrick: añadir una capa de verificación local de contraseña sobre la auth de
InsForge, de modo que un atacante con acceso al panel/BD de InsForge **no pueda
entrar** sin además tener el _pepper_ que vive solo en las variables de entorno
del hosting.

## Modelo de amenaza que cubre

| Adversario tiene… | ¿Puede entrar a `/admin`? |
|---|---|
| URL pública del panel | ❌ |
| Dump completo de la base de datos InsForge | ❌ — el `password_hash` no sirve sin el pepper |
| Acceso a la consola de InsForge (creación de usuarios) | ❌ — falta la verificación local |
| Tu password de Vercel (env vars) **+** dump de BD | ❌ — falta tu contraseña real |
| Todo lo anterior **+** tu contraseña real | ✅ (pretendido) |

## Cómo funciona

1. `/api/admin/login` sigue llamando primero a `insforge.auth.signInWithPassword`.
2. Si el usuario tiene un `password_hash` en la tabla `admin_users`, el handler
   también verifica localmente la contraseña con scrypt + pepper. Si no hay
   `password_hash`, la capa se omite (compatibilidad hacia atrás).
3. **Ambas verificaciones deben pasar.**

### Algoritmo

- **scrypt** (RFC 7914), nativo en Node, sin dependencias nuevas.
- Parámetros OWASP 2024: `N=2^17 (131072), r=8, p=1`. Memoria ~128 MiB,
  ~250 ms por intento en CPU moderna.
- Salt aleatorio de 16 bytes por hash; clave derivada de 32 bytes.
- **Pepper** (`ADMIN_PASSWORD_PEPPER`) concatenado al password antes del
  hash → un dump de la BD aislado es inservible.
- Formato almacenado, autocontenido: `scrypt$N$r$p$salt_b64$hash_b64`.

Implementación: [`src/lib/adminPasswordHash.ts`](../src/lib/adminPasswordHash.ts).

## Bootstrap (una sola vez)

### 1. Generar el pepper

```bash
openssl rand -base64 48
```

Guarda el valor en tu password manager. **Nunca** lo commitees ni lo metas en
la BD: el objetivo del pepper es vivir _fuera_ de la BD.

### 2. Configurar las env vars

En tu hosting (Vercel → Settings → Environment Variables, marcadas para
Production y Preview) y en `.env.local` para desarrollo:

```
ADMIN_PASSWORD_PEPPER=<el valor generado>
ADMIN_SESSION_SECRET=<otra cadena random distinta, openssl rand -base64 48>
```

### 3. Aplicar la migración SQL

`scripts/create-tables.sql` ya incluye el `ALTER TABLE admin_users ADD COLUMN
IF NOT EXISTS password_hash …` desde este PR — ejecuta la sección "admin_users:
layered owner password" desde `/admin/sql` o tu runner habitual de migraciones.

### 4. Definir tu contraseña local

```bash
npm install
npm run admin:set-password
```

El comando:

- Te pregunta el email (por defecto `ADMIN_EMAIL`).
- Pide la contraseña dos veces, **sin echo** en pantalla — no aparece en el
  historial de bash, ni en `argv`, ni en variables de entorno.
- Hace scrypt+pepper y hace UPSERT del `password_hash` en `admin_users`.

Mínimo 12 caracteres. Recomendado: passphrase de 4+ palabras o salida de un
gestor de contraseñas (≥20 chars con símbolos).

### 5. Verifica

Cierra cualquier sesión activa y entra de nuevo en `/admin/login`. Si:

- ✅ Email + password correctos → entras (la app valida en InsForge **y**
  contra el hash local).
- ❌ Password mal **o** falta el pepper en el server → 401 / 500 con mensaje
  claro indicando qué env var falta.

## Rotación de la contraseña

Vuelve a correr `npm run admin:set-password`. El comando hace `UPDATE` si la
fila ya existe. Las sesiones activas siguen vivas hasta que expire la cookie
(8 h) o reinicies `ADMIN_SESSION_SECRET`.

## Rotación del pepper

Esto **invalida todos los `password_hash` existentes**. Procedimiento:

1. Genera un pepper nuevo y actualiza la env var.
2. Cada admin debe correr `npm run admin:set-password` de nuevo para regenerar
   su hash con el pepper nuevo.
3. Mientras tanto, los logins fallarán con 401 — esto es esperado.

## Próximas fases (no incluidas en este PR)

- **Fase 1.3 — TOTP 2FA** obligatorio (RFC 6238, secret cifrado AES-GCM).
- **Fase 1.4 — Middleware global** que bloquee toda la app, no solo `/admin`.
- **Fase 1.6 — JWE** para la cookie de sesión en lugar de HMAC firmado.
- **Fase 1.7 — Rate-limit persistente** (la versión in-memory actual se
  resetea con cada cold start serverless).
- **Fase 2 — Vault de secretos** dentro de la BD (`app_secrets`) y password de
  desbloqueo separado para portar la BD entre hostings.

Ver el plan completo en la conversación / PR que introdujo este documento.
