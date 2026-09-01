# Soluciones Fabrick MCP + Auth0

Auth0 es el Authorization Server recomendado para el flujo OAuth interactivo del MCP de Soluciones Fabrick. InsForge sigue siendo backend de datos/auth de la aplicación; no se usa como issuer genérico del access token MCP.

## Requisito MCP: Resource Parameter Compatibility Profile

MCP usa el parámetro estándar `resource` de RFC 8707 para indicar el Resource Server. Auth0 históricamente usa `audience`, por lo que antes de conectar un cliente MCP hay que habilitar en el tenant:

`Settings → Advanced → Resource Parameter Compatibility Profile = ON`

Con el perfil activo, Auth0 puede usar `resource=https://www.solucionesfabrick.com/api/mcp` para definir el `aud` del access token. Sin él, una integración MCP puede terminar usando el audience de `/userinfo` y fallar aunque discovery/JWKS sean correctos.

La pantalla `/admin/mcp/oauth/auth0` exige confirmación explícita de este toggle antes de marcar el setup como listo para activar, porque esta preferencia del tenant no puede inferirse de manera fiable solo con metadata pública.

Auth0 también permite habilitar Client ID Metadata Document Registration (CIMD). Es útil para clientes MCP que usen CIMD, pero no es requisito para una Application ChatGPT pre-registrada.

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

Se recomienda habilitar RBAC en la Custom API y asignar al usuario solamente los permisos que correspondan. Fabrick no confía únicamente en Auth0: los scopes del access token se intersectan con los scopes de la credencial MCP vinculada, y las operaciones sensibles siguen pasando por cuotas y aprobaciones.

## Application de ChatGPT

Crea una Application separada para ChatGPT. Habilita Authorization Code y Refresh Token. Usa PKCE S256. Registra exactamente la callback que ChatGPT muestre durante la creación de la app; no inventes ni reutilices una callback de ejemplo.

No guardes `client_secret` en el panel MCP de Fabrick. Si el mecanismo de autenticación elegido en ChatGPT requiere un cliente confidencial, configura el secreto únicamente donde el proveedor/cliente OAuth lo solicite.

## Variables Fabrick

```env
MCP_OAUTH_ENABLED=1
MCP_OAUTH_METADATA_ENABLED=1
MCP_OAUTH_ISSUER=https://TU_DOMINIO_AUTH0
MCP_OAUTH_AUDIENCE=https://www.solucionesfabrick.com/api/mcp
MCP_OAUTH_ALLOWED_ALGS=RS256
```

`MCP_OAUTH_JWKS_URI` no es necesario para Auth0 mientras discovery anuncie un `jwks_uri` público válido.

## Verificación

1. Activa Resource Parameter Compatibility Profile en Auth0.
2. Abre `/admin/mcp/oauth/auth0`, confirma el toggle y prueba el dominio Auth0.
3. Confirma Authorization Code, PKCE S256 y JWKS.
4. Confirma `offline_access`/refresh para persistencia.
5. Activa las variables en Vercel solo cuando el panel marque Activación MCP = Lista.
6. Revisa `/admin/mcp/oauth/diagnostico`.
7. Autoriza ChatGPT.
8. Vincula `sub + client_id/azp` en `/admin/mcp/oauth` a una credencial MCP de mínimo privilegio.
9. Ejecuta una lectura y luego una escritura controlada; revisa `/admin/mcp/gobernanza`.
