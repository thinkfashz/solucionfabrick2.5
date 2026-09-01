# Soluciones Fabrick MCP + Auth0

Auth0 es el Authorization Server recomendado para el flujo OAuth interactivo del MCP de Soluciones Fabrick. InsForge sigue siendo backend de datos/auth de la aplicación; no se usa como issuer genérico del access token MCP.

## Requisito MCP: Resource Parameter Compatibility Profile

MCP usa el parámetro estándar `resource` de RFC 8707 para indicar el Resource Server. Auth0 históricamente usa `audience`, por lo que antes de conectar un cliente MCP hay que habilitar en el tenant:

`Settings → Advanced → Resource Parameter Compatibility Profile = ON`

Con el perfil activo, Auth0 puede usar `resource=https://www.solucionesfabrick.com/api/mcp` para definir el `aud` del access token. Sin él, una integración MCP puede terminar usando el audience de `/userinfo` y fallar aunque discovery/JWKS sean correctos.

La pantalla `/admin/mcp/oauth/auth0` exige confirmación explícita de este toggle antes de marcar el setup como listo para activar.

Auth0 también permite habilitar Client ID Metadata Document Registration (CIMD). Es útil para clientes MCP que usen CIMD, pero no es requisito para una Application ChatGPT pre-registrada.

## Provisionamiento asistido

`/admin/mcp/oauth/auth0/provision` permite inspeccionar o alinear de forma controlada las partes deterministas del tenant Auth0.

Requiere un Management API access token temporal con estos scopes:

- `read:tenant_settings`
- `update:tenant_settings`
- `read:resource_servers`
- `create:resource_servers`
- `update:resource_servers`

El token se usa únicamente durante la petición y no se guarda en base de datos, variables de entorno ni respuesta.

El provisionador puede:

- establecer `resource_parameter_profile=compatibility`;
- crear la Custom API `https://www.solucionesfabrick.com/api/mcp` si no existe;
- alinear firma `RS256`;
- activar `Allow Offline Access`;
- activar RBAC (`enforce_policies=true`);
- añadir los cuatro scopes Fabrick;
- preservar scopes adicionales ya existentes.

El provisionador **no** crea usuarios, roles, conexiones, Actions ni la Application de ChatGPT. La Application se configura después de conocer la callback exacta y el método de autenticación que muestre ChatGPT.

Para reducir SSRF y errores operativos, el provisionador acepta únicamente el dominio estándar del tenant `*.auth0.com` para llamadas Management API. Un custom domain puede seguir usándose como issuer si se valida después en el diagnóstico OAuth.

## Activación escalonada en Vercel

`/admin/mcp/oauth/activar` administra las variables OAuth usando las credenciales Vercel server-only que ya existen en Soluciones Fabrick.

Seguridad del activador:

- requiere Root/superadmin (`admin:manage`), no basta un tenant admin;
- en un deployment Preview solo puede modificar variables `preview` de la rama actual;
- un Preview nunca puede escribir variables de producción;
- producción solo se puede activar desde el runtime `production` cuando este código ya está en `main`;
- antes de activar vuelve a ejecutar discovery, PKCE y JWKS;
- producción exige además `offline_access` + refresh token;
- exige confirmación explícita de Resource Parameter Compatibility Profile;
- primero devuelve un plan sin cambiar Vercel;
- el commit requiere escribir una frase exacta;
- no devuelve ni expone el token Vercel;
- después de cambiar variables se requiere un nuevo deployment para que el runtime las cargue.

Variables gestionadas al activar:

```env
MCP_OAUTH_ENABLED=1
MCP_OAUTH_METADATA_ENABLED=1
MCP_OAUTH_ISSUER=https://TU_DOMINIO_AUTH0
MCP_OAUTH_AUDIENCE=https://www.solucionesfabrick.com/api/mcp
MCP_OAUTH_ALLOWED_ALGS=RS256
```

El mismo panel incluye un **kill switch** que pone únicamente:

```env
MCP_OAUTH_ENABLED=0
MCP_OAUTH_METADATA_ENABLED=0
```

No borra issuer/audience, por lo que permite volver a habilitar OAuth después de corregir un incidente sin reconstruir toda la configuración.

## Recurso MCP

- Endpoint: `https://www.solucionesfabrick.com/api/mcp`
- API Identifier / audience / resource: `https://www.solucionesfabrick.com/api/mcp`
- Protected Resource Metadata: `https://www.solucionesfabrick.com/.well-known/oauth-protected-resource/api/mcp`
- Firma recomendada: `RS256`

## Scopes de la Custom API

- `products:read`
- `products:write`
- `products:publish`
- `inventory:write`

Para mantener la conexión, el cliente interactivo solicita `offline_access` junto con los scopes Fabrick. No se necesitan `profile` ni `email` para el vínculo MCP: Fabrick usa `sub + client_id/azp` del access token y guarda únicamente el hash del subject. `offline_access` requiere que la API de Auth0 tenga `Allow Offline Access` habilitado y que la Application pueda usar Refresh Token.

## RBAC

Se recomienda habilitar RBAC en la Custom API y asignar al usuario solamente los permisos que correspondan. Con RBAC activo, Auth0 restringe el `scope` del access token a la intersección entre permisos solicitados y permisos asignados. Fabrick vuelve a intersectar esos scopes con los scopes de la credencial MCP vinculada, y las operaciones sensibles siguen pasando por cuotas y aprobaciones.

## Application de ChatGPT

Crea una Application separada para ChatGPT. Habilita Authorization Code y Refresh Token. Usa PKCE S256. Registra exactamente la callback que ChatGPT muestre durante la creación de la app; no inventes ni reutilices una callback de ejemplo.

No guardes `client_secret` en el panel MCP de Fabrick. Si el mecanismo de autenticación elegido en ChatGPT requiere un cliente confidencial, configura el secreto únicamente donde el proveedor/cliente OAuth lo solicite.

## Verificación

1. Abre `/admin/mcp/oauth/auth0/provision` y usa primero `Revisar sin cambiar`.
2. Si el plan es correcto, provisiona tenant + Custom API con un Management API token temporal.
3. Revoca o descarta el Management API token usado.
4. Abre `/admin/mcp/oauth/auth0` y prueba el dominio/issuer Auth0.
5. Confirma Authorization Code, PKCE S256 y JWKS.
6. Confirma `offline_access`/refresh para persistencia.
7. Crea/configura la Application ChatGPT con la callback exacta que ChatGPT muestre.
8. En el Preview del PR abre `/admin/mcp/oauth/activar`, revisa el plan y activa OAuth solo para esa rama.
9. Crea un nuevo deployment Preview y ejecuta el diagnóstico/smoke OAuth con la configuración ya cargada.
10. Después de fusionar a `main`, abre el mismo activador desde producción y repite revisión + confirmación para las variables `production`.
11. Crea el nuevo deployment de producción y confirma Protected Resource Metadata + challenge 401.
12. Autoriza ChatGPT.
13. Vincula `sub + client_id/azp` en `/admin/mcp/oauth` a una credencial MCP de mínimo privilegio.
14. Ejecuta una lectura y luego una escritura controlada; revisa `/admin/mcp/gobernanza`.
15. Si aparece una incidencia, usa el kill switch y redepliega antes de investigar.
