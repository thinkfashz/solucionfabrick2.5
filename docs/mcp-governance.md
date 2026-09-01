# MCP Governance — Soluciones Fabrick

Este documento describe la capa de gobernanza del gateway MCP de Soluciones Fabrick.

## Objetivo

Permitir que varias IAs y clientes MCP trabajen con catálogo e Inventario V2 sin entregar autonomía irrestricta. Cada credencial mantiene scopes propios y ahora también una política operativa independiente.

## Política por defecto

Por credencial MCP:

- 240 solicitudes por ventana de 5 minutos.
- 40 escrituras por ventana de 5 minutos.
- Publicar, activar o desactivar productos requiere aprobación humana.
- Los movimientos de inventario requieren aprobación humana.
- Crear o editar un borrador inactivo conserva el flujo preview -> commit y no requiere una segunda aprobación por defecto.

Los límites son configurables en `/admin/mcp/gobernanza`.

## Flujo de aprobación

Para una operación sensible:

1. El agente llama la herramienta con `commit=false`.
2. Fabrick calcula y devuelve la vista previa.
3. Fabrick crea una solicitud en `mcp_approvals` y devuelve `approvalId`.
4. Un administrador revisa el payload exacto en `/admin/mcp/gobernanza`.
5. El administrador aprueba o rechaza.
6. Si fue aprobada, el agente repite la herramienta con `commit=true`, el mismo payload y el `approvalId`.
7. Fabrick verifica tenant, keyId, herramienta, hash SHA-256 del payload, estado y expiración.
8. La aprobación se consume una sola vez antes de ejecutar el cambio.

Si cambia cualquier campo del payload, el hash cambia y la aprobación no es válida.

## Estados de aprobación

- `pending`: esperando decisión humana.
- `approved`: autorizada y todavía no consumida.
- `rejected`: rechazada por un administrador.
- `consumed`: usada por un commit válido.
- `expired`: superó su tiempo de validez.

La duración por defecto es 30 minutos.

## Rate limiting

El RPC `mcp_claim_rate_limit` mantiene contadores atómicos en PostgreSQL.

Las cuotas están separadas:

- una cuota de requests limita tráfico MCP general;
- una cuota de writes limita commits de negocio;
- agotar writes no impide seguir leyendo;
- agotar requests bloquea nuevas solicitudes hasta el siguiente intervalo.

El servidor responde `429` con `Retry-After` cuando corresponde.

## Auditoría

`mcp_audit_logs` registra:

- tenant;
- keyId;
- etiqueta del cliente;
- herramienta;
- fase (`request`, `read`, `preview`, `approval`, `commit`);
- resultado (`ok`, `pending`, `denied`, `error`);
- request id cuando existe;
- payload de entrada;
- resumen compacto del resultado;
- fecha.

La auditoría es best-effort para lecturas y operaciones: una caída temporal del almacenamiento de auditoría no detiene una operación de negocio que ya cumplió su política. Las restricciones de permisos, rate limit y aprobación sí son fail-closed.

## Panel administrativo

Ruta: `/admin/mcp/gobernanza`

Incluye:

- aprobaciones pendientes;
- payload exacto antes de aprobar;
- aprobar/rechazar;
- historial;
- políticas por credencial;
- activar/desactivar una conexión sin borrar el token;
- límite de requests y writes;
- exigencia de aprobación para publicación e inventario;
- uso de la ventana reciente;
- auditoría de herramientas MCP.

## OAuth 2.1 — estado actual

Soluciones Fabrick puede publicar Protected Resource Metadata RFC 9728 para el recurso `/api/mcp`, pero esta función queda deliberadamente apagada por defecto.

Se requieren simultáneamente:

```env
MCP_OAUTH_METADATA_ENABLED=1
MCP_OAUTH_ISSUER=https://issuer.example.com
```

Mientras no se cumplan ambas condiciones, las rutas `/.well-known/oauth-protected-resource` devuelven `404 MCP_OAUTH_NOT_CONFIGURED`.

### Importante

Esta etapa solo prepara la metadata del Resource Server. **No habilita por sí sola validación de access tokens OAuth emitidos por un issuer externo.** No se debe activar `MCP_OAUTH_METADATA_ENABLED=1` en producción hasta implementar y validar el verificador de tokens/JWKS y el mapeo de subject/client a tenant, keyId y scopes Fabrick.

El mecanismo activo de autenticación sigue siendo la credencial Fabrick `sfmcp_<keyId>.<secret>` por Bearer, header `x-fabrick-mcp-key` o URL secreta compatible.

## Tablas

- `mcp_governance_policies`
- `mcp_rate_windows`
- `mcp_approvals`
- `mcp_audit_logs`

El bootstrap está en `scripts/ensure-mcp-governance-schema.mjs` y se ejecuta después de los bootstrap de Intelligence, Inventario V2 y Mercado Libre durante `pnpm build`.
