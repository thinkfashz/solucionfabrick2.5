# Módulo 03.5 — Importador híbrido local + IA

## Propósito

Este módulo permite importar prospectos desde archivos locales sin depender de internet ni IA, y opcionalmente activar IA para limpiar, normalizar y enriquecer los datos detectados.

Flujo:

```txt
HTML / JSON / TXT local
→ detector local en navegador
→ vista glamour de prospectos detectados
→ IA ON/OFF
→ si IA OFF: usa datos locales
→ si IA ON: normaliza con proveedor IA guardado
→ selecciona prospectos
→ guarda en tabla prospects
→ puede cargar un prospecto en el editor Page Engine
```

---

## Estado

```txt
Implementado base: 2026-06-13
```

Incluye:

- Tipos de importación híbrida.
- Detector local para JSON, HTML y texto.
- Prompt IA para mejorar/normalizar prospectos detectados.
- Servicio backend para mejorar importación con IA.
- API interna `/api/admin/prospecting/import/enhance`.
- Servicio cliente para detección híbrida.
- Panel visual `LocalProspectImportPanel`.
- Wrapper `PageEngineProspectingStudioHybridClient` integrado en `/admin/page-engine-21stdev`.

---

## Archivos implementados

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
```

---

## Modo local

El modo local no llama APIs de IA. Puede trabajar sólo con el contenido del archivo.

Soporta:

```txt
.json
.html
.htm
.txt
```

Detecta prospectos desde:

```txt
- JSON con prospects/items/data
- HTML con tarjetas, artículos, secciones o tablas
- bloques con palabras clave: prospecto, marca, negocio, cliente, empresa
- JSON dentro de script type="application/json"
- JSON-LD básico
- texto separado por bloques
```

Campos detectables:

```txt
brand
client_name
industry
city
region
country
instagram
facebook
website
whatsapp
email
followers
problem_detected
opportunity
probability_level
score
status
notes
```

---

## Modo híbrido IA ON

Cuando el interruptor IA está activado:

1. El sistema detecta localmente primero.
2. Envía los datos detectados al backend.
3. El backend usa credenciales guardadas del Módulo 02.
4. La IA normaliza y mejora los prospectos.
5. Si la IA falla, la UI conserva el resultado local.

Proveedores permitidos para mejorar importación:

```txt
openai
gemini
openrouter
groq
```

No se usan para mejorar importación:

```txt
serpapi
apify
```

Estos quedan para búsqueda externa futura.

---

## API: mejorar importación con IA

```txt
POST /api/admin/prospecting/import/enhance
```

Body:

```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "sourceName": "prospectos-linares.html",
  "sourceType": "html",
  "rawText": "<html>...</html>",
  "localProspects": []
}
```

Respuesta:

```json
{
  "ok": true,
  "mode": "hybrid-ai",
  "sourceType": "html",
  "sourceName": "prospectos-linares.html",
  "prospects": [],
  "warnings": [],
  "aiUsed": true,
  "aiMessage": "Prospectos normalizados con openai · gpt-4o-mini"
}
```

---

## Panel visual

Componente:

```txt
src/modules/prospecting-engine/ui/LocalProspectImportPanel.tsx
```

Funciones visuales:

```txt
- Subir HTML/JSON/TXT
- Pegar texto manual
- Activar/desactivar IA con botón ON/OFF
- Seleccionar proveedor IA
- Definir modelo opcional
- Detectar prospectos
- Ver advertencias
- Filtrar resultados
- Seleccionar/omitir prospectos
- Guardar seleccionados en BD
- Copiar JSON de un prospecto
- Usar prospecto en el editor actual
```

---

## Integración con Page Engine

Se creó wrapper:

```txt
src/components/admin/page-engine/PageEngineProspectingStudioHybridClient.tsx
```

Este wrapper:

1. Renderiza el importador híbrido arriba.
2. Renderiza el estudio existente abajo.
3. Permite usar un prospecto detectado en el editor local.
4. Guarda el prospecto en `localStorage` compatible con el Page Engine actual.
5. Remonta el editor para cargar el nuevo prospecto.

Ruta actualizada:

```txt
src/app/admin/page-engine-21stdev/page.tsx
```

Ahora carga:

```txt
PageEngineProspectingStudioHybridClient
```

---

## Comportamiento offline/local

El detector local funciona sin IA y sin conexión para leer el archivo y mostrar los prospectos detectados en pantalla.

Para guardar en la base de datos sí necesita conexión al backend.

Futuro pendiente:

```txt
IndexedDB/localStorage queue
→ guardar temporalmente sin conexión
→ sincronizar al volver internet
```

---

## Reglas para futuras IAs

1. No romper el modo local: siempre debe funcionar sin proveedor IA.
2. Si IA falla, mostrar advertencia y mantener resultados locales.
3. No inventar datos de contacto en modo local.
4. En modo IA, no inventar teléfono/email/web si no aparece en el texto.
5. Toda mejora con IA debe pasar por `/api/admin/prospecting/import/enhance`.
6. La UI debe seguir siendo responsive y sin overflow horizontal.
7. Si cambian los campos detectados, actualizar `types/import.types.ts`, `local-prospect-detector.ts` y este documento.
