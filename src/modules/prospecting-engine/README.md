# Motor de Prospección IA — Soluciones Fabrick

## Estado general

Este módulo centraliza el sistema de prospección, análisis comercial, generación de demos HTML y seguimiento de links públicos del Page Engine 21stDev.

Ruta principal que consume el motor:

```txt
/admin/page-engine-21stdev
```

Carpeta raíz del motor:

```txt
src/modules/prospecting-engine/
```

## Objetivo del motor

Crear un flujo completo:

```txt
Prospecto → Análisis IA → Demo HTML → Link público → Mensaje comercial → Seguimiento
```

## Principios técnicos

- Cada módulo debe vivir dentro de `src/modules/prospecting-engine/`.
- Cada módulo debe tener tipos, servicios, utilidades y documentación propia.
- Las APIs sensibles deben ejecutarse en backend, nunca en el navegador.
- Las API keys se deben guardar en integraciones/base de datos, no en frontend.
- Cada mejora debe actualizar este README o el documento del módulo correspondiente.
- La página visual debe importar componentes/servicios desde este motor, no contener toda la lógica mezclada.

## Módulos planeados

| Módulo | Nombre | Estado | Objetivo |
|---|---|---:|---|
| 01 | Prospectos BD + Importador ChatGPT | Implementado base | Guardar prospectos reales en base de datos e importar JSON desde ChatGPT |
| 02 | Integraciones IA | Implementado base | Guardar/testear claves de OpenAI, Gemini, OpenRouter, Groq, SerpAPI y Apify |
| 03 | Generador IA de landing | Pendiente | Crear HTML/CSS/JS desde datos del prospecto |
| 04 | Editor IA por selección | Pendiente | Mejorar solo una sección, párrafo o bloque del HTML |
| 05 | Plantillas por nicho | Pendiente | Templates reutilizables para dental, hotel, restaurante, construcción, etc. |
| 06 | Búsqueda externa de prospectos | Pendiente | Google Places, SerpAPI, Apify, Meta/Instagram cuando corresponda |
| 07 | CRM y seguimiento comercial | Pendiente | Estados, notas, recordatorios, mensajes enviados y cierres |

## Módulo 01 implementado

Carpetas/archivos principales:

```txt
src/modules/prospecting-engine/types/prospect.types.ts
src/modules/prospecting-engine/config/statuses.ts
src/modules/prospecting-engine/utils/prospect-importer.ts
src/modules/prospecting-engine/services/prospect-table.server.ts
src/modules/prospecting-engine/services/prospect.service.ts
src/app/api/admin/prospecting/prospects/route.ts
src/app/api/admin/prospecting/import/route.ts
src/modules/prospecting-engine/docs/MODULE_01_PROSPECTS.md
```

## Módulo 02 implementado

Carpetas/archivos principales:

```txt
src/modules/prospecting-engine/types/ai.types.ts
src/modules/prospecting-engine/config/providers.ts
src/modules/prospecting-engine/utils/ai-integration-utils.ts
src/modules/prospecting-engine/services/ai-integration-table.server.ts
src/modules/prospecting-engine/services/ai-integration.server.ts
src/modules/prospecting-engine/services/ai-integration.service.ts
src/app/api/admin/prospecting/integrations/route.ts
src/app/api/admin/prospecting/integrations/test/route.ts
src/modules/prospecting-engine/docs/MODULE_02_AI_INTEGRATIONS.md
```

## Tablas agregadas/preparadas

```txt
prospects
integrations
```

Se crean automáticamente desde backend con raw SQL cuando se llama a las APIs del módulo.

## APIs agregadas

```txt
GET    /api/admin/prospecting/prospects
POST   /api/admin/prospecting/prospects
PUT    /api/admin/prospecting/prospects
DELETE /api/admin/prospecting/prospects?id=...
POST   /api/admin/prospecting/import
GET    /api/admin/prospecting/integrations
POST   /api/admin/prospecting/integrations
DELETE /api/admin/prospecting/integrations?provider=...
POST   /api/admin/prospecting/integrations/test
```

## Formato recomendado para importar desde ChatGPT

```json
{
  "source": "chatgpt",
  "city": "Linares",
  "industry": "clínicas dentales",
  "prospects": [
    {
      "brand": "Clínica Dental Ejemplo",
      "instagram": "https://instagram.com/ejemplo",
      "website": "",
      "whatsapp": "+56900000000",
      "followers": "12000",
      "city": "Linares",
      "problem_detected": "No tiene landing profesional.",
      "opportunity": "Agenda online + WhatsApp + casos clínicos.",
      "probability_level": "alta",
      "score": 87,
      "status": "nuevo"
    }
  ]
}
```

## Próximo paso recomendado

1. Conectar la UI actual del Page Engine al servicio `prospect.service.ts` para que la lista de prospectos deje de depender de `localStorage` y use la tabla real `prospects`.
2. Crear un panel visual `IntegrationsPanel` que consuma `ai-integration.service.ts` para guardar/testear claves desde la interfaz.
3. Después implementar el Módulo 03: Generador IA de landing usando las integraciones guardadas.
