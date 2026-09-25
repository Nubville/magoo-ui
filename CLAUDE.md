# CLAUDE.md

Magoo UI is a design system whose unit of delivery is a Drupal single directory component (SDC). Drupal is the
consumer and there is **no build step for consumers**. Vite, Storybook and Vitest are dev-only.

## Principles (carried over from the original custom-elements plan, see docs/old-plan.md)

1. Components ship as authored: `.twig`, `.css`, optional `.js`, `.component.yml`. Nothing compiled is ever committed or required.
2. One directory per component: `components/<name>/<name>.{component.yml,twig,css,js}` plus dev-only `.stories.js` and `.test.js`.
3. Twig renders an undefined custom element `<mg-<name>>`. Attributes are variants, custom properties are the public API.
4. Baseline first, enhance second: fallback declarations first, then `light-dark()`, `color-mix()`, transitions and so on behind `@supports`.
5. Native elements do the semantics (`<button>`, `<dialog>`, `<details>`). JS is the last tier and optional.

## Three-tier tokens (enforced by `pnpm validate` and `tokens/tokens.test.js`)

| Tier        | File                    | Named by                                        | May reference                      |
| ----------- | ----------------------- | ----------------------------------------------- | ---------------------------------- |
| 1 Primitive | `tokens/primitives.css` | scale (`--mg-color-blue-600`, `--mg-space-4`)   | nothing, literals only             |
| 2 Semantic  | `tokens/semantic.css`   | role (`--mg-color-text`, `--mg-space-inset-md`) | primitives only, no literals       |
| 3 Component | `components/*/*.css`    | `--mg-<component>-<thing>` public API           | semantic tokens (plus its own API) |

- Components and `tokens/base.css` reference **semantic tokens only**, never primitives. Need a new value? Add a semantic
  token that points at a primitive.
- Every `var(--mg-*)` in a component carries a literal fallback so it works with no tokens loaded (tests cover this).
  `base.css` has no fallbacks: it is the token consumer.
- `semantic.css` colors are generated from one light/dark table (baseline block + `light-dark()` block), keep them in step.
  It deliberately does **not** set `color-scheme`, so tokens-only consumers keep their theme's scheme; `base.css` sets it.
- Text/background pairs are contrast-tested (WCAG AA) in light and dark. Add any new pairing to `tokens/tokens.test.js`.

## Brands (themes/<name>.css, selected by `data-mg-theme`)

A brand is one file: `[data-mg-theme='<name>'] { … }` in `@layer mg.tokens`, valid on `<body>` or any subtree. It may
(1) redeclare existing **primitives** with literals (the `--mg-color-brand-*` and `gray` ramps, radii, shadows) and
(2) remap existing **semantic** tokens to primitives (`--mg-font-heading`, `--mg-space-inset-md`). It never invents tokens: add
the step to `primitives.css` first. `pnpm validate` enforces this, and `tokens.test.js` runs the whole contrast table
for every brand in light and dark (brands are found by glob, so a new file is tested automatically).

- Semantic tokens are declared on `:where(:root, [data-mg-theme])`. A custom property is substituted where it is declared,
  so without this a brand's primitive overrides would never reach the semantic tokens (they'd resolve at `:root`).
  `:where()` keeps it at zero specificity so a brand's own remaps win in any load order.
- Dark mode per brand is free: the semantic `light-dark()` pairs pick the dark steps of the brand's ramps. The brand ramp
  contract: `600` keeps 4.5:1 with white, `400` keeps 4.5:1 with gray-950. Status colors (info/success/…) do not use the
  brand ramp, so retinting a brand leaves them alone.
- `data-mg-mode="light|dark|auto"` on any element sets `color-scheme` there (explicit opt-in, semantic.css still never sets
  it on its own). Libraries: `magoo/theme-<name>` per brand (add one to `magoo.libraries.yml` per file).
- Drupal: `magoo_theme` (reference theme, lives in `drupal-test/web/themes/custom/`) sets both attributes on `<body>` from
  its settings and loads either only the chosen brand's CSS or (dev "Show switcher" on) all of them plus a picker.
  Storybook has Brand and Mode toolbars doing the same.

## Layers do the specificity work

- `@layer mg.tokens, mg.base, mg.components, mg.enhanced;` **is repeated first in every CSS file** because Drupal's
  aggregation can reorder files. All rules live inside an `@layer mg.*` block (only `@layer`, `@property`, `@keyframes`,
  `@font-face` may sit outside): `pnpm validate` fails on an unlayered rule.
- Layer order beats selector specificity, so components need only single attribute selectors, and `mg.enhanced` reliably
  overrides the baseline. Consumers' unlayered CSS beats everything, by design.
- Gotchas: `!important` reverses layer order (`[hidden]` in base is the only use). A consumer layer declared _before_ Magoo's
  statement ranks below it. Unlayered theme element rules (Olivero's `h2 { color }`) leak into components.

## Conventions

- Prefix `mg-`. Public custom properties `--mg-<component>-<thing>`, private `--_<thing>`.
- Slots: child combinators (`mg-card > [slot="header"]`). No `order`. DOM order equals visual order.
- Twig slots: `<div slot="x">{%- block x %}{{ x }}{% endblock -%}</div>`, leaving the wrapper truly empty when unused so CSS
  hides it with `:empty` (Drupal only adds whitespace to slots that were provided).
- `attributes ?: create_attribute()` (Drupal always provides `attributes`; the fallback is for Storybook).
- **Variants use SDC's native `variants:` key, never a `variant` prop.** Drupal always injects `variant: ''` for
  `#type: component`, which fails an enum prop and 500s. First variant listed is the default. `pnpm validate` enforces it.
- Boolean attributes: `setAttribute('x', true)`, never `''` (drupal-attribute drops empty strings). Twig.js evaluates
  both branches of a ternary, so use `{% if %}{% set %}` for mutating calls.
- Story files keep `title` and `tags` as literals (Storybook's indexer reads them statically) and spread `sdcMeta()` from
  `.storybook/sdc.js`, which derives argTypes, variants and defaults from the `.component.yml`.
- Native-first JS (see `components/dialog/dialog.js`): feature-detect, do nothing where the platform already does it, use one
  delegated document listener.

## Commands

- `pnpm storybook` / `pnpm build-storybook`. The Theme toolbar forces light/dark. Foundations stories show the tokens and bare elements.
- `pnpm test`: Vitest browser mode (Chromium via Playwright), two projects: `components` (`components/**` and `tokens/**` `*.test.js`)
  and `stories` (every story as a test, with axe failing on violations).
- `pnpm lint`, `pnpm validate` (component schema/structure vs Drupal's SDC metadata schema in `schemas/`, plus token tiers and layers).
- First time on a machine: `pnpm exec playwright install chromium`.
- Test files that mutate browser prototypes (`dialog.fallback.test.js`) must stay in their own file. When adding a test, prove it can
  fail (break the thing, watch it go red): vacuous "is closed" assertions passed against an empty script once.

## Gotchas

- `vite-plugin-twig-drupal` only supports vite <= 7, so vite is pinned to `^7`. Its generated code imports `twig`,
  `drupal-attribute` and `drupal-twig-extensions`, which must be direct devDependencies under pnpm, and are pre-bundled in
  `vite.config.js` (`optimizeDeps.include`) so cold Vitest runs don't reload mid-test.
- `@storybook/addon-vitest@10.6` peers on vitest 3/4, so vitest is `^4`.
- Drupal only discovers `components/` in an installed module or theme. `magoo.info.yml` is a discovery shim (a module, no PHP).
  `magoo.libraries.yml` provides `magoo/tokens` (primitives + semantic) and `magoo/base` (element styles, opt-in).
- Testing in Drupal (`~/projects/drupal-test`, Lando, default theme `magoo_theme`): the Lando container can't see this repo (or the
  scratchpad), so run `scripts/sync-drupal.sh` (rsyncs the shipped files, per the `.gitattributes` export-ignore list, into
  `web/modules/custom/magoo`) then `lando drush cr`. `magoo_showcase` (a test-site-only module) renders every component and
  bare element at `/magoo-showcase`; the theme's switcher (bottom right) flips brand and mode. Read failures with
  `lando drush watchdog:show --severity=Error`. `drush theme:install` copies the default theme's blocks into the new theme,
  so prune duplicates. For a throwaway probe, add a module returning
  `['#type' => 'component', '#component' => 'magoo:card', '#variant' => 'flat', '#props' => [...], '#slots' => [...]]`.
