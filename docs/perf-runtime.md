# Runtime selection for serverless API routes

Esta nota documenta qué endpoints corren en **Edge** vs **Node.js**, y por qué.
Sirve como guía cuando se agreguen o modifiquen rutas en `src/app/api/**`.

## Reglas generales

1. **Por defecto: `nodejs`.** No declarar nada equivale a Node.js. Es el runtime
   compatible con todas las dependencias del proyecto (nodemailer, web-push,
   mercadopago SDK, jspdf, cheerio, isomorphic-dompurify…).
2. **`edge` solo si todas las dependencias son web-standard** (fetch, Web
   Crypto, Streams, URL/Headers/Request/Response). Cualquier import de
   `node:*`, `fs`, `crypto`, `path`, `child_process`, `nodemailer`, `web-push`,
   `mercadopago`, `jspdf`, `cheerio`, `isomorphic-dompurify`, `gray-matter`
   o `marked` (en su variante con `dompurify` server-side) descarta `edge`.
3. **SSE / streaming larga (`/api/cms/events`) se queda en Node** — las
   conexiones long-lived no se benefician de Edge y los workers de Edge
   tienen límites estrictos de duración.

## Resultado de la auditoría (PR de optimización móvil)

| Ruta                | Runtime      | Resultado | Notas                                                                                          |
| ------------------- | ------------ | --------- | ---------------------------------------------------------------------------------------------- |
| `/api/productos`    | **`edge`** ✅ | OK        | `next build` pasa. Solo usa `@insforge/sdk` (fetch puro) + `NextResponse`. Sin APIs de Node.   |
| `/api/cms/events`   | `nodejs`     | NO TOCAR  | SSE long-lived. Mantener.                                                                      |
| `/api/proyectos`    | `nodejs`     | OK        | Usa `unstable_cache` + `revalidateTag` + `@insforge/sdk`. Funciona en Node, no se cambia.      |
| Resto de `/api/**`  | `nodejs`     | OK        | La mayoría tocan nodemailer, mercadopago, jspdf, cheerio o el SDK admin con headers de Node.   |

> **Por qué solo `/api/productos`:** es el único endpoint público de la home/
> tienda con tráfico alto, sin dependencias de Node, y donde la latencia P50
> impacta directo el TTFB del catálogo en móvil. Para el resto el costo de
> migrar (auditar deps, probar, mantener dos runtimes) supera la ganancia.

## Cómo verificar localmente

```bash
npm run build
# Buscar la ruta en el output. Si aparece bajo "ƒ" sin error y sin
# "Failed to compile", el runtime declarado funcionó.
```

Una vez deployado, la cabecera `x-vercel-execution-region` (o el panel de
Vercel) muestra dónde corrió la invocación.

## Rollback rápido

Si una ruta marcada `edge` empieza a fallar tras añadir una dependencia que
no es compatible:

```ts
// src/app/api/<ruta>/route.ts
export const runtime = 'nodejs'; // ← rollback explícito
```

y borrar la línea `export const runtime = 'edge'`.
