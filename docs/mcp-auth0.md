# Soluciones Fabrick MCP + Auth0

Auth0 es el Authorization Server recomendado para el flujo OAuth interactivo del MCP de Soluciones Fabrick. InsForge sigue siendo backend de datos/auth de la aplicación; no se usa como issuer genérico del access token MCP.

## Recurso MCP

- Endpoint: `https://www.solucionesfabrick.com/api/mcp`
- API Identifier / audience: `https://www.solucionesfabrick.com/api/mcp`
- Protected Resource Metadata: `https://www.solucionesfabrick.com/.well-known/oauth-protected-resource/api/mcp`
- Firma recomendada: `RS256`

## Scopes de la Custom API

- `products:read`
- `products:write`
- `products:publish`
- `inventory:write`

El cliente interactivo también solicita `openid profile email offline_access`. `offline_access` requiere que la API de Auth0 tenga `Allow Offline Access` habilitado y que la Application pueda usar Refresh Token.

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

1. Abre `/admin/mcp/oauth/auth0` y prueba el dominio Auth0.
2. Confirma Authorization Code, PKCE S256 y JWKS.
3. Confirma `offline_access`/refresh para persistencia.
4. Activa las variables en Vercel.
5. Revisa `/admin/mcp/oauth/diagnostico`.
6. Autoriza ChatGPT.
7. Vincula `sub + client_id/azp` en `/admin/mcp/oauth` a una credencial MCP de mínimo privilegio.
8. Ejecuta una lectura y luego una escritura controlada; revisa `/admin/mcp/gobernanza`.
