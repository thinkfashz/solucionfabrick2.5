# Fabrick Page Engine — Plantillas por nicho

Este módulo permite generar páginas premium desde un JSON mínimo usando `niche`, `industry`, `rubro` o `tipo`.

## Nichos soportados

- `barberia`
- `estetica`
- `construccion`
- `restaurante`
- `hotel`
- `transporte`
- `ecommerce`
- `serviciotecnico`
- `inmobiliaria`

## JSON mínimo esperado

```json
{
  "niche": "estetica"
}
```

## JSON con personalización

```json
{
  "niche": "construccion",
  "title": "Soluciones Fabrick — Remodelaciones y muebles",
  "hero": {
    "headline": "Propuestas de construcción que se entienden y venden",
    "subtitle": "Muestra servicios, garantías, paquetes y llamados de cotización con presencia profesional.",
    "cta": "Cotizar proyecto",
    "href": "/contacto"
  },
  "cta": {
    "title": "Presenta tu obra como una propuesta profesional",
    "buttonText": "Crear propuesta"
  }
}
```

## Resultado esperado

La plantilla genera un objeto compatible con el Page Engine:

- `title`
- `visualPreset`
- `hero`
- `benefits`
- `pricing`
- `stats`
- `testimonials`
- `guarantee`
- `cta`

Ese objeto luego se puede pasar por el flujo normal del motor para producir:

- Hero comercial
- Cards de beneficios
- Paquetes / precios
- Métricas
- Testimonios
- Garantía
- CTA final

## Archivo principal

```txt
src/components/admin/page-engine/premiumNicheTemplates.ts
```

## Función principal

```ts
buildNicheTemplate(rawNiche, overrides)
```

## Siguiente conexión recomendada

En `FabrickPageEngine21stClient.tsx`, antes de normalizar el JSON, se debe detectar:

```ts
const niche = source.niche ?? source.industry ?? source.rubro ?? source.tipo;
```

Si existe, se usa:

```ts
const template = buildNicheTemplate(niche, source);
```

Y luego se pasa ese template por `normalizePage`.
