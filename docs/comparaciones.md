# Ejemplos de comparaciones

Esta página documenta comparaciones entre ramas recientes y la rama `main` del proyecto **solucionfabrick2.5**.

---

## Ramas recientes vs `main`

### 1. `copilot/resolver-todos-los-problemas`

**Rama:** `copilot/resolve-all-issues`  
**Comparar:** [`copilot/resolve-all-issues...main`](https://github.com/thinkfashz/solucionfabrick2.5/compare/main...copilot/resolve-all-issues)

**Resumen:** Fusiona `main` en la rama de PR y resuelve todos los conflictos acumulados de los PRs #13–#18, #20–#21. El commit principal consolida las implementaciones faltantes de esos PRs en una sola integración limpia.

**Commit destacado:**
```
d311837 merge: integrate main into PR branch, resolve all conflicts
```

---

### 2. `copilot/fix-fallo-revisado`

**Rama:** `copilot/fix-fallo-revisado`  
**Comparar:** [`copilot/fix-fallo-revisado...main`](https://github.com/thinkfashz/solucionfabrick2.5/compare/main...copilot/fix-fallo-revisado)

**Resumen:** Corrige el workflow de webpack (`.github/workflows/webpack.yml`) para que el build de Next.js se ejecute desde el subdirectorio correcto (`fabrick-store/fabrick-store/`). Sin este fix el job de CI fallaba porque `npm install` y `npm run build` se corrían desde la raíz del repo.

**Commit destacado:**
```
e80a4e5 fix: update webpack.yml to build Next.js app from correct directory
```

---

### 3. `copilot/corrección-del-problema-en-la-solicitud-de-extracción-21`

**Rama:** `copilot/fix-issue-in-pull-request-21`  
**Comparar:** [`copilot/fix-issue-in-pull-request-21...main`](https://github.com/thinkfashz/solucionfabrick2.5/compare/main...copilot/fix-issue-in-pull-request-21)

**Resumen:** Actualiza el workflow de CI para compilar la app Next.js en el directorio correcto (PR #21 reportaba que el build del workflow seguía fallando por la estructura de directorios anidada `fabrick-store/fabrick-store/`).

**Commit destacado:**
```
20e86a5 fix: update CI workflow to build Next.js app in correct directory
```

---

### 4. `copilot/actualizar-dependencias`

**Rama:** `copilot/update-dependencies`  
**Comparar:** [`copilot/update-dependencies...main`](https://github.com/thinkfashz/solucionfabrick2.5/compare/main...copilot/update-dependencies)

**Resumen:** Actualiza Next.js de `14.2.29` a `15.5.15` para corregir vulnerabilidades de DoS conocidas. También agrega un `package.json` mínimo en `fabrick-store/` (directorio externo) para que Vercel detecte correctamente la versión de Next.js antes de ejecutar los comandos de instalación/build.

**Commit destacado:**
```
a5c4eb7 fix: upgrade next from 14.2.29 to 15.5.15 to fix DoS vulnerabilities
```

---

### 5. `copilot/corrección-de-error-en-la-confirmación-45bc035`

**Rama:** `copilot/fix-bug-in-commit-45bc035`  
**Comparar:** [`copilot/fix-bug-in-commit-45bc035...main`](https://github.com/thinkfashz/solucionfabrick2.5/compare/main...copilot/fix-bug-in-commit-45bc035)

**Resumen:** Corrige un bug introducido en el commit `45bc035` ("Integrar Mercado Pago real en checkout"): la pantalla de éxito no se mostraba después de que el usuario volvía desde el flujo de pago de Mercado Pago.

**Commit destacado:**
```
8893784 Fix: success screen not shown after Mercado Pago return
```

---

## Comparación por reflog: `main@{1day}...main`

Muestra todos los commits que llegaron a `main` en las últimas 24 horas:

| SHA | Mensaje |
|-----|---------|
| `7002c8e` | feat: incorporate all missing implementations from PRs #13–#18, #20–#21 |
| `330d67b` | fix: cd into correct subdirectory before npm install in webpack workflow |
| `45bc035` | Integrar Mercado Pago real en checkout |
| `3c45ce5` | feat: add admin module with clientes, reportes, and configuracion pages |
| `3271a41` | feat(animations): install anime.js + upgrade GSAP/motion.dev animations |

**Cómo reproducirlo localmente:**

```bash
git log main@{1day}...main --oneline
```

O con diff completo:

```bash
git diff main@{1day} main
```

---

## Cómo comparar una rama contra `main`

```bash
# Ver commits que están en <rama> pero NO en main
git log main..<rama> --oneline

# Ver diff completo
git diff main...<rama>

# En GitHub
# https://github.com/thinkfashz/solucionfabrick2.5/compare/main...<rama>
```
