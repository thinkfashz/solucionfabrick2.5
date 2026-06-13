# Módulo 01 — Prospectos en base de datos + Importador desde ChatGPT

## Propósito

Este módulo permite guardar prospectos comerciales reales en base de datos e importar listas generadas por ChatGPT.

La meta es que Eduardo pueda pedir en ChatGPT:

```txt
Búscame 15 prospectos de clínicas dentales en Linares con probabilidad alta/media/baja.
```

Luego ChatGPT entrega un JSON estructurado y el panel puede importarlo para guardarlo en la tabla `prospects`.

---

## Estado

```txt
Implementado base: 2026-06-13
```

Incluye:

- Tipos TypeScript.
- Configuración de estados y probabilidades.
- Normalizador de prospectos.
- Servicio de tabla SQL.
- Servicio cliente para consumir APIs.
- API CRUD de prospectos.
- API de importación de prospectos desde JSON/ChatGPT.
- Documentación inicial.

---

## Archivos implementados

```txt
src/modules/prospecting-engine/types/prospect.types.ts
src/modules/prospecting-engine/config/statuses.ts
src/modules/prospecting-engine/utils/prospect-importer.ts
src/modules/prospecting-engine/services/prospect-table.server.ts
src/modules/prospecting-engine/services/prospect.service.ts
src/modules/prospecting-engine/index.ts
src/app/api/admin/prospecting/prospects/route.ts
src/app/api/admin/prospecting/import/route.ts
```

---

## Tabla `prospects`

La tabla se crea automáticamente al llamar a las APIs del módulo.

Campos:

```txt
id TEXT PRIMARY KEY
brand TEXT NOT NULL
client_name TEXT
industry TEXT
city TEXT
region TEXT
country TEXT DEFAULT 'Chile'
instagram TEXT
facebook TEXT
website TEXT
whatsapp TEXT
email TEXT
followers TEXT
rating TEXT
source TEXT DEFAULT 'manual'
problem_detected TEXT
opportunity TEXT
probability_level TEXT DEFAULT 'media'
score INTEGER DEFAULT 50
status TEXT DEFAULT 'nuevo'
notes TEXT
metadata JSONB DEFAULT '{}'
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
```

Índices:

```txt
idx_prospects_updated_at
idx_prospects_status
idx_prospects_probability
idx_prospects_city
idx_prospects_industry
idx_prospects_brand
```

---

## Estados comerciales

```txt
nuevo
analizado
demo_generada
contactado
respondio
interesado
cliente
rechazado
archivado
```

---

## Probabilidad de compra

```txt
alta
media
baja
```

Criterios sugeridos para ChatGPT:

```txt
Alta:
- Tiene Instagram activo.
- Tiene seguidores.
- Tiene WhatsApp visible.
- No tiene web o su web es pobre.
- Servicio de ticket medio/alto.
- Publica con frecuencia.

Media:
- Tiene presencia digital pero no suficiente urgencia.
- Tiene web básica.
- Hay datos incompletos.

Baja:
- No tiene contacto claro.
- No se ven señales de inversión en marketing.
- Poca actividad o negocio muy pequeño.
```

---

## API: listar prospectos

```txt
GET /api/admin/prospecting/prospects
```

Filtros opcionales:

```txt
?q=
?status=
?probability=
?city=
?industry=
```

Respuesta:

```json
{
  "ok": true,
  "connected": true,
  "table": "prospects",
  "prospects": []
}
```

---

## API: crear prospecto

```txt
POST /api/admin/prospecting/prospects
```

Body:

```json
{
  "brand": "Clínica Dental Ejemplo",
  "city": "Linares",
  "industry": "clínica dental",
  "instagram": "https://instagram.com/ejemplo",
  "whatsapp": "+56900000000",
  "probability_level": "alta",
  "score": 87,
  "status": "nuevo"
}
```

---

## API: actualizar prospecto

```txt
PUT /api/admin/prospecting/prospects
```

Body:

```json
{
  "id": "prospect_xxxxx",
  "brand": "Nuevo nombre",
  "status": "contactado"
}
```

---

## API: eliminar prospecto

```txt
DELETE /api/admin/prospecting/prospects?id=prospect_xxxxx
```

---

## API: importar desde ChatGPT

```txt
POST /api/admin/prospecting/import
```

Puede recibir directamente el objeto o un campo `raw` con texto JSON.

Formato recomendado:

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

Respuesta:

```json
{
  "ok": true,
  "connected": true,
  "table": "prospects",
  "source": "chatgpt",
  "imported": 1,
  "skipped": 0,
  "errors": [],
  "prospects": []
}
```

---

## Normalizador

Archivo:

```txt
src/modules/prospecting-engine/utils/prospect-importer.ts
```

Acepta variantes en español e inglés:

```txt
brand / name / nombre / business / company / empresa
industry / rubro / niche / nicho
city / ciudad
problem_detected / problem / problema / dolor
opportunity / oportunidad / solution / solucion
probability_level / probabilidad / probability
score / puntaje / opportunity_score
status / estado
notes / notas / observaciones
```

Esto permite que ChatGPT entregue JSON flexible sin romper la importación.

---

## Servicio cliente

Archivo:

```txt
src/modules/prospecting-engine/services/prospect.service.ts
```

Funciones:

```txt
listProspects(filters)
createProspect(input)
updateProspect(id, patch)
deleteProspect(id)
importProspects(payload)
```

Estas funciones serán llamadas desde la UI del Page Engine para dejar de depender de `localStorage`.

---

## Pendiente del módulo 01

- Conectar la UI actual a `listProspects`.
- Agregar panel visual “Importar desde ChatGPT”.
- Mostrar filtros visuales por estado, ciudad, rubro y probabilidad.
- Asociar prospecto con documentos en `page_engine_documents` o crear tabla `prospect_pages` en módulo posterior.

---

## Reglas para futuras IAs

Cuando una IA trabaje en este módulo debe:

1. No mezclar lógica dentro de `/admin/page-engine-21stdev`.
2. Crear o modificar archivos dentro de `src/modules/prospecting-engine/`.
3. Actualizar este documento si cambia la estructura, campos, endpoints o comportamiento.
4. Mantener compatibilidad con JSON generado por ChatGPT.
5. No guardar API keys en frontend.
6. No romper el importador de HTML exacto ya existente.
