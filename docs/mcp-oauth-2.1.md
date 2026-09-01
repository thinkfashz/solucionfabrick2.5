# MCP OAuth 2.1 / JWKS

Soluciones Fabrick puede aceptar dos familias de credenciales en el mismo endpoint `/api/mcp`:

1. Tokens Fabrick `sfmcp_...` creados desde `/admin/mcp`.
2. Access tokens JWT emitidos por un Authorization Server OAuth 2.1 confiable, cuando OAuth está habilitado explícitamente.

## Modelo de confianza

El JWT externo nunca decide el `tenant_id` de Fabrick. Después de validar firma, issuer, audience y tiempo de vida, Fabrick obtiene `iss`, `sub`, `client_id`/`azp` y scopes. El administrador debe crear previamente una vinculación en `/admin/mcp/oauth` entre esa identidad y una credencial MCP existente.

La base de datos guarda solamente SHA-256 de `issuer + subject`; el `sub` completo no se persiste. Una vinculación puede exigir además un `client_id` concreto.

Los scopes efectivos son la intersección entre:

- scopes emitidos en `scope` o `scp` por el Authorization Server; y
- scopes permitidos por la credencial MCP vinculada.

Por tanto un IdP no puede ampliar permisos más allá de los que Fabrick concedió a esa conexión.

## Validación JWT

El Resource Server valida:

- `iss` exactamente contra `MCP_OAUTH_ISSUER`;
- `aud` contra `MCP_OAUTH_AUDIENCE`;
- `exp`, `nbf` e `iat` con skew configurable;
- algoritmo contra una allow-list;
- firma usando la clave pública del JWKS;
- `kid`, `use`, `key_ops` y `alg` cuando están presentes en el JWK.

Si `MCP_OAUTH_JWKS_URI` no está definido, el servidor descubre `jwks_uri` mediante OAuth Authorization Server Metadata (RFC 8414) y, como fallback, OpenID Connect Discovery. Metadata y JWKS se cachean brevemente en cada instancia serverless y un `kid` desconocido fuerza una recarga del JWKS una vez.

## Variables

```text
MCP_OAUTH_ENABLED=1
MCP_OAUTH_METADATA_ENABLED=1
MCP_OAUTH_ISSUER=https://issuer.example.com
MCP_OAUTH_AUDIENCE=https://www.solucionesfabrick.com/api/mcp
```

Opcionales:

```text
MCP_OAUTH_JWKS_URI=https://issuer.example.com/.well-known/jwks.json
MCP_OAUTH_ALLOWED_ALGS=RS256 PS256 ES256 EdDSA
MCP_OAUTH_CLOCK_SKEW_SECONDS=60
```

OAuth solo se considera activo si `MCP_OAUTH_ENABLED` y `MCP_OAUTH_METADATA_ENABLED` están activados y existe un issuer válido. Hasta entonces la metadata protegida permanece apagada y los tokens Fabrick siguen funcionando igual.

## Protected Resource Metadata

Con OAuth activo se publica RFC 9728 en:

- `/.well-known/oauth-protected-resource/api/mcp`
- `/.well-known/oauth-protected-resource`

Las respuestas `401` de `/api/mcp` reciben un `WWW-Authenticate` con `resource_metadata` y el scope inicial `products:read`.

## Revocación

Revocar la credencial MCP vinculada invalida también sus accesos OAuth, aunque el JWT externo siga siendo criptográficamente válido. Eliminar la vinculación OAuth también corta el acceso sin modificar el Authorization Server.

## Limitaciones intencionales

- Esta implementación valida access tokens JWT. Tokens opacos requieren introspection y no se aceptan.
- Fabrick no reenvía el access token OAuth a APIs de terceros.
- La creación/autorización del cliente OAuth ocurre en el Authorization Server; Fabrick actúa como Resource Server.
