# AI_PROJECT_MEMORY.md

Memoria continua del proyecto `thinkfashz/solucionfabrick2.5`.

Este archivo debe ser leido por cualquier IA o desarrollador antes de tocar el codigo. Su objetivo es conservar el contexto, evitar trabajo duplicado, proteger la coherencia del sistema y guiar la modularizacion de la app sin crear cuellos de botella.

---

## 1. Vision del proyecto

SolucionFabrick 2.5 no debe tratarse como una simple landing page ni como una app visual improvisada.

Debe evolucionar como una plataforma modular para negocio real, con:

- web publica comercial;
- panel administrativo;
- sistema multi-tenant;
- pagos;
- emails;
- PWA;
- seguridad de admin;
- observabilidad;
- documentacion continua;
- capacidad de crecer sin que cada nueva mejora rompa lo anterior.

La prioridad no es agregar mas pantallas. La prioridad es construir una base que aguante crecimiento.

---

## 2. Forma correcta de pensar el proyecto

El proyecto debe operar bajo cuatro capas:

1. **Estabilidad**: que compile, que no rompa login, tenant, pagos ni emails.
2. **Seguridad**: proteger sesiones, variables, roles, endpoints y datos.
3. **Modularidad**: separar responsabilidades para evitar archivos gigantes y dependencias cruzadas.
4. **Experiencia**: mejorar diseno, animaciones, PWA y conversion solo despues de estabilizar.

Cualquier IA que empiece por diseno antes de revisar estabilidad esta trabajando fuera de orden.

---

## 3. Nivel actual del proyecto

Estado tecnico observado:

- App basada en Next.js 15, React 19 y TypeScript strict.
- Usa App Router.
- Tiene Sentry configurado.
- Tiene middleware avanzado para admin, CSP, tenants y dominios.
- Tiene scripts de test, e2e, lint, typecheck y build.
- Tiene dependencias potentes pero pesadas.
- Necesita mas validacion, rate limiting, CI/CD, modularizacion y documentacion de cambios.

Nivel actual estimado: **prototipo avanzado / base pre-produccion**.

No es una app basura ni una maqueta simple. Tiene una base fuerte, pero todavia necesita endurecimiento para operar como producto serio.

---

## 4. Filosofia de modularizacion

La app debe modularse para evitar cuellos de botella.

Un cuello de botella aparece cuando:

- un archivo concentra demasiadas responsabilidades;
- un componente visual contiene logica de negocio;
- una API route valida, consulta, transforma y responde sin separar capas;
- una libreria pesada se importa en rutas publicas;
- el admin y la web publica comparten codigo sin limites claros;
- cada mejora crea archivos nuevos sin revisar los existentes;
- no hay documentacion de decisiones.

La modularizacion debe hacerse por dominio y responsabilidad, no por capricho.

---

## 5. Dominios recomendados

La app deberia organizarse gradualmente alrededor de estos dominios:

```txt
src/modules/
  auth/
  admin/
  tenant/
  catalog/
  products/
  checkout/
  payments/
  emails/
  media/
  analytics/
  pwa/
  security/
```

No mover todo de golpe. Migrar solo cuando se toque una zona real del sistema.

Regla: si una mejora toca productos, se puede empezar a ordenar `products`. Si toca pagos, se ordena `payments`. No crear todos los modulos vacios.

---

## 6. Estructura modular sugerida por dominio

Cada modulo importante puede seguir esta forma:

```txt
src/modules/nombre-del-modulo/
  components/      # UI propia del modulo
  server/          # logica server-only
  client/          # logica client-only
  schemas/         # validaciones Zod
  services/        # casos de uso y operaciones
  types.ts         # tipos propios
  constants.ts     # constantes propias
  index.ts         # exportaciones controladas si aplica
```

Ejemplo para productos:

```txt
src/modules/products/
  components/
  server/
  schemas/product.schema.ts
  services/product.service.ts
  types.ts
```

Ejemplo para seguridad:

```txt
src/modules/security/
  server/session.ts
  server/rate-limit.ts
  schemas/login.schema.ts
  types.ts
```

---

## 7. Reglas para evitar archivos innecesarios

Antes de crear un archivo nuevo, la IA debe revisar si ya existe una ubicacion coherente.

No crear:

- copias de componentes existentes;
- versiones `v2`, `final`, `new`, `copy`;
- carpetas vacias;
- servicios sin uso real;
- modulos completos si solo se necesita un ajuste pequeno;
- documentacion dispersa fuera de `docs/`.

Permitido crear archivos nuevos cuando:

- separan una responsabilidad real;
- reducen complejidad de un archivo existente;
- centralizan validacion, seguridad o configuracion;
- documentan una mejora real;
- habilitan pruebas o CI;
- evitan duplicacion futura.

---

## 8. Archivos que toda IA debe leer primero

Antes de modificar codigo:

1. `docs/AI_CONTINUITY_PLAN.md`
2. `docs/AI_PROJECT_MEMORY.md`
3. `package.json`
4. `next.config.mjs`
5. `src/middleware.ts`
6. Ultima nota en `docs/changes/`

Despues de eso, buscar el dominio exacto que se va a tocar.

---

## 9. Prioridades vivas

### Actual prioridad 1

Endurecer entorno y sesion admin.

Tareas:

1. Crear validacion centralizada de variables de entorno.
2. Evitar `ADMIN_SESSION_SECRET` por defecto en produccion.
3. Documentar variables requeridas.
4. Crear nota en `docs/changes/`.
5. Ejecutar pruebas.

### Actual prioridad 2

Preparar modularizacion sin mover todo de golpe.

Tareas:

1. Identificar dominios actuales.
2. Separar server/client cuando se toque codigo.
3. Mover validaciones a schemas.
4. Evitar imports pesados en rutas publicas.

### Actual prioridad 3

CI/CD y calidad.

Tareas:

1. Crear workflow de GitHub Actions.
2. Ejecutar `typecheck`, `lint`, `test`, `build`.
3. Documentar fallos reales.

---

## 10. Como debe documentarse cada avance

Cada mejora debe crear una nota en:

```txt
docs/changes/YYYY-MM-DD-nombre-corto.md
```

La nota debe responder:

- Que se quiso mejorar.
- Que estaba mal o incompleto.
- Que archivos se tocaron.
- Que decision tecnica se tomo.
- Que pruebas se ejecutaron.
- Que queda pendiente.
- Donde debe continuar la siguiente IA.

---

## 11. Formato obligatorio de nota de mejora

```md
# Mejora: Titulo claro

## Fecha
YYYY-MM-DD

## Contexto
Por que se hizo esta mejora.

## Problema real
Que error, riesgo o cuello de botella se ataco.

## Decision tecnica
Que camino se eligio y por que.

## Implementacion
Resumen tecnico de lo cambiado.

## Archivos modificados
- `ruta/archivo`: explicacion.

## Pruebas
- [ ] pnpm typecheck
- [ ] pnpm lint
- [ ] pnpm test
- [ ] pnpm build

## Estado en que queda la app
Explicar si queda estable, parcial o pendiente.

## Siguiente paso
Indicar exactamente por donde continuar.
```

---

## 12. Bitacora de memoria

| Fecha | Evento | Decision | Siguiente paso |
|---|---|---|---|
| 2026-05-15 | Se creo `AI_CONTINUITY_PLAN.md` | El proyecto debe documentar cada mejora y evitar archivos innecesarios | Crear memoria continua y plan de modularizacion |
| 2026-05-15 | Se creo `AI_PROJECT_MEMORY.md` | La app debe modularse gradualmente por dominios, sin mover todo de golpe | Endurecer env y sesion admin |

---

## 13. Regla de continuidad

Toda IA debe dejar el proyecto mas entendible de como lo encontro.

Si modifica codigo, debe documentar.
Si descubre un error, debe anotarlo.
Si no puede ejecutar pruebas, debe decirlo.
Si crea un modulo, debe justificarlo.
Si toca seguridad, debe priorizar minimo cambio y maxima claridad.

---

## 14. Lectura humana del momento del proyecto

El usuario esta pensando en nivel producto/arquitectura, no solo en diseno.

Quiere que la app crezca sin perder coherencia y que cada IA pueda continuar el trabajo sin inventar de cero. Esto exige documentacion viva, modularizacion progresiva y enfoque en errores reales antes de nuevas funciones.

La mejor forma de avanzar es:

1. estabilizar;
2. asegurar;
3. modular;
4. optimizar;
5. mejorar experiencia visual.
