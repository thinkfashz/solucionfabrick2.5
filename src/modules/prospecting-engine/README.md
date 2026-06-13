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
- Los módulos locales deben funcionar sin IA y degradar de forma segura si no hay credenciales.

## Módulos planeados

| Módulo | Nombre | Estado | Objetivo |
|---|---|---:|---|
| 01 | Prospectos BD + Importador ChatGPT | Implementado base | Guardar prospectos reales en base de datos e importar JSON desde ChatGPT |
| 02 | Integraciones IA | Implementado base | Guardar/testear claves de OpenAI, Gemini, OpenRouter, Groq, SerpAPI y Apify |
| 03 | Generador IA de landing | Implementado base | Crear HTML/CSS/JS desde datos del prospecto y guardar link público opcional |
| 03.5 | Importador híbrido local + IA | Implementado base | Extraer prospectos desde HTML/JSON/TXT local con botón IA ON/OFF |
| 04 | Editor IA por selección | Implementado base | Mejorar sólo una sección, párrafo o bloque del HTML sin regenerar toda la página |
| 05 | Plantillas por nicho | Pendiente | Templates reutilizables para dental, hotel, restaurante, construcción, etc. |
| 06 | Búsqueda externa de prospectos | Pendiente | Google Places, SerpAPI, Apify, Meta/Instagram cuando corresponda |
| 07 | CRM y seguimiento comercial | Pendiente | Estados, notas, recordatorios, mensajes enviados y cierres |

## Módulo 01 implementado

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

## Módulo 03 implementado

```txt
src/modules/prospecting-engine/types/page.types.ts
src/modules/prospecting-engine/config/niches.ts
src/modules/prospecting-engine/prompts/generate-landing.prompt.ts
src/modules/prospecting-engine/utils/generated-page-parser.ts
src/modules/prospecting-engine/services/ai-provider.server.ts
src/modules/prospecting-engine/services/page-document.server.ts
src/modules/prospecting-engine/services/ai-generation.server.ts
src/modules/prospecting-engine/services/ai-landing.service.ts
src/app/api/admin/prospecting/generate-page/route.ts
src/modules/prospecting-engine/docs/MODULE_03_AI_LANDING_GENERATOR.md
```

## Módulo 03.5 implementado

```txt
src/modules/prospecting-engine/types/import.types.ts
src/modules/prospecting-engine/utils/local-prospect-detector.ts
src/modules/prospecting-engine/prompts/enhance-imported-prospects.prompt.ts
src/modules/prospecting-engine/services/hybrid-import-enhance.server.ts
src/modules/prospecting-engine/services/local-hybrid-import.service.ts
src/app/api/admin/prospecting/import/enhance/route.ts
src/modules/prospecting-engine/ui/LocalProspectImportPanel.tsx
src/components/admin/page-engine/PageEngineProspectingStudioHybridClient.tsx
src/app/admin/page-engine-21stdev/page.tsx
src/modules/prospecting-engine/docs/MODULE_03_5_LOCAL_HYBRID_IMPORTER.md
```

## Módulo 04 implementado

```txt
src/modules/prospecting-engine/types/section.types.ts
src/modules/prospecting-engine/utils/html-section-detector.ts
src/modules/prospecting-engine/prompts/improve-section.prompt.ts
src/modules/prospecting-engine/utils/improved-section-parser.ts
src/modules/prospecting-engine/services/section-improvement.server.ts
src/modules/prospecting-engine/services/section-improvement.service.ts
src/app/api/admin/prospecting/improve-section/route.ts
src/modules/prospecting-engine/ui/AiSectionEditorPanel.tsx
src/modules/prospecting-engine/docs/MODULE_04_AI_SECTION_EDITOR.md
```

## Tablas agregadas/preparadas

```txt
prospects
integrations
page_engine_documents
```

Se crean automáticamente desde backend con raw SQL cuando se llama a las APIs del módulo.

## APIs agregadas

```txt
GET    /api/admin/prospecting/prospects
POST   /api/admin/prospecting/prospects
PUT    /api/admin/prospecting/prospects
DELETE /api/admin/prospecting/prospects?id=...
POST   /api/admin/prospecting/import
POST   /api/admin/prospecting/import/enhance
GET    /api/admin/prospecting/integrations
POST   /api/admin/prospecting/integrations
DELETE /api/admin/prospecting/integrations?provider=...
POST   /api/admin/prospecting/integrations/test
POST   /api/admin/prospecting/generate-page
POST   /api/admin/prospecting/improve-section
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

## Importación híbrida local + IA

Modo local:

```txt
HTML/JSON/TXT → detector local → lista glamour → guardar seleccionados
```

Modo IA ON:

```txt
HTML/JSON/TXT → detector local → IA normaliza → lista glamour → guardar seleccionados
```

Si la IA falla o no hay credenciales, el panel mantiene el modo local y avisa al usuario.

## Edición IA por selección

```txt
HTML completo → detector de data-sf-editable/data-sf-block → instrucción → IA devuelve sólo improvedHtml → reemplazo exacto
```

Esta base permite cambiar sólo un párrafo, título, botón o bloque sin romper el resto del diseño.

## Próximo paso recomendado

1. Conectar la UI actual del Page Engine al servicio `prospect.service.ts` para que la lista de prospectos deje de depender de `localStorage` y use la tabla real `prospects`.
2. Crear un panel visual `IntegrationsPanel` que consuma `ai-integration.service.ts` para guardar/testear claves desde la interfaz.
3. Crear un panel visual `AiGeneratorPanel` que llame a `/api/admin/prospecting/generate-page` y pueble el editor HTML/CSS/JS.
4. Integrar visualmente `AiSectionEditorPanel` dentro de la pestaña HTML/IA del editor actual.
5. Después implementar el Módulo 05: Plantillas por nicho.
