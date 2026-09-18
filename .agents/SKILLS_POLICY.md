# Project Agent Skills Policy

This repository vendors third-party agent skills under `.agents/skills/`.

## Mandatory routing

For every task in this repository, first determine whether the work touches frontend, UI, UX, visual design, motion, animation, gestures, interaction design, responsive behavior, or visual polish.

If yes, before implementation you MUST consult:

1. `.agents/skills/design-taste-frontend/SKILL.md`
2. `.agents/skills/impeccable/SKILL.md`
3. `.agents/skills/emil-design-eng/SKILL.md`

Then load the relevant specialized skill/reference for the task:
- Web animation or gesture work: `.agents/skills/animate/SKILL.md`
- Animation review: `.agents/skills/review-animations/SKILL.md`
- Finding motion opportunities: `.agents/skills/find-animation-opportunities/SKILL.md`
- Improving existing motion: `.agents/skills/improve-animations/SKILL.md`
- UI library choice: `.agents/skills/pick-ui-library/SKILL.md`
- Mobile-native UI: `.agents/skills/mobile-native/SKILL.md`
- Expo / React Native motion: `.agents/skills/animate-expo/SKILL.md`
- Apple-native design: `.agents/skills/apple-design/SKILL.md`
- Swift implementation: `.agents/skills/write-swift/SKILL.md`
- Prototype work: `.agents/skills/prototype/SKILL.md`
- Impeccable refinements: load the matching file under `.agents/skills/impeccable/reference/`; for UI edits always consult `craft-floor.md` before implementation.

For backend-only, database-only, DevOps-only, billing-only, or other non-visual tasks, evaluate these skills but do not force irrelevant visual rules.

## Precedence

When rules conflict, use this order:

1. The user's explicit current request.
2. Root `AGENTS.md` and repository-specific constraints.
3. Existing product/brand truth in the codebase and assets.
4. Installed third-party skills.
5. Generic framework defaults.

Concrete consequence: this repository currently requires Tailwind CSS 3.4. A vendored skill's generic preference for Tailwind v4 does NOT override that project rule.

Do not replace the established Soluciones Fabrick brand with a skill author's default aesthetic. Skills improve craft; they do not redefine the product.

## Impeccable integration note

This repository vendors Impeccable's rule corpus and the references most relevant to product/frontend work. The upstream executable/browser support bundle is intentionally not vendored here. Do not fail a design task because the upstream `scripts/impeccable context` launcher is unavailable. Instead, inspect the current repository/product directly and read the relevant vendored reference files. If a routed Impeccable reference is not present locally, consult the upstream repository before proceeding.

Upstream: https://github.com/pbakaus/impeccable

## Motion performance rule

For continuous pointer/touch/scroll/3D interactions, never drive frame-by-frame values through React state. Keep continuous values in the rendering/animation layer (Three.js, Motion values, WAAPI, Reanimated, or equivalent) and synchronize React only at semantic state boundaries.

## Verification

Before shipping visual work:
- inspect the existing implementation before redesigning;
- preserve established brand tokens unless the user explicitly changes them;
- verify responsive/mobile behavior;
- respect reduced-motion/accessibility;
- prefer transform/opacity for high-frequency motion;
- check package.json before importing a new dependency;
- finish with a visual/craft pass rather than stopping at functional correctness.
