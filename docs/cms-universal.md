# Universal CMS

This document describes the **universal CMS layer** that powers the
admin-editable chrome of Soluciones Fabrick: navbar, footer, checkout copy,
the producto page chrome, the 404 page, global tokens, and a sitewide
custom-injection block.

It coexists with — and does **not replace** — the page-level CMS for the
home/tienda landing pages (`home_sections` table, edited at `/admin/home`).

## Table

`site_structure (section_key TEXT PRIMARY KEY, content JSONB, version INT,
updated_at TIMESTAMPTZ, updated_by TEXT)`

Created idempotently by `scripts/create-tables.sql` (`site_structure` block) and
forward-compatibly migrated by the `site_structure-migrate` block.

## Section keys

| Key                | Schema (see `src/lib/siteStructureTypes.ts`) | Affects                          |
| ------------------ | -------------------------------------------- | -------------------------------- |
| `global-styles`    | `GlobalStylesContent`                        | CSS variables on `:root`         |
| `nav-menu`         | `NavMenuContent`                             | Top navbar links / CTA           |
| `footer`           | `FooterContent`                              | Footer tagline + legal text      |
| `checkout`         | `CheckoutContent`                            | `/checkout` copy + policies      |
| `producto`         | `ProductContent`                             | `/producto/[id]` chrome labels   |
| `error-404`        | `Error404Content`                            | `/not-found` + `/404-preview`    |
| `custom-injection` | `CustomInjectionContent`                     | Sitewide HTML/CSS/JS (admin-only)|

Defaults colocate with each schema and **mirror the literal copy that was
hardcoded before this CMS existed**, so an empty `site_structure` table
behaves identically to the pre-CMS build.

## Reads

- **Server components** call `getSiteSection(key)` from `src/lib/siteStructure.ts`.
  Memoised per request via `React.cache`. Always returns
  merged-with-defaults content; never throws.
- **Client components** call `useSiteContent(key)` from
  `src/hooks/useSiteContent.ts`. Resolution order:
  1. The `SiteConfigProvider` cache (SSR initial bundle for `nav-menu` +
     `global-styles`, populated server-side in `RootLayout`).
  2. SWR-style fetch from `/api/site-structure/[key]` on mount.
  3. Defaults from `SECTION_DEFAULTS`.

## Writes

- Only via `POST /api/admin/site-structure/[key]`, gated by the
  `admin_session` cookie.
- Persists through `setSiteSection` and publishes a `cmsBus` event with topic
  `'settings'`, so the existing `CmsRealtimeListener` triggers a soft
  `router.refresh()` on every connected public tab.

## Live preview (`/admin/editor`)

The admin editor is a two-pane page at `/admin/editor`:

- **Left**: section picker → form generated from
  `src/components/admin/editor/SectionForms.tsx`.
- **Right**: an `<iframe>` whose `src` is the public route most relevant to
  the chosen key, with `?cms=preview`.

### postMessage contract

The editor and the preview iframe communicate via `window.postMessage`:

| Type                  | Direction        | Payload                                      | When                                            |
| --------------------- | ---------------- | -------------------------------------------- | ----------------------------------------------- |
| `cms:preview-ready`   | iframe → opener  | `{ type }`                                   | Posted on iframe mount, after listener attaches |
| `cms:preview`         | opener → iframe  | `{ type, section_key, content }`             | Posted on every form change                     |

Security:
- **Origin-locked**: both sides reject any message whose `event.origin` does
  not match `window.location.origin`.
- **Preview-only**: `SiteConfigProvider` only attaches the listener when the
  page was mounted with `?cms=preview` in the query string. Production
  visitors never overlay any postMessage content even if a forged message
  somehow arrived at same-origin (defence in depth).

## Custom Injection

`custom-injection` is the only section that ships executable code. The render
path is in `src/components/CustomInjectionRoot.tsx`, mounted twice from
`RootLayout`:

- `<CustomInjectionRoot slot="head" />` injects `css` + `head.html`.
- `<CustomInjectionRoot slot="bodyEnd" />` injects `bodyEnd.html` + `bodyEnd.js`.

Constraints:
- Defaults to `enabled: false`. When false, **zero markup** is emitted.
- The inline `<script>` carries the per-request CSP nonce
  (`headers().get('x-nonce')`), so the strict nonce-CSP allows it.
- Writes are admin-gated; the editor adds an "I understand" checkbox before
  letting the admin flip `enabled`.
- `updated_by` is persisted with every save for audit.

## Adding a new section

1. Add its TS type, default, and entry in `SECTION_KEYS` /
   `SECTION_DEFAULTS` in `src/lib/siteStructureTypes.ts`.
2. Add a form component in
   `src/components/admin/editor/SectionForms.tsx` and route it from the
   `SectionForm` switch.
3. (Optional) Extend `PREVIEW_PATHS` in
   `src/app/admin/editor/EditorClient.tsx` if the new key is best previewed
   on a non-default page.
4. Consume it from your component via `useSiteContent('your-key')` (client)
   or `getSiteSection('your-key')` (server).
