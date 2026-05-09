# Guía de Integración: Vault de Credenciales Cifradas

**Soluciones Fabrick**  
*Sistema de almacenamiento seguro para credenciales de terceros con revelado temporal protegido por contraseña.*

---

## Resumen Ejecutivo

El Vault es un módulo de seguridad integrado en el panel de administración que:
- Cifra credenciales en reposo usando AES-256-GCM
- Protege el acceso mediante sesión de admin + contraseña numérica (ADMIN_VIEW_PASSWORD)
- Limpia credenciales de la memoria después de 30 segundos
- Audita cada revelado en la tabla `integration_audit`
- Soporta múltiples proveedores (Meta, Google, Stripe, Mercado Pago, etc.)

---

## Configuración en Vercel / InsForge

### Variables de Entorno Requeridas

1. **ENCRYPTION_KEY** (recomendado) o **INTEGRATIONS_ENC_KEY**
   - 32 bytes en base64 (44 caracteres con padding) o hexadecimal (64 caracteres)
   - Generar con: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
   - Ejemplo: `fY3xL8pQ2nV9mK7jB4dR6sW1aT5gH0cX2eY8wZ+/vU==`

2. **ADMIN_VIEW_PASSWORD**
   - Contraseña de 6-32 caracteres alfanuméricos para la UI de revelado
   - No se almacena en la DB; solo se valida en servidor
   - Ejemplo: `vault2024fabrick`

3. **INTEGRATIONS_ENC_KEY** (solo si no usas ENCRYPTION_KEY)
   - Alternativa heredada, respeta ENCRYPTION_KEY si ambas existen
   - Se mantiene para compatibilidad con proyectos existentes

### Pasos en Vercel

1. Abre el proyecto en **Settings → Environment Variables**
2. Crea `ENCRYPTION_KEY` con el valor base64 generado
3. Crea `ADMIN_VIEW_PASSWORD` con tu contraseña
4. Redeploy: `vercel --prod`

### Pasos en InsForge Dashboard

1. Navega al tablero de variables de entorno
2. Agrega `ENCRYPTION_KEY` (base64)
3. Agrega `ADMIN_VIEW_PASSWORD`
4. Guarda y redeploy tu función edge

---

## Uso en el Panel Admin

### Acceso al Centro de Integraciones

1. Inicia sesión como admin en `/admin`
2. Navega a **Centro de integraciones** desde el menú
3. Verás una lista de proveedores (Meta, Google, Stripe, Mercado Pago, etc.)

### Guardar Credenciales

1. Selecciona un proveedor (ej. Mercado Pago)
2. Rellena los campos requeridos
3. Haz clic en **Conectar** (o **Actualizar conexión** si ya existe)
4. El sistema:
   - Valida la credencial contra la API del proveedor
   - Cifra el contenido en servidor
   - Lo almacena en `public.integrations`
   - Muestra un mensaje de éxito

### Revelar Credenciales (30 segundos)

1. Junto al proveedor configurado, haz clic en **Ver claves 30s**
2. Se abre un modal con:
   - Campo para ingresar **ADMIN_VIEW_PASSWORD**
   - Botón **Revelar por 30s**
3. Ingresa la contraseña exacta y haz clic
4. Si es correcta:
   - Se muestran las credenciales descifradas
   - Un contador regresivo de 30 segundos aparece
   - Al llegar a 0, el modal se cierra automáticamente y se limpian los datos
5. Si es incorrecta:
   - Mensaje de error "Contraseña de visualización inválida"
   - Reintentos ilimitados

### Auditoría de Revelados

Cada revelado se registra en `integration_audit`:
```sql
SELECT provider, action, actor, ip, ts 
FROM integration_audit 
WHERE action = 'reveal' 
ORDER BY ts DESC;
```

Campos registrados:
- `provider`: Proveedor (ej. mercadopago)
- `action`: 'reveal'
- `actor`: Email del admin (desde sesión)
- `ip`: IP del navegador
- `user_agent`: User-Agent del navegador
- `ts`: Timestamp UTC

---

## Implementación Técnica

### Flujo de Guardado

```
Admin UI → POST /api/admin/integrations
  ├─ Validar sesión admin (ADMIN_COOKIE_NAME)
  ├─ Validar contra API del proveedor
  ├─ Cifrar credenciales (AES-256-GCM)
  ├─ Guardar en DB (integrations.credentials)
  ├─ Auditar: INSERT integration_audit
  └─ Responder con estado de conexión
```

### Flujo de Revelado

```
Admin UI → POST /api/admin/integrations/reveal
  ├─ Validar sesión admin
  ├─ Comparar password timing-safe (evitar ataques temporales)
  ├─ Descifrar credenciales (AES-256-GCM)
  ├─ Auditar: INSERT integration_audit
  ├─ Responder con credenciales descifradas
  └─ (Cliente limpia en 30 segundos automáticamente)
```

### Estructura de Datos

**Tabla `integrations`:**
```sql
CREATE TABLE public.integrations (
  provider text PRIMARY KEY,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);
```

**Formato de `credentials` descifrado:**
```json
{
  "access_token": "APP_USR-...",
  "public_key": "APP_USR-public-...",
  "webhook_secret": "secret..."
}
```

Cada campo se cifra independientemente con la estructura:  
`enc:v1:<base64_iv>:<base64_tag>:<base64_ciphertext>`

---

## Configuración de Variables de Llave Maestra

### Orden de Prioridad

El sistema verifica en este orden:
1. `process.env.ENCRYPTION_KEY` (recomendado)
2. `process.env.INTEGRATIONS_ENC_KEY` (heredado)

Si ambas existen, gana `ENCRYPTION_KEY`.

### Cambio de Llave (Rotación)

Para cambiar la llave sin perder datos:
1. Guarda la llave anterior en un lugar seguro
2. Configura `ENCRYPTION_KEY` con la nueva llave
3. Accede a cada integración en el admin y guárdala nuevamente
4. El sistema automáticamente reencifrará con la nueva llave
5. Luego puedes desactivar la llave anterior

---

## Validación y Go-Live

### Pre-Producción (Sandbox/Staging)

1. Configura `ENCRYPTION_KEY` y `ADMIN_VIEW_PASSWORD` en staging
2. Prueba el flujo completo:
   - Guardar credenciales de prueba
   - Validar que aparecen cifradas en DB
   - Revelar y verificar que se descifran correctamente
   - Comprobar que el contador de 30s funciona
   - Revisar `integration_audit` para auditoría
3. Verifica que los webhooks de terceros aún funcionan con credenciales recuperadas en servidor

### Producción (Go-Live)

1. Genera una llave nueva: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. Configura `ENCRYPTION_KEY` en Vercel/InsForge
3. Configura `ADMIN_VIEW_PASSWORD` con una contraseña segura de 16+ caracteres
4. Redeploy
5. Verifica:
   - Admin panel accesible en `/admin/integraciones`
   - Credenciales antiguas (no cifradas) aún se leen
   - Nuevas credenciales se cifran automáticamente
   - Revelado funciona sin errores
6. Testa con un proveedor real (ej. Mercado Pago):
   - Guarda credenciales reales
   - Ejecuta `/api/admin/integrations/test?provider=mercadopago`
   - Valida que la conexión es exitosa

### Checklist de Seguridad

- [ ] `ENCRYPTION_KEY` configurable en variables de entorno (nunca hardcodeado)
- [ ] `ADMIN_VIEW_PASSWORD` diferente entre staging y producción
- [ ] Logs de acceso al admin auditados (integration_audit)
- [ ] HTTPS habilitado en producción
- [ ] ADMIN_COOKIE_NAME validado en cada request de revelado
- [ ] Contraseña comparada con `timingSafeEqual` (no vulnerable a ataques de tiempo)
- [ ] Credenciales limpias de memoria a los 30 segundos
- [ ] Webhooks de terceros funcionan después de cifrado

---

## Integración con Proveedores Específicos

### Mercado Pago

**Variables necesarias:**
- `access_token`: Token de acceso (APP_USR-...)
- `public_key`: Clave pública (APP_USR-public-...)
- `webhook_secret`: (opcional) Secreto para verificar firmas

**Endpoint que usa:**
- POST `/api/payments/webhook` (valida firma con webhook_secret)
- GET `/api/admin/integrations/test?provider=mercadopago` (prueba conexión)

### Meta / Facebook

**Variables necesarias:**
- `access_token`: Token de acceso (EAAG...)
- `business_account_id`: ID de cuenta comercial

**Endpoints:**
- GET `/api/admin/integrations/test?provider=meta` (valida acceso a cuentas)

### Google Ads

**Variables necesarias:**
- `client_id`: OAuth client ID
- `client_secret`: OAuth client secret
- `refresh_token`: Token de refresco

**Endpoints:**
- GET `/api/admin/integrations/test?provider=google_ads` (valida acceso a campañas)

---

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| "ADMIN_VIEW_PASSWORD no está configurada" | Variable no existe en servidor | Configura en Vercel/InsForge y redeploy |
| "Contraseña de visualización inválida" | Contraseña incorrecta | Verifica `ADMIN_VIEW_PASSWORD` coincide |
| "No se pudieron revelar las credenciales" | Credenciales no existen | Guarda credenciales primero en el admin |
| Credenciales legibles en DB | Llave no configurada al guardar | Configura `ENCRYPTION_KEY` antes de guardar |
| Modal no cierra a los 30s | Bug de cliente | Recarga el navegador (F5) |
| Webhook falla tras cifrado | Credenciales no descifradas en servidor | Verifica que credenciales están guardadas; usa endpoint de test |

---

## Branding y Customización

Todos los textos están en español (es-CL) y pueden customizarse en:

- **UI**: `src/app/admin/integraciones/page.tsx`
  - Mensajes de error/éxito
  - Descripciones de proveedores
  - Textos de botones

- **API**: `src/app/api/admin/integrations/reveal/route.ts`
  - Mensajes de error de servidor

---

## Próximos Pasos

1. **Encrypted backups**: Considera encriptar los backups de la DB
2. **Key rotation policy**: Rota llaves cada 90 días en producción
3. **Access logs**: Centraliza `integration_audit` en un servicio de logging (ej. Sentry)
4. **Secret scanning**: Usa pre-commit hooks para evitar pushes de .env
5. **Two-factor**: Considera agregar 2FA para el admin panel

---

**Última actualización:** Mayo 2026  
**Versión:** 1.0  
**Autor:** Soluciones Fabrick
