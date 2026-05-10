# Plan de salida de InsForge

> Última actualización: **2026-05-09**.

InsForge es BaaS gestionado (Postgres + auth + storage detrás de PostgREST). Es una **dependencia dura** del repositorio: `src/lib/insforge.ts` instancia el SDK con URL/anon-key con fallback hardcoded y cualquier endpoint del catálogo lo usa transitivamente.

Este documento describe el plan **si y sólo si** se decide migrar a un Postgres autogestionado (Supabase, Neon, RDS, Postgres en bare-metal). No es una recomendación; es una hoja de ruta para que la decisión sea reversible y rastreable.

---

## 1. Por qué (motivos válidos)

- **Lock-in**: SDK propietario. Si InsForge cambia API, sube precios, o cierra, el codebase queda atado.
- **Ecosistema**: Postgres directo abre acceso a Drizzle/Prisma migrations, herramientas de observabilidad estándar (pgBadger, pg_stat_statements), y a un mercado de proveedores intercambiables.
- **RLS real**: InsForge **no** soporta `auth.jwt()`/RLS (memoria viva: `insforge sql limits`). Toda autorización ocurre hoy en API key + cookies. Postgres + Supabase/PostgREST con RLS permitiría defensa en profundidad a nivel de fila.

## 2. Por qué NO (motivos válidos)

- Hoy el proyecto es 1 desarrollador + ramas `copilot/*`. InsForge ahorra ops (backups, TLS, schema introspection, dashboards).
- El SDK ya está instanciado en 80+ archivos. Migrar es trabajo no trivial, sin valor para el cliente final.
- El cifrado AES-GCM de credenciales (Fase 2A) ya cubre el riesgo de "dump del Postgres expone tokens".

> **Default**: quedarse en InsForge. Activar este plan **solo** si aparece un disparador de la sección 3.

---

## 3. Disparadores que justificarían ejecutar este plan

- 📈 **Costo**: facturación InsForge > USD 200/mes (Vercel Hobby todavía justifica 1 proveedor).
- 🚪 **EOL anuncio**: InsForge anuncia sunset o cambio de pricing >2x.
- 🔒 **Compliance**: requisito legal/contractual de _bring-your-own-Postgres_ (HIPAA, certificaciones LATAM).
- 🐌 **Latencia**: p95 de queries cross-Atlántico se vuelve incompatible con UX (>500ms en /api/checkout).
- 🧨 **Incidente**: pérdida de datos sin RPO documentado.

---

## 4. Plan en 5 fases

### Fase 0 — Auditoría (1 semana)

1. Inventariar **todos** los lugares donde se usa el SDK:
   ```bash
   grep -rn "from '@insforge/sdk'" src/ | wc -l
   grep -rn "insforge\." src/lib/ src/app/ | wc -l
   ```
2. Listar tablas que tienen FK implícitas (PostgREST no las refleja en el SDK; revisar `scripts/create-tables.sql`).
3. Backup completo (`pg_dump` desde el dashboard InsForge, formato `--format=custom`) y validar restore en un Postgres local de prueba.
4. Decidir destino: **Supabase** (más cercano, RLS nativo) o **Neon/RDS** (más generalista).

### Fase 1 — Fachada DB (2 semanas, **PR independiente**)

Introducir `src/lib/db/` como capa de abstracción **antes** de migrar:

```
src/lib/db/
├── index.ts          // export const db: DbClient (interface)
├── insforge.ts       // implementación actual (default)
└── postgres.ts       // implementación nueva (futura)
```

- `DbClient` expone `from(table).select/insert/update/delete/upsert` con la misma firma que el SDK actual.
- Todos los archivos que hoy hacen `import { insforge } from '@/lib/insforge'` migran a `import { db } from '@/lib/db'`.
- `insforge.auth.signInWithPassword` se envuelve en `db.auth.signIn(...)`.
- **Test gate**: cobertura de `src/lib/db/` >= 80 % antes de mergear.

> Esta fase es valor neto **sin migrar**: aísla el lock-in y permite testear con un mock unificado.

### Fase 2 — Setup del Postgres destino (1 semana)

1. Provisionar Supabase project / Neon DB / RDS según decisión de Fase 0.
2. Aplicar `scripts/create-tables.sql` tal cual (es idempotente y compatible con Postgres puro).
3. Si se migra a Supabase: traducir el filtrado a **RLS** real en lugar de "API key + cookie":
   ```sql
   ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "public_read" ON productos FOR SELECT USING (true);
   CREATE POLICY "admin_write" ON productos FOR ALL
     USING (auth.jwt() ->> 'role' = 'admin');
   ```
4. Restaurar dump (sin filas de `admin_users` — los hashes scrypt usan `ADMIN_PASSWORD_PEPPER` que se rota).
5. Re-correr CLIs: `admin:set-password`, `admin:enable-totp`, `admin:generate-backup-codes`.

### Fase 3 — Doble escritura (2-3 semanas)

1. Implementar `src/lib/db/postgres.ts` (con `pg` o `postgres-js`).
2. Configurar feature flag `DB_BACKEND=insforge|postgres|both` en `db/index.ts`.
3. Modo `both`: cada `insert/update/delete` se ejecuta en **ambos** backends; las lecturas siguen viniendo de InsForge.
4. Correr en `both` por al menos **2 semanas** en producción para detectar drifts.

### Fase 4 — Cutover (1 día programado)

1. Pre-cutover: `scripts/migrate-final-delta.ts` que copia las filas modificadas en el último intervalo de doble escritura (timestamps `updated_at`).
2. Cambiar `DB_BACKEND=postgres` en Vercel.
3. Smoke tests del runbook (`docs/deploy-runbook.md §6`).
4. Mantener InsForge como **read-replica de emergencia** durante 30 días.

### Fase 5 — Decommission (mes +1)

1. Borrar `src/lib/db/insforge.ts`, `src/lib/insforge.ts`, `src/lib/insforge-admin.ts`, `src/lib/insforgeAuth.ts`.
2. Eliminar `@insforge/sdk` de `package.json`.
3. Cancelar el proyecto InsForge.
4. Actualizar `docs/architecture.md`, `docs/inventory.md`, este documento (Fase 5 → "completed YYYY-MM-DD").

---

## 5. Riesgos identificados

| Riesgo                                            | Mitigación                                                                  |
|---------------------------------------------------|------------------------------------------------------------------------------|
| Drift entre dumps durante doble escritura         | Reconciliación final por `updated_at`; snapshot de `orders` antes del cutover. |
| `gen_random_uuid()` no disponible en destino     | `CREATE EXTENSION IF NOT EXISTS pgcrypto` (estándar en Supabase/Neon/RDS).   |
| Auth: invalidación de sesiones                    | Forzar logout (vaciar `fabrick_admin_session`) en cutover; comunicar 24 h antes a operadores. |
| Pérdida de RLS implícita de InsForge              | Usar Supabase RLS o, si se va a Postgres puro, mantener filtrado en cookies + revisar cada `route.ts` admin. |
| Costo Postgres > InsForge                         | Provisionar tamaño mínimo; pgBouncer; observabilidad de queries lentas.       |

---

## 6. Reversibilidad

Hasta el final de la Fase 4, **todo el plan es reversible**:

- Fase 1 (fachada): reversible ⇄ basta con seguir usando `insforge.ts` adentro.
- Fase 2 (setup): no toca producción.
- Fase 3 (doble escritura): si una escritura falla en uno de los dos backends, el modo `both` debe registrar el delta para reconciliación, no romper la request.
- Fase 4 (cutover): si algo falla en las primeras 24h, `DB_BACKEND=insforge` revierte sin pérdida (porque el modo `both` mantenía a InsForge actualizado hasta T-1 hora).

A partir de Fase 5, la reversión requiere un nuevo `pg_dump` → restore en un nuevo proyecto InsForge.

---

## 7. Estimación de esfuerzo

| Fase                       | Esfuerzo (1 dev)         | Riesgo |
|----------------------------|--------------------------|--------|
| 0 — Auditoría              | 1 semana                 | Bajo   |
| 1 — Fachada DB             | 2 semanas                | Medio (toca 80+ archivos) |
| 2 — Setup destino          | 1 semana                 | Bajo   |
| 3 — Doble escritura        | 2-3 semanas + 2 sem run  | Alto (es el corazón del plan) |
| 4 — Cutover                | 1 día programado         | Alto si Fase 3 no fue limpia |
| 5 — Decommission           | 1 semana                 | Bajo   |
| **Total**                  | **~10 semanas activas + 2 sem observación** |  |

---

## 8. Decisión actual

> **Hoy (2026-05-09): seguir en InsForge.** Ningún disparador de la sección 3 está activo. El cifrado AES-GCM (Fase 2A) y el env-map (Fase 2B) ya cubren los riesgos de "dump expone tokens" y "lock-in de variables".
>
> Si en el futuro se decide ejecutar este plan, abrir un PR con la **Fase 1** (fachada DB) primero — es valor neto incluso sin migrar.
