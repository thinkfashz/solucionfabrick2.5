# MCP OAuth 2.1 / JWT / JWKS

Soluciones Fabrick puede aceptar dos familias de credenciales en el mismo endpoint `/api/mcp`:

1. Tokens Fabrick `sfmcp_...` creados desde `/admin/mcp`.
2. Access tokens JWT emitidos por un Authorization Server OAuth 2.1 confiable, cuando OAuth está habilitado explícitamente.

## Modelo de confianza

El JWT externo nunca decide el `tenant_id` de Fabrick. Después de validar firma, issuer, audience y tiempo de vida, Fabrick obtiene `iss`, `sub`, `client_id`/`azp` y scopes. El administrador debe crear previamente una vinculación en `/admin/mcp/oauth` entre esa identidad y una credencial MCP existente.

La base de datos guarda solamente SHA-256 de `issuer + subject`; el `sub` completo no se persiste. Por defecto una vinculación exige también un `client_id`/`azp` concreto. Solo se permite vincular por `sub` sin cliente si se habilita explícitamente `MCP_OAUTH_ALLOW_SUBJECT_ONLY_BINDING=1`.

Los scopes efectivos son la intersección entre:

- scopes emitidos en `scope` o `scp` por el Authorization Server; y
- scopes permitidos por la credencial MCP vinculada.

Por tanto un IdP no puede ampliar permisos más allá de los que Fabrick concedió a esa conexión.

## Validación JWT

El Resource Server valida:

- `iss` contra `MCP_OAUTH_ISSUER`;
- `aud` contra `MCP_OAUTH_AUDIENCE`;
- `exp`, `nbf` e `iat` con skew configurable;
- algoritmo contra una allow-list;
- firma usando la clave pública del JWKS;
- `kid`, `use`, `key_ops` y `alg` cuando están presentes en el JWK.

Si `MCP_OAUTH_JWKS_URI` no está definido, el servidor descubre `jwks_uri` mediante OAuth Authorization Server Metadata (RFC 8414) y, como fallback, OpenID Connect Discovery. Metadata y JWKS se cachean brevemente en cada instancia serverless y un `kid` desconocido fuerza una recarga del JWKS una vez.

## Protección de red / SSRF

Las consultas salientes de discovery y JWKS no siguen redirects automáticamente. Cada URL inicial y cada `Location` se valida antes de consultar:

- HTTPS obligatorio en producción;
- credenciales embebidas bloqueadas;
- `localhost`, dominios `.local`/`.internal` y hosts de metadata bloqueados;
- IPv4/IPv6 privadas, link-local, loopback, multicast y rangos reservados bloqueados;
- resolución DNS comprobada antes de cada fetch;
- límites de redirects, tiempo y tamaño de respuesta.

Para desarrollo local existe `MCP_OAUTH_ALLOW_PRIVATE_DEV=1`, pero solo tiene efecto fuera de producción.

## Registro de clientes MCP moderno

MCP 2026 prioriza estos mecanismos:

1. cliente pre-registrado cuando cliente e issuer ya tienen relación;
2. Client ID Metadata Documents (CIMD), preferido para clientes sin relación previa;
3. Dynamic Client Registration (DCR) como fallback de compatibilidad.

DCR está deprecado en la línea moderna del protocolo, por lo que Fabrick no lo trata como requisito de readiness. Un issuer sin CIMD ni DCR puede seguir siendo válido si el cliente se pre-registra manualmente.

## Authorization Code + PKCE y sesiones persistentes

Para interoperabilidad con clientes MCP interactivos el Authorization Server debe ofrecer Authorization Code y PKCE `S256`. Para conexiones duraderas con ChatGPT se recomienda que el issuer anuncie `offline_access` y emita refresh tokens; sin refresh, el usuario puede tener que volver a autorizar cuando venza el access token.

El panel `/admin/mcp/oauth/diagnostico` comprueba automáticamente:

- discovery RFC 8414 / OIDC;
- `authorization_endpoint` y `token_endpoint` públicos;
- Authorization Code;
- PKCE `S256`;
- `offline_access` y `refresh_token`;
- CIMD / DCR / necesidad de pre-registro;
- métodos de autenticación del token endpoint;
- `authorization_response_iss_parameter_supported`;
- JWKS accesible y no vacío.

El diagnóstico no guarda secretos ni activa OAuth. Tampoco sustituye el último test: debe probarse un access token real emitido para el audience/resource MCP.

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
MCP_OAUTH_ALLOW_SUBJECT_ONLY_BINDING=1
MCP_OAUTH_ALLOW_PRIVATE_DEV=1
```

OAuth solo se considera activo si `MCP_OAUTH_ENABLED` y `MCP_OAUTH_METADATA_ENABLED` están activados y existe un issuer válido. Hasta entonces la metadata protegida permanece apagada y los tokens Fabrick siguen funcionando igual.

## Protected Resource Metadata

Con OAuth activo se publica RFC 9728 en:

- `/.well-known/oauth-protected-resource/api/mcp`
- `/.well-known/oauth-protected-resource`

Las respuestas `401` de `/api/mcp` reciben un `WWW-Authenticate` con `resource_metadata` y el scope inicial `products:read`.

## Revocación y gobernanza

Revocar la credencial MCP vinculada invalida también sus accesos OAuth, aunque el JWT externo siga siendo criptográficamente válido. Eliminar la vinculación OAuth también corta el acceso sin modificar el Authorization Server. Las cuotas, aprobaciones y auditoría siguen usando el `key_id` de la credencial MCP vinculada, de modo que OAuth no crea un camino paralelo fuera de Gobernanza.

## Notificaciones

Cuando existen aprobaciones MCP pendientes el administrador muestra un aviso global y la subnavegación de `/admin/mcp` muestra el contador. Ambos se actualizan periódicamente y al volver a la pestaña.

## Limitaciones intencionales

- Fabrick es Resource Server; no intenta convertirse en Authorization Server.
- Esta implementación valida access tokens JWT. Tokens opacos requieren introspection y no se aceptan.
- Fabrick no reenvía el access token OAuth a APIs de terceros.
- La creación/autorización del cliente OAuth ocurre en el Authorization Server.
- Un diagnóstico verde no confirma el contenido de un token hasta hacer el test criptográfico end-to-end con un token real.
