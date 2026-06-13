# Módulo 03 — Generador IA de landing

## Propósito

Este módulo genera landing pages/demo HTML a partir de los datos de un prospecto y una integración IA previamente guardada.

Flujo esperado:

```txt
prospect_id o prospecto manual
→ proveedor IA configurado
→ prompt comercial modular
→ respuesta JSON
→ HTML/CSS/JS generado
→ guardado opcional en page_engine_documents
→ link público /w/[token]
```

---

## Estado

```txt
Implementado base: 2026-06-13
```

Incluye:

- Tipos de generación de landing.
- Presets de nichos.
- Prompt builder para generación comercial.
- Parser robusto de respuesta IA.
- Cliente multi-proveedor para OpenAI, Gemini, OpenRouter y Groq.
- Servicio de orquestación IA.
- Servicio cliente para llamar el generador desde UI.
- Servicio para guardar la landing generada en `page_engine_documents`.
- API REST para generar landing.

---

## Archivos implementados

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
```

---

## API: generar landing

```txt
POST /api/admin/prospecting/generate-page
```

Body mínimo con prospecto manual:

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "save": false,
  "niche": "dental",
  "tone": "premium",
  "prospect": {
    "brand": "Clínica Dental Ejemplo",
    "city": "Linares",
    "instagram": "https://instagram.com/ejemplo",
    "followers": "12000",
    "problem_detected": "No tiene landing profesional",
    "opportunity": "Agenda online + WhatsApp + casos clínicos"
  }
}
```

Body usando prospecto guardado:

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "prospect_id": "prospect_xxxxx",
  "save": true,
  "expires_in_hours": 720,
  "niche": "dental",
  "tone": "premium",
  "images": ["https://res.cloudinary.com/.../image.jpg"]
}
```

---

## Servicio cliente

Archivo:

```txt
src/modules/prospecting-engine/services/ai-landing.service.ts
```

Función:

```txt
generateLandingPage(request)
```

Este servicio será consumido por el futuro `AiGeneratorPanel` de la interfaz.

---

## Respuesta esperada

```json
{
  "ok": true,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "draft": {
    "title": "...",
    "html": "...",
    "css": "...",
    "js": "...",
    "shareTitle": "...",
    "shareDescription": "...",
    "whatsappMessage": "...",
    "emailSubject": "...",
    "emailBody": "...",
    "sections": [
      {
        "id": "hero",
        "name": "Hero",
        "purpose": "Captar atención inicial"
      }
    ],
    "reasoning": "..."
  },
  "saved": {
    "token": "abc123",
    "public_url": "https://www.solucionesfabrick.com/w/abc123",
    "expires_at": "...",
    "never_expire": false
  }
}
```

`saved` sólo aparece cuando `save: true`.

---

## Proveedores soportados para generación

```txt
openai
gemini
openrouter
groq
```

No generan landing directamente:

```txt
serpapi
apify
```

Estos quedan reservados para búsqueda externa en módulos posteriores.

---

## Prompt builder

Archivo:

```txt
src/modules/prospecting-engine/prompts/generate-landing.prompt.ts
```

El prompt fuerza que el modelo devuelva sólo JSON válido con las claves:

```txt
title
html
css
js
shareTitle
shareDescription
whatsappMessage
emailSubject
emailBody
sections
reasoning
```

Reglas importantes del prompt:

- No inventar testimonios reales.
- Crear diseño mobile-first.
- Usar `data-sf-block` y `data-sf-editable` para preparar el futuro editor por selección.
- Incluir CTA a WhatsApp/Instagram si hay datos.
- No depender de frameworks externos.
- Responder sólo JSON, no Markdown.

---

## Presets de nichos

Archivo:

```txt
src/modules/prospecting-engine/config/niches.ts
```

Nicho iniciales:

```txt
dental
hotel
restaurante
construccion
belleza
tienda-local
```

Cada nicho define:

```txt
id
label
goal
sections
visualDirection
```

---

## Parser de respuesta IA

Archivo:

```txt
src/modules/prospecting-engine/utils/generated-page-parser.ts
```

El parser:

- Acepta JSON puro.
- Acepta JSON dentro de bloque markdown.
- Extrae desde el primer `{` al último `}` si el modelo responde con texto extra.
- Genera fallback HTML si la respuesta no trae HTML útil.

---

## Guardado en `page_engine_documents`

Archivo:

```txt
src/modules/prospecting-engine/services/page-document.server.ts
```

Cuando `save: true`, el módulo:

1. Prepara tabla `page_engine_documents` si no existe.
2. Construye HTML completo con `<style>` y `<script>`.
3. Guarda `project_json` con:

```txt
module: 03-ai-landing-generator
provider
model
prospect_id
prospect
htmlCode
css
js
sections
reasoning
shareTitle
shareDescription
whatsappMessage
emailSubject
emailBody
images
expires_in_hours
```

4. Devuelve link público `/w/[token]`.

---

## Servicio multi-proveedor

Archivo:

```txt
src/modules/prospecting-engine/services/ai-provider.server.ts
```

### OpenAI/OpenRouter/Groq

Usan API compatible con OpenAI:

```txt
POST /chat/completions
```

### Gemini

Usa:

```txt
POST /v1beta/models/{model}:generateContent
```

---

## Seguridad

- La API key se obtiene usando `getAiCredentials(provider)` del módulo 02.
- Las claves no viajan al cliente.
- La generación ocurre en backend.
- `serpapi` y `apify` no son aceptados para generar HTML.

---

## Pendiente del módulo 03

- Crear UI `AiGeneratorPanel` para elegir proveedor/modelo/nicho/tono/prompt.
- Conectar botón “Generar landing con IA” al editor actual.
- Conectar opción “guardar y publicar automáticamente”.
- Guardar historial IA en futura tabla `prospect_ai_history`.
- Asociar formalmente la landing con `prospects` mediante tabla `prospect_pages`.

---

## Siguiente módulo

Módulo 04: Editor IA por selección.

Debe usar los atributos:

```html
<section data-sf-block="hero">
  <h1 data-sf-editable="hero-title">...</h1>
</section>
```

Y modificar sólo el bloque solicitado sin regenerar toda la página.

---

## Reglas para futuras IAs

1. No editar este módulo sin actualizar este documento.
2. No mover llamadas IA al frontend.
3. Mantener el output del generador como JSON estructurado.
4. Mantener `data-sf-block` y `data-sf-editable` en los prompts.
5. Si se agregan nichos, actualizar `config/niches.ts` y esta documentación.
6. Si se cambia el formato de draft, actualizar `types/page.types.ts` y el parser.
