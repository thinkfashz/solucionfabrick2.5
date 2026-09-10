# Soluciones Fabrick — SEO, AEO / AI Search y Pay Per Crawl

Estado: preparado en código. No activar Pay Per Crawl ni cerrar el PR sin completar el gate de validación.

## Principio

Google Search no requiere un marcado especial para AI Overviews o AI Mode. La estrategia de Fabrick se basa en:
- SEO técnico rastreable e indexable.
- contenido propio y no genérico;
- respuestas directas visibles;
- metodología y límites visibles;
- fuentes técnicas externas;
- enlaces internos entre herramienta → explicación → producto → presupuesto;
- datos estructurados que coincidan con el contenido visible.

`llms.txt` se mantiene únicamente como compatibilidad secundaria para sistemas que lo consuman. Google declara que no lo usa como señal especial de ranking ni para AI Search.

## Capa implementada

- `/centro-tecnico`: hub humano y rastreable de metodología, fuentes y límites.
- panel técnico bajo BTU, radier, Metalcon y simulador sísmico.
- JSON-LD de WebSite, WebPage, WebApplication, BreadcrumbList y CollectionPage/ItemList.
- sitemap incluye el centro técnico y las herramientas.
- `public/llms.txt` resume fuentes canónicas y reglas de interpretación.
- el loader deja de comunicar que el sitio está "preparándose".
- contrato `seoAuthorityContract` protege estos elementos contra regresiones.

## Pay Per Crawl

Cloudflare AI Crawl Control / Pay Per Crawl se configura fuera de Vercel. Al 2026-09-10 el producto continúa en beta cerrada.

El repositorio incluye `infra/cloudflare/pay-per-crawl-worker.js` como plantilla opcional para pricing dinámico. No se despliega automáticamente.

Recomendación inicial:
1. Mantener gratis la Home, `robots.txt`, `sitemap.xml`, `llms.txt` y páginas de descubrimiento.
2. Nunca cobrar ni bloquear crawlers de motores de búsqueda cuando se quiera preservar indexación.
3. Si Cloudflare habilita Pay Per Crawl, empezar solo con contenido técnico de alto valor.
4. Activar precios desde Cloudflare, no desde Vercel.
5. Verificar 402/200 y headers `crawler-price` / `crawler-charged` en un entorno controlado.

## Gate obligatorio antes de cerrar PR #310

No cerrar ni fusionar PR #310 solo porque el código "se vea correcto".

Ejecutar primero:

```bash
pnpm pr:preclose
```

Luego, cuando Vercel vuelva a aceptar builds:
- preview del SHA exacto debe quedar READY;
- smoke 200 de `/`, `/centro-tecnico`, `/herramientas/aire-acondicionado`, `/herramientas/radier`, `/herramientas/metalcon`, `/herramientas/metalcon/monitoreo`, `/proyectos`, `/presupuesto` y `/tienda`;
- revisar desktop y móvil;
- validar que checkout, reserva de stock y Mercado Pago no cambiaron;
- revisar `robots.txt`, `sitemap.xml` y JSON-LD;
- validar Rich Results / URL Inspection cuando el código llegue a producción;
- verificar que el texto visible coincide con el structured data;
- volver a revisar el diff completo del PR antes de fusionar.

Si cualquier punto falla, el PR permanece abierto.
