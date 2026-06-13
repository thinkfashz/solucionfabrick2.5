# Módulo 04 — Editor IA por selección

## Propósito

Este módulo permite detectar una sección, párrafo, botón, imagen o bloque editable dentro de un HTML y pedirle a la IA que modifique sólo esa parte, sin regenerar la landing completa.

Flujo:

```txt
HTML completo
→ detector de secciones editables
→ seleccionar data-sf-editable/data-sf-block o fallback
→ instrucción del usuario
→ IA devuelve sólo improvedHtml
→ reemplazo exacto dentro del HTML completo
→ preview/editor recibe HTML actualizado
```

---

## Estado

```txt
Implementado base: 2026-06-13
```

Incluye:

- Tipos de secciones editables.
- Detector local de bloques HTML.
- Prompt para mejorar sólo una sección.
- Parser de respuesta IA.
- Servicio backend de mejora de sección.
- API interna para mejorar sección.
- Servicio cliente.
- Panel visual reutilizable `AiSectionEditorPanel`.

---

## Archivos implementados

```txt
src/modules/prospecting-engine/types/section.types.ts
src/modules/prospecting-engine/utils/html-section-detector.ts
src/modules/prospecting-engine/prompts/improve-section.prompt.ts
src/modules/prospecting-engine/utils/improved-section-parser.ts
src/modules/prospecting-engine/services/section-improvement.server.ts
src/modules/prospecting-engine/services/section-improvement.service.ts
src/app/api/admin/prospecting/improve-section/route.ts
src/modules/prospecting-engine/ui/AiSectionEditorPanel.tsx
```

---

## API: mejorar sección

```txt
POST /api/admin/prospecting/improve-section
```

Body:

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "fullHtml": "<main>...</main>",
  "sectionId": "hero-title",
  "instruction": "Haz este título más premium y vendedor.",
  "prospectContext": {
    "brand": "Clínica Dental Ejemplo",
    "city": "Linares"
  },
  "preserveLayout": true
}
```

También puede usar `sectionHtml` si la selección viene manual:

```json
{
  "provider": "openai",
  "fullHtml": "<main>...</main>",
  "sectionHtml": "<p>Texto seleccionado</p>",
  "instruction": "Mejora este párrafo."
}
```

Respuesta:

```json
{
  "ok": true,
  "provider": "openai",
  "model": "gpt-4o-mini",
  "section": {
    "id": "hero-title",
    "type": "editable",
    "html": "<h1 data-sf-editable=...>...</h1>"
  },
  "improvedHtml": "<h1 data-sf-editable=...>...</h1>",
  "updatedFullHtml": "<main>...</main>",
  "summary": "Mejoré el título y reforcé la propuesta de valor.",
  "warnings": []
}
```

---

## Detección de secciones

Archivo:

```txt
src/modules/prospecting-engine/utils/html-section-detector.ts
```

Prioridad de detección:

```txt
1. data-sf-editable
2. data-sf-block
3. fallback de h1-h6, p, a, button
```

El detector devuelve:

```txt
id
label
type
selector
html
text
start
end
confidence
```

---

## Atributos recomendados

Las landings generadas por IA deben seguir usando:

```html
<section data-sf-block="hero">
  <h1 data-sf-editable="hero-title">Título</h1>
  <p data-sf-editable="hero-copy">Texto</p>
</section>
```

Así el editor puede modificar piezas exactas sin romper el layout.

---

## Servicio cliente

Archivo:

```txt
src/modules/prospecting-engine/services/section-improvement.service.ts
```

Funciones:

```txt
detectEditableSections(html)
improveSectionWithAi(request)
```

---

## Panel visual

Archivo:

```txt
src/modules/prospecting-engine/ui/AiSectionEditorPanel.tsx
```

Permite:

```txt
- listar secciones detectadas
- seleccionar bloque
- escribir instrucción
- elegir proveedor IA
- elegir modelo opcional
- mejorar sólo esa sección
- copiar HTML completo actualizado
- aplicar HTML actualizado mediante prop onApply
```

---

## Seguridad

- La IA se llama desde backend.
- Usa credenciales del Módulo 02.
- No expone API keys al navegador.
- No acepta SerpAPI/Apify para edición de HTML.

---

## Pendiente del módulo 04

- Integrar `AiSectionEditorPanel` dentro de la pestaña visual del Page Engine para editar directamente el estado `html` del editor actual.
- Agregar selección visual desde iframe/preview haciendo clic sobre una sección.
- Guardar historial de ediciones en futura tabla `prospect_ai_history`.
- Permitir revertir cambios por versión.

---

## Reglas para futuras IAs

1. No regenerar página completa cuando se edita una sección.
2. El prompt debe pedir sólo `improvedHtml`.
3. Mantener `data-sf-block` y `data-sf-editable`.
4. Si cambia el detector, actualizar este documento.
5. Si cambia el formato de respuesta, actualizar `section.types.ts` y `improved-section-parser.ts`.
