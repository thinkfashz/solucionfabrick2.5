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

- ~~**Fase 1.3 — TOTP 2FA** obligatorio (RFC 6238, secret cifrado AES-GCM).~~ ✅ Implementado, ver sección "TOTP 2FA" más abajo.
- **Fase 1.4 — Middleware global** que bloquee toda la app, no solo `/admin`.
- **Fase 1.6 — JWE** para la cookie de sesión en lugar de HMAC firmado.
- ~~**Fase 1.7 — Rate-limit persistente**~~ ✅ Implementado: tabla `admin_login_attempts` + caché en memoria, ver sección "Rate-limit persistente" más abajo.
- **Fase 2 — Vault de secretos** dentro de la BD (`app_secrets`) y password de
  desbloqueo separado para portar la BD entre hostings.

Ver el plan completo en la conversación / PR que introdujo este documento.

---

## TOTP 2FA (Fase 1.3) — segundo factor sobre el login

Una vez configurada la contraseña local, puedes activar **2FA con TOTP**
(Google Authenticator, Authy, 1Password, Bitwarden, …). Es la tercera capa:
sin el código de 6 dígitos generado en tu teléfono, ni siquiera tener tu
contraseña + dump de BD + pepper sirve para entrar.

### Cómo funciona

- Algoritmo: HMAC-SHA1, 6 dígitos, ventana 30 s, tolerancia ±1 paso (60 s
  de skew aceptado en cada lado). Compatible con cualquier app autenticadora.
- Secret de 160 bits (RFC 4226 §4) generado con `crypto.randomBytes`,
  codificado en base32 (RFC 4648), guardado **cifrado AES-256-GCM** en
  `admin_users.totp_secret_enc`. La key AES se deriva con HKDF-SHA256 desde
  `ADMIN_SESSION_SECRET`, así no necesitas otra env var.
- En `/api/admin/login`: si el row tiene `totp_secret_enc`, el endpoint
  exige `body.totp` y rechaza con `code: 'TOTP_REQUIRED'` o
  `code: 'TOTP_INVALID'`. La UI revela el campo de 6 dígitos al ver
  cualquiera de los dos. Verificación constant-time.
- Si `totp_secret_enc` es NULL → la capa se omite. Backward compatible.

Implementación pura: [`src/lib/adminTotp.ts`](../src/lib/adminTotp.ts) +
[`src/lib/adminTotpCrypto.ts`](../src/lib/adminTotpCrypto.ts).

### Habilitar TOTP

```bash
npm run admin:enable-totp
```

El comando:

1. Pide el email del admin (default: `ADMIN_EMAIL`).
2. Genera un secret nuevo y muestra:
   - Una URL `otpauth://totp/...` (para pegar en un generador QR offline o
     en la opción "Add manually" de la app).
   - El secret en base32 agrupado de 4 en 4 caracteres para tipearlo a mano.
   - El **código esperado AHORA** — antes de guardar nada — para que
     verifiques que tu app está sincronizada.
3. Te pide ingresar un código de 6 dígitos desde tu app autenticadora.
4. Solo si el código coincide, encripta el secret y lo persiste. Si falla,
   no se guarda nada y puedes reintentar con un nuevo `npm run`.

A partir del próximo login, el formulario `/admin/login` exigirá tanto la
contraseña como un código de 6 dígitos.

### Deshabilitar TOTP (perdiste el dispositivo)

Desde un host con acceso a la BD (env vars de InsForge configuradas):

```bash
npm run admin:disable-totp
```

Limpia las columnas `totp_secret_enc` y `totp_enabled_at`. El próximo login
volverá a pedir solo email + contraseña. Después puedes volver a ejecutar
`npm run admin:enable-totp` con un dispositivo nuevo.

### Rotar `ADMIN_SESSION_SECRET` afecta a TOTP

La AES key se deriva del `ADMIN_SESSION_SECRET`. Si lo rotas:

1. **Todos los `totp_secret_enc` quedan inservibles** y el endpoint devuelve
   `code: 'TOTP_DECRYPT_FAILED'` (HTTP 500) — login bloqueado por seguridad.
2. Procedimiento: corre `npm run admin:disable-totp` para limpiar la fila
   afectada (incluso aunque no puedas leer el cifrado anterior, la columna
   queda en NULL), luego `npm run admin:enable-totp` para enrolar de nuevo.

Por eso, igual que con el pepper de la contraseña, **rotar el session
secret tiene un costo operativo claro** y es algo deliberado.

---

## Rate-limit persistente (Fase 1.7)

El bloqueo por intentos fallidos (10 errores → 5 minutos de bloqueo)
ahora se persiste en la tabla `admin_login_attempts`, ya no en una
`Map` en memoria que se reseteaba con cada cold start de Vercel.

### Cómo funciona

- Tabla `admin_login_attempts(ip pk, count, blocked_until, updated_at)`
  creada por `scripts/create-tables.sql`.
- Helper puro [`src/lib/adminRateLimitStore.ts`](../src/lib/adminRateLimitStore.ts)
  envuelve la tabla con dos capas:
  1. **Caché en memoria** por lambda — atrapa ráfagas sin hammer al DB.
  2. **DB** — fuente de verdad entre cold starts.
- `adminAuth.ts` expone las mismas funciones (`isRateLimited`,
  `recordFailedAttempt`, `clearFailedAttempts`, `blockedSecondsRemaining`)
  pero ahora son `async` y delegan al store.

### Comportamiento defensivo

- **Tabla faltante** (`Could not find the table…`) → degradación silenciosa
  a la capa en memoria. La instalación nueva no se brickea antes de la
  migración.
- **Error transitorio** (`ECONNRESET`, etc.) → fail-open con log a
  `console.error`. Defense-in-depth: contraseña + TOTP siguen activos,
  así que un hiccup de DB no bloquea logins legítimos.
- **IP `'unknown'`** (sin `x-real-ip`/`x-forwarded-for`) → no se persiste
  para evitar que un cliente mal configurado bloquee a todos los demás
  detrás del mismo gateway. La capa en memoria sí aplica.
- **Bloqueo expirado** se borra de forma diferida en el primer `read`
  posterior, así la tabla no crece indefinidamente.

### ¿Por qué fail-open en lugar de fail-closed?

El rate-limit es **cortesía con el backend de auth**, no el control de
seguridad primario. Las capas reales son la contraseña con scrypt+pepper
y TOTP RFC 6238. Si el DB está caído, fail-closed denegaría servicio a
los administradores legítimos sin agregar protección real (un atacante
que haya pasado las dos capas anteriores ya tiene credenciales válidas).
Esta decisión está documentada en el comentario de cabecera del helper.

---

## Auditoría de logins (Fase 1.5)

Cada rama terminal de `/api/admin/login` deja una fila en
`admin_login_audit` para que puedas reconstruir qué pasó tras un brute-
force, una entrada inesperada o un usuario que dice "no fui yo".

### Tabla y outcomes

```
admin_login_audit(
  id         bigserial PK,
  ts         timestamptz default now(),
  ip         text NOT NULL,
  email      text,                -- truncado a 320 chars (RFC 5321)
  outcome    text NOT NULL,       -- enum cerrado, ver abajo
  reason     text,                -- truncado a 500 chars
  user_agent text                 -- truncado a 500 chars
)
```

| `outcome` | Cuándo se emite |
|---|---|
| `success` | Login completo, cookie firmada emitida. `reason = "rol=<rol>"` |
| `rate_limited` | IP bloqueada por la Fase 1.7. `reason = "<n>s remaining"` |
| `unknown_user` | Pasó InsForge auth pero el email no está en `admin_users` |
| `invalid_password` | Falló InsForge auth **o** la capa scrypt+pepper |
| `totp_required` | Faltó el campo `totp` en el body para una cuenta con 2FA |
| `totp_invalid` | Código TOTP de 6 dígitos no coincide |
| `totp_decrypt_failed` | `ADMIN_SESSION_SECRET` rotó o la fila fue manipulada |
| `not_approved` | `admin_users.aprobado = false` y no es la bootstrap admin |
| `misconfigured` | Faltan env vars críticas (e.g. `ADMIN_SESSION_SECRET`) |
| `bad_request` | JSON inválido o email/password vacíos |
| `error` | Excepción no capturada — `reason` lleva el mensaje |

### Cómo leer la tabla

Desde `/admin/sql`:

```sql
-- Últimos 100 eventos
SELECT ts, ip, email, outcome, reason
  FROM admin_login_audit
 ORDER BY ts DESC
 LIMIT 100;

-- Brute-force candidates en las últimas 24h
SELECT ip, count(*) AS attempts
  FROM admin_login_audit
 WHERE ts > now() - interval '24 hours'
   AND outcome IN ('invalid_password','totp_invalid','rate_limited','unknown_user')
 GROUP BY ip
 ORDER BY attempts DESC;

-- ¿Quién entró exitosamente esta semana?
SELECT ts, ip, email, user_agent
  FROM admin_login_audit
 WHERE ts > now() - interval '7 days'
   AND outcome = 'success'
 ORDER BY ts DESC;
```

### Garantías de seguridad y privacidad

- **Best-effort**: si la tabla no existe o la BD está caída, el helper
  hace no-op silencioso. **Una falla de auditoría jamás bloquea un
  login legítimo.**
- **Bounded payload**: email / reason / UA están truncados a tamaños
  razonables para que un atacante no pueda inflar filas.
- **No guarda passwords ni TOTP secrets**: nunca. `reason` es texto
  curado por la ruta del login, no input arbitrario del cliente.
- **`outcome` es un enum cerrado** (TypeScript `LoginOutcome`): añadir
  uno nuevo es un cambio deliberado, no una cadena libre, así los
  reportes son grep-ables.

---

## TOTP Backup Codes (Fase 1.3b)

Si pierdes el authenticator (teléfono perdido / borrado / robado), los
backup codes son la única forma de volver a entrar sin SSH al hosting.

### Generar el set inicial

Una vez que el admin tiene TOTP habilitado:

```bash
npm run admin:generate-backup-codes
```

El script:

1. Te pide el email del admin (default = `ADMIN_EMAIL`).
2. Verifica que TOTP esté habilitado (los backup codes solo son válidos
   como recovery del segundo factor — no se generan para cuentas sin 2FA).
3. Si ya hay codes, te pide confirmar el reemplazo.
4. Genera **10 códigos** del tipo `XXXX-XXXX-XX` (alfabeto Crockford,
   sin I/L/O/U para evitar confusión visual al transcribir).
5. Persiste **solo los hashes** scrypt+pepper a `admin_users.backup_codes`.
6. Imprime los plaintexts una única vez. Después de eso son irrecuperables.

**Guárdalos en tu password manager o impresos en sobre cerrado.**

### Cómo usarlos

En `/admin/login`, en el campo TOTP escribe el código completo (con o
sin guiones, mayúsculas o minúsculas) en lugar de los 6 dígitos del
authenticator. La ruta:

1. Intenta primero como TOTP de 6 dígitos.
2. Si falla y el campo tiene forma de backup code (10 chars
   alfanuméricos tras normalizar), prueba contra los hashes guardados.
3. En match: elimina ese hash del array (single-use), persiste y emite
   sesión.
4. La fila de auditoría queda como `outcome=success` con
   `reason='rol=admin; via=backup_code; remaining=N'` para distinguirla
   de un login con TOTP normal.

### Garantías

- **Single-use**: tras consumir un código, su hash desaparece del array.
  Reintentar el mismo código produce `TOTP_INVALID`.
- **Pepper-protected**: los hashes usan `ADMIN_PASSWORD_PEPPER`. Un dump
  de `admin_users` por sí solo no permite brute-force; el atacante
  también necesita la pepper del entorno de aplicación.
- **No se enumera la rama**: respuesta idéntica a `TOTP_INVALID` cuando
  un atacante prueba combinaciones — no puede saber si alguna iteración
  está pegándole al branch de backup codes.
- **Rotación equivalente**: rotar `ADMIN_PASSWORD_PEPPER` invalida tanto
  el password hash como todos los backup codes (consistente con el
  modelo de password).

### Cuándo regenerar

- Cuando consumas la mitad o más (`reason='via=backup_code; remaining=4'`
  en el audit log es buen disparador).
- Si sospechas que el papel/manager fue comprometido — re-ejecutar el
  script invalida automáticamente el set anterior.
- Si rotas `ADMIN_PASSWORD_PEPPER`: los hashes viejos quedan inutilizables.
