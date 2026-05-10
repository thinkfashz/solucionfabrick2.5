# Guía de contribución — Soluciones Fabrick

¡Gracias por contribuir! Este documento describe el flujo de trabajo, las convenciones de commit y el checklist de PR que usamos en este repositorio.

> Si solo quieres reportar un bug o pedir una funcionalidad, revisa primero los [templates de issues](./.github/ISSUE_TEMPLATE/) o el [template de seguridad](./.github/ISSUE_TEMPLATE/security_report.md).

---

## 1. Antes de empezar

1. Lee el [`README.md`](./README.md) para entender el stack y cómo correr el proyecto local.
2. Revisa la [`docs/inventory.md`](./docs/inventory.md) para saber qué módulos viven en `main` y cuáles están en ramas paralelas.
3. Si tu cambio afecta seguridad, datos personales o credenciales, lee también [`docs/security-private-mode.md`](./docs/security-private-mode.md).

---

## 2. Flujo de trabajo (branching)

- La rama base es **`main`**.
- Trabajamos con ramas cortas con prefijo por intención:
  - `feat/<scope>-<descripcion-corta>` para nuevas funcionalidades
  - `fix/<scope>-<descripcion-corta>` para correcciones
  - `chore/<scope>-<descripcion-corta>` para tareas no funcionales (CI, deps, docs)
  - `docs/<scope>-<descripcion-corta>` para documentación pura
  - `test/<scope>-<descripcion-corta>` para añadir/cambiar tests

Ejemplo: `feat/admin-rotate-resend-key`, `fix/checkout-mp-webhook-422`.

- **No** reescribas la historia de `main` (no `git push --force` a `main`). Sí está permitido `--force-with-lease` en tu propia rama de PR.
- Mantén el PR pequeño y enfocado: una intención por PR. Si encuentras un bug ortogonal, abre PR aparte.

---

## 3. Convenciones de commit (Conventional Commits)

Usamos [Conventional Commits 1.0](https://www.conventionalcommits.org/es/v1.0.0/) para que el `CHANGELOG.md` se pueda generar (semi-)automáticamente.

Formato:

```
<tipo>(<scope opcional>): <resumen en imperativo>

<cuerpo opcional explicando el porqué>

<footer opcional con BREAKING CHANGE / refs a issues>
```

Tipos aceptados:

| Tipo       | Cuándo usarlo                                                            |
|------------|--------------------------------------------------------------------------|
| `feat`     | Nueva funcionalidad visible para el usuario o el admin                   |
| `fix`      | Corrección de bug                                                        |
| `docs`     | Cambios solo de documentación                                            |
| `style`    | Formato (Prettier/ESLint), sin cambio de comportamiento                  |
| `refactor` | Reorganización interna sin cambio de comportamiento                      |
| `perf`     | Mejora de rendimiento                                                    |
| `test`     | Añadir o actualizar tests                                                |
| `build`    | Cambios al sistema de build o dependencias (`package.json`, `Dockerfile`)|
| `ci`       | Cambios a workflows de GitHub Actions o Vercel                           |
| `chore`    | Tareas misceláneas que no encajan arriba                                 |
| `security` | Cambios estrictamente de seguridad (TOTP, hashing, audit log, etc.)      |
| `revert`   | Revertir un commit anterior                                              |

Ejemplos válidos:

```
feat(admin): añadir códigos de respaldo TOTP
fix(checkout): aceptar webhook MP con cuerpo vacío
docs(security): runbook de rotación de pepper
chore(deps): bump next 15.5.15
```

**Breaking changes:** indícalos en el footer con `BREAKING CHANGE: <descripción>` o agrega `!` después del tipo (`feat!:`).

---

## 4. Antes de abrir el PR

Ejecuta localmente:

```bash
npm install
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest unit tests
npm run build          # Next build (catch issues que tsc no detecta)
```

Si tu cambio toca el flujo público (landing, tienda, admin), idealmente corre también:

```bash
npm run test:e2e       # Playwright (necesita app corriendo en localhost:3000)
```

Si añades código nuevo a `src/lib/`, **añade tests unitarios** en `tests/unit/` siguiendo el patrón de los existentes (ej. `tests/unit/integrationsCrypto.test.ts`).

---

## 5. Checklist de PR

Tu PR debe cumplir:

- [ ] Rama actualizada con `main` (sin conflictos)
- [ ] Título sigue Conventional Commits
- [ ] La descripción explica **qué** cambia y **por qué**, no solo el "cómo"
- [ ] Hay tests para el cambio (unit y/o e2e), o se justifica explícitamente por qué no
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pasan localmente
- [ ] Si tocas tablas, actualizaste `scripts/create-tables.sql` con bloques `CREATE TABLE IF NOT EXISTS` (InsForge **no** soporta sintaxis `auth.uid()` ni RLS — ver [memoria interna](./docs/security-private-mode.md))
- [ ] Si tocas crons en `vercel.json`, mantienes la cadencia ≥ 24 h (Hobby plan)
- [ ] Si tocas integraciones, leíste la convención de `src/lib/integrationsEnvMap.ts` (env vars siempre prefieren env sobre DB)
- [ ] Si tocas credenciales en DB, las escribiste con `encryptCredentials(...)` y las lees con `decryptCredentials(...)`
- [ ] Si añades una rama terminal a `/api/admin/login`, también añades su `audit(...)` correspondiente
- [ ] Actualizaste `CHANGELOG.md` (sección `## [Unreleased]`) si el cambio es visible al usuario/admin

---

## 6. Code review

- Cualquier PR a `main` requiere al menos **1 review** de un CODEOWNER (ver [`.github/CODEOWNERS`](./.github/CODEOWNERS)).
- Resuelve los hilos de review antes de pedir merge nuevo.
- Para cambios sensibles (auth, pagos, OAuth, cifrado), pide review adicional al área correspondiente.

---

## 7. Reportar vulnerabilidades

**No abras un issue público para vulnerabilidades.** Usa el [template privado de seguridad](./.github/ISSUE_TEMPLATE/security_report.md) o contacta directamente al maintainer principal indicado en `CODEOWNERS`.

---

## 8. Licencia y propiedad

Al contribuir aceptas que tu código se publica bajo la misma licencia del repositorio. Todo el código y assets son propiedad de Soluciones Fabrick salvo indicación contraria en archivos individuales.
