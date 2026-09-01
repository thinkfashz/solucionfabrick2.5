# MCP OAuth 2.1 / JWT / JWKS

Soluciones Fabrick puede aceptar dos familias de credenciales en el mismo endpoint `/api/mcp`:

1. Tokens Fabrick `sfmcp_...` creados desde `/admin/mcp`.
2. Access tokens JWT emitidos por un Authorization Server OAuth 2.1 confiable, cuando OAuth está habilitado explícitamente.

## Modelo de confianza

El JWT externo nunca decide el `tenant_id` de Fabrick. Después de validar firma, issuer, audience y tiempo de vida, Fabrick obtiene `iss`, `sub`, `client_id`/`azp` y scopes. El administrador debe crear previamente una vinculación en `/admin/mcp/oauth` entre esa identidad y una credencial MCP existente.

La base de datos guarda solamente SHA-256 de `issuer + subject`; el `sub` completo no se persiste. Por defecto una vinculación exige también un `client_id`/`azp` concreto. Solo se permite vincular por `sub` sin cliente si se habilita explícitamente `MCP_OAUTH_ALLOW_SUBJECT_ONLY_BINDING=1`.

Los scopes efectivos son la intersección entre los scopes emitidos por el Authorization Server y los scopes permitidos por la credencial MCP vinculada. Un IdP nunca puede ampliar permisos más allá de los que Fabrick concedió.

## Validación JWT

El Resource Server valida `iss`, `aud`, `exp`, `nbf`, `iat`, algoritmo allow-list, firma JWKS y `kid`/`use`/`key_ops`/`alg` cuando están presentes. Si `MCP_OAUTH_JWKS_URI` no está definido, `jwks_uri` se descubre mediante RFC 8414 y fallback OpenID Connect Discovery. Metadata y JWKS se cachean brevemente y un `kid` desconocido fuerza una recarga una vez.

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

El orden recomendado es:

1. pre-registro cuando cliente e issuer ya tienen relación;
2. Client ID Metadata Documents (CIMD) cuando no hay relación previa y el Authorization Server lo soporta;
3. Dynamic Client Registration (DCR) como fallback de compatibilidad;
4. credenciales introducidas manualmente si no hay otro mecanismo.

DCR está deprecado en MCP 2026 frente a CIMD. El documento CIMD pertenece al **cliente MCP**: Fabrick, como Resource Server, no debe publicar un CIMD fingiendo ser ChatGPT u otro cliente.

## Authorization Code + PKCE y sesiones persistentes

Para clientes MCP interactivos el Authorization Server debe ofrecer Authorization Code y PKCE `S256`. Para conexiones duraderas se recomienda `offline_access` y refresh tokens; sin refresh el cliente puede requerir reautorización al vencer el access token.

El panel `/admin/mcp/oauth/diagnostico` comprueba automáticamente discovery, endpoints, Authorization Code, PKCE, refresh/offline access, CIMD/DCR/pre-registro, métodos del token endpoint, authorization response issuer y JWKS.

## Kit de conexión

`/admin/mcp/oauth/conexion` centraliza los valores que deben copiarse al cliente y al Authorization Server:

- MCP endpoint;
- resource/audience;
- Protected Resource Metadata RFC 9728;
- scopes Fabrick;
- scopes interactivos recomendados;
- flujo Authorization Code + PKCE S256;
- prioridad de registro de cliente.

Para ChatGPT, la callback no se inventa en Fabrick. El usuario debe copiar **exactamente** la callback que ChatGPT muestre durante la creación/configuración de la app y pegarla en el kit. El kit genera un perfil de conexión y un ejemplo neutral de pre-registro, pero no guarda la callback ni secretos.

El ejemplo `token_endpoint_auth_method: none` representa un cliente público con PKCE. Si un Authorization Server exige cliente confidencial, se debe usar el método y secreto definidos por ese proveedor; el secreto no debe incrustarse en código ni en un documento público.

Para clientes que permitan headers y no necesiten OAuth, las credenciales `sfmcp_...` siguen siendo válidas y recomendables por su aislamiento de scopes, cuotas y revocación individual.

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

Revocar la credencial MCP vinculada invalida también sus accesos OAuth, aunque el JWT externo siga siendo criptográficamente válido. Eliminar la vinculación OAuth también corta el acceso sin modificar el Authorization Server. Las cuotas, aprobaciones y auditoría usan el `key_id` de la credencial MCP vinculada, por lo que OAuth no crea un camino paralelo fuera de Gobernanza.

## Notificaciones

Cuando existen aprobaciones MCP pendientes el administrador muestra un aviso global y la subnavegación de `/admin/mcp` muestra el contador. Ambos se actualizan periódicamente y al volver a la pestaña.

## Limitaciones intencionales

- Fabrick es Resource Server; no intenta convertirse en Authorization Server.
- Solo valida access tokens JWT; tokens opacos requerirían introspection y no se aceptan.
- Fabrick no reenvía access tokens OAuth a APIs de terceros.
- La creación/autorización del cliente OAuth ocurre en el Authorization Server.
- Un diagnóstico verde no confirma el contenido de un token hasta hacer el test criptográfico end-to-end con un token real.
