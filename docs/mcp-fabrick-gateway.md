# Soluciones Fabrick MCP Gateway

Servidor MCP multi-tenant para conectar asistentes y clientes compatibles con el catálogo, la inteligencia de mercado y el Inventario V2 de Soluciones Fabrick.

## Endpoints

- Streamable HTTP con header: `https://www.solucionesfabrick.com/api/mcp`
- URL secreta para clientes sin headers: `https://www.solucionesfabrick.com/api/mcp/<TOKEN>`

Autenticación soportada:

```http
Authorization: Bearer sfmcp_<keyId>.<secret>
```

También se admite `X-Fabrick-MCP-Key` y la URL secreta.

El token completo se muestra una sola vez. En la base solo queda SHA-256 del token dentro de las credenciales cifradas de la integración.

## Credenciales por cliente

Cada interfaz debe usar su propia credencial. Ejemplos:

- ChatGPT
- cliente MCP local
- Claude / Cursor / IDE compatible
- agente interno de automatización

Cada credencial tiene `keyId`, etiqueta y scopes independientes. Revocar una conexión no invalida las demás.

El formato indexado `sfmcp_<keyId>.<secret>` permite localizar directamente el registro de autenticación sin recorrer todos los tenants. Los tokens legacy siguen siendo aceptados durante la transición.

Máximo actual: 20 credenciales MCP por tenant.

## Scopes

| Scope | Permite |
| --- | --- |
| `products:read` | buscar productos, ver fichas, auditar catálogo y consultar referentes públicos de mercado |
| `products:write` | preparar/crear productos y modificar fichas comerciales o técnicas |
| `products:publish` | cambiar el estado `activo` de un producto |
| `inventory:write` | registrar entradas, salidas, devoluciones y ajustes mediante Inventario V2 |

Principio recomendado: otorgar siempre el mínimo privilegio necesario.

## Herramientas MCP

### Lectura

`products_search`

Busca catálogo por nombre, SKU, EAN o código de escaneo. Puede filtrar productos activos, stock bajo o agotados.

`product_get`

Obtiene la ficha completa por ID, SKU, EAN o código.

`catalog_supervise`

Audita el catálogo y detecta, entre otros:

- descripción faltante
- imagen faltante
- SKU/código faltante
- precio cero
- stock bajo o agotado
- producto inactivo

`market_search`

Consulta referentes públicos actuales de Mercado Libre Chile (`MLC`) y devuelve precio, posición, disponibilidad y señales públicas de ventas cuando existan.

Los datos de terceros son referencias; no deben presentarse como datos propios ni asumirse permanentes.

### Escritura en dos fases

Toda escritura sensible usa el patrón:

1. llamar con `commit=false`;
2. mostrar al usuario la vista previa;
3. obtener confirmación;
4. repetir exactamente la operación con `commit=true`.

`product_create`

Crea una ficha con stock inicial 0. `activo=true` requiere además `products:publish`.

`product_update`

Muestra primero la ficha actual y los cambios propuestos. No admite modificar stock directamente. Cambiar `activo` requiere `products:publish`.

`market_product_stage`

Prepara/importa un referente de Mercado Libre conservando `source`, `source_id` y `source_url`. El resultado comprometido entra siempre:

- inactivo;
- stock 0;
- marcado como incorporado por MCP;
- listo para revisión humana.

`inventory_move`

Usa exclusivamente `inventory_apply_movement`.

- `in`: suma unidades.
- `out`: resta unidades.
- `return`: suma unidades devueltas.
- `adjustment`: `quantity` representa el **stock final absoluto**, no una diferencia.

`referenceId` debe ser estable y único. El ledger lo usa para idempotencia y evita procesar dos veces la misma operación.

## Reglas para agentes

1. Buscar antes de crear para reducir duplicados.
2. Nunca inventar stock.
3. No activar productos sin permiso `products:publish`.
4. Tratar resultados de mercado como información externa que debe verificarse.
5. Importar referentes externos primero como borrador.
6. No saltarse la fase `commit=false` → confirmación → `commit=true`.
7. Para stock usar siempre `inventory_move`; nunca actualizar `products.stock` directamente.

## Ejemplo genérico Streamable HTTP

```json
{
  "transport": "streamable-http",
  "url": "https://www.solucionesfabrick.com/api/mcp",
  "headers": {
    "Authorization": "Bearer <TOKEN>"
  }
}
```

Para un cliente que solo admite una URL:

```json
{
  "mcpServers": {
    "soluciones-fabrick": {
      "url": "https://www.solucionesfabrick.com/api/mcp/<TOKEN>"
    }
  }
}
```

## Proveedores de modelos

El panel `/admin/mcp` también configura:

- Ollama Cloud, usando su API OpenAI-compatible;
- un proveedor personalizado OpenAI-compatible mediante `base_url`, `api_key` opcional y `modelo`.

Los endpoints personalizados pasan por validación SSRF y no aceptan localhost ni redes privadas por defecto.

La selección/prueba de modelos se realiza en `/admin/modelos-ia`.

## Seguridad y aislamiento

- credenciales aisladas por tenant;
- token secreto nunca persistido en texto plano;
- scopes por cliente;
- publicación separada de edición;
- stock por RPC atómico e idempotente;
- productos externos inactivos y sin stock;
- endpoints personalizados validados para evitar SSRF;
- endpoint MCP responde `401` sin una credencial válida;
- respuestas de autenticación usan `Cache-Control: no-store`.
