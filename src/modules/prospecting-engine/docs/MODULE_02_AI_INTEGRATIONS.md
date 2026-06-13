# Módulo 02 — Integraciones IA seguras

## Propósito

Este módulo permite guardar, listar, eliminar y testear claves de proveedores IA y fuentes externas para el Motor de Prospección.

La regla central es:

```txt
Las API keys nunca viven en el frontend.
```

El frontend sólo llama APIs internas. Las APIs internas leen credenciales desde base de datos o integraciones y hacen las llamadas reales a proveedores externos.

---

## Estado

```txt
Implementado base: 2026-06-13
```

Incluye:

- Tipos TypeScript de integraciones IA.
- Configuración de proveedores.
- Utilidades de limpieza/masking de credenciales.
- Servicio de tabla `integrations`.
- Servicio server para guardar/listar/eliminar/testear proveedores.
- Servicio cliente para consumir las APIs.
- API REST para integraciones.
- API REST para testear integraciones.

---

## Archivos implementados

```txt
src/modules/prospecting-engine/types/ai.types.ts
src/modules/prospecting-engine/config/providers.ts
src/modules/prospecting-engine/utils/ai-integration-utils.ts
src/modules/prospecting-engine/services/ai-integration-table.server.ts
src/modules/prospecting-engine/services/ai-integration.server.ts
src/modules/prospecting-engine/services/ai-integration.service.ts
src/app/api/admin/prospecting/integrations/route.ts
src/app/api/admin/prospecting/integrations/test/route.ts
```

---

## Proveedores soportados en base

```txt
openai
 gemini
openrouter
groq
serpapi
apify
```

Categorías:

```txt
llm        → generación/análisis/edición con IA
search     → búsqueda de prospectos en fuentes externas
automation → scraping/control de datasets externos
```

---

## Tabla `integrations`

Se reutiliza/prepara la tabla:

```txt
integrations
```

Estructura mínima:

```txt
provider TEXT PRIMARY KEY
credentials JSONB DEFAULT '{}'
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

---

## Seguridad

Las credenciales se guardan usando:

```txt
src/lib/integrationsCrypto.ts
```

Funciones usadas:

```txt
encryptCredentials
decryptCredentials
isEncryptionConfigured
```

El endpoint nunca devuelve claves completas. Devuelve sólo datos enmascarados:

```json
{
  "api_key": {
    "set": true,
    "preview": "•••• abcd"
  }
}
```

---

## API: listar integraciones IA

```txt
GET /api/admin/prospecting/integrations
```

Respuesta:

```json
{
  "ok": true,
  "integrations": [
    {
      "provider": "openai",
      "label": "OpenAI / ChatGPT API",
      "configured": true,
      "encrypted": true,
      "credentials": {
        "api_key": {
          "set": true,
          "preview": "•••• abcd"
        }
      },
      "defaultModel": "gpt-4o-mini",
      "models": ["gpt-4o-mini", "gpt-4o"]
    }
  ]
}
```

---

## API: guardar integración IA

```txt
POST /api/admin/prospecting/integrations
```

Body:

```json
{
  "provider": "openai",
  "credentials": {
    "api_key": "sk-...",
    "model": "gpt-4o-mini"
  }
}
```

La API:

1. Valida que el proveedor esté permitido.
2. Limpia campos vacíos.
3. Mezcla con credenciales existentes para no obligar a reingresar todo.
4. Cifra los valores string.
5. Guarda en `integrations`.
6. Devuelve sólo credenciales enmascaradas.

---

## API: eliminar integración IA

```txt
DELETE /api/admin/prospecting/integrations?provider=openai
```

Elimina la fila del proveedor.

---

## API: testear integración IA

```txt
POST /api/admin/prospecting/integrations/test
```

Body:

```json
{
  "provider": "openai",
  "credentials": {
    "api_key": "sk-...",
    "model": "gpt-4o-mini"
  }
}
```

También puede testear credenciales ya guardadas si `credentials` viene vacío.

---

## Tests por proveedor

### OpenAI

Endpoint usado:

```txt
GET https://api.openai.com/v1/models
```

Headers:

```txt
Authorization: Bearer <api_key>
OpenAI-Organization: opcional
OpenAI-Project: opcional
```

---

### Gemini

Endpoint usado:

```txt
GET https://generativelanguage.googleapis.com/v1beta/models?key=<api_key>
```

---

### OpenRouter

Endpoint usado:

```txt
GET https://openrouter.ai/api/v1/models
```

Headers:

```txt
Authorization: Bearer <api_key>
HTTP-Referer: https://www.solucionesfabrick.com
X-Title: Soluciones Fabrick Prospecting Engine
```

---

### Groq

Endpoint usado:

```txt
GET https://api.groq.com/openai/v1/models
```

---

### SerpAPI

Endpoint usado:

```txt
GET https://serpapi.com/account?api_key=<api_key>
```

---

### Apify

Endpoint usado:

```txt
GET https://api.apify.com/v2/users/me?token=<api_token>
```

---

## Servicio cliente

Archivo:

```txt
src/modules/prospecting-engine/services/ai-integration.service.ts
```

Funciones:

```txt
listAiIntegrationStatuses()
saveAiIntegration(provider, credentials)
deleteAiIntegration(provider)
testAiIntegration(provider, credentials?)
```

Estas serán utilizadas desde un futuro panel visual `IntegrationsPanel` dentro del Page Engine.

---

## Pendiente del módulo 02

- Crear UI `IntegrationsPanel` dentro de `src/modules/prospecting-engine/ui/`.
- Conectar la pestaña de ajustes del Page Engine a las integraciones IA.
- Permitir seleccionar proveedor/modelo activo para generación.
- Guardar preferencia de proveedor/modelo en configuración local o tabla futura.

---

## Siguiente módulo

Módulo 03: Generador IA de landing.

Usará:

```txt
getAiCredentials(provider)
testAiIntegration(provider)
prospects
page_engine_documents
```

Y debe generar:

```txt
HTML completo
CSS
JS
metadata
copy comercial
mensaje WhatsApp
```

---

## Reglas para futuras IAs

1. No llamar proveedores IA desde el cliente.
2. No devolver API keys completas al frontend.
3. Si se agrega un proveedor, actualizar `config/providers.ts` y este documento.
4. Si cambia un endpoint de test, documentarlo aquí.
5. Toda generación real debe pasar por APIs internas.
6. No mezclar lógica de IA dentro de la página visual.
