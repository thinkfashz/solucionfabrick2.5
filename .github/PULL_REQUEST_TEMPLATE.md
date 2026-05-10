<!--
Gracias por tu PR. Completa las secciones aplicables.
Borra las secciones que no apliquen — pero NO borres el checklist final.
-->

## ¿Qué cambia?

<!-- Resumen de 1-3 líneas. Ej: "Añade rotación de API key de Resend desde /admin/integraciones." -->

## ¿Por qué?

<!-- Contexto / problema / objetivo. Enlaza issue si existe: Closes #123 -->

## ¿Cómo se probó?

<!--
Comandos ejecutados localmente y resultado.
Para cambios visuales, adjunta screenshot o video corto.
Para cambios de API, adjunta ejemplo de request/response.
-->

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] (opcional) `npm run test:e2e`

## Notas para el reviewer

<!-- ¿Hay archivos grandes que ignorar? ¿Decisiones de diseño que requieren feedback? ¿Cambios de schema en DB? -->

---

## Checklist obligatorio

- [ ] Título sigue Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, etc.)
- [ ] Rama base es `main` y está actualizada
- [ ] Cambio enfocado (una intención por PR)
- [ ] Hay tests para el cambio o se justifica por qué no
- [ ] Si toco `scripts/create-tables.sql`, uso `CREATE TABLE IF NOT EXISTS` (InsForge no soporta RLS)
- [ ] Si toco crons en `vercel.json`, la cadencia es ≥ 24 h (Hobby plan)
- [ ] Si toco credenciales, uso `encryptCredentials` / `decryptCredentials`
- [ ] Si añado una rama terminal a `/api/admin/login`, añado su `audit(...)`
- [ ] Actualicé `CHANGELOG.md > [Unreleased]` si el cambio es visible

## Tipo de cambio

- [ ] 🐛 Bug fix (no breaking)
- [ ] ✨ Feature (no breaking)
- [ ] 💥 Breaking change (requiere migración o cambio de env vars — descrito en el cuerpo)
- [ ] 📝 Docs / chore / CI / refactor / test
- [ ] 🔒 Security
