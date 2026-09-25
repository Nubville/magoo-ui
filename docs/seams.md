# Seams

Running notes on what didn't fit, found while building. Newest first.

## Found building brands and magoo_theme

- **A custom property is substituted where it is declared.** Semantic tokens on `:root` resolve `var(--mg-color-brand-600)`
  against `:root`'s primitives, so a brand that overrides primitives on `<body>` changed nothing. Fix: declare the semantic
  tokens on `:where(:root, [data-mg-theme])` so they re-resolve on the brand element. Same reason a consumer's unlayered
  semantic override on `:root` is shadowed inside a brand element that re-declares that token.
- **`light-dark()` is the opposite.** It is not evaluated until a real property uses it, so it follows the `color-scheme` of
  the element that uses it. That is why `data-mg-mode` on a subtree works and a brand needs no dark-mode code of its own.
- **`accent` and `link` pointed at the blue ramp, which is also info.** A brand would have retinted status colors too. Added a
  `brand` ramp (blue-valued, so the default look is unchanged) and pointed the brand roles at it.
- **A ramp is a contract, not a hue.** A stock green's 600 gave white text only 3.8:1, so brand ramps are tuned so 600 passes
  4.5:1 with white. The per-brand contrast test is what catches a ramp that breaks it.
- **Mode on `<body>` only recolors the body's subtree.** The viewport scrollbars and overscroll follow `<html>`'s
  `color-scheme`. Fine for a dev switcher; a production "force dark" setting should also set it on `<html>`.
- **`drush theme:install` copies the default theme's blocks** into the new theme where region names match. A theme that
  reuses Olivero's region names inherits its blocks (duplicate branding, a second main content). Also the branding block
  requests `logo.svg` from the theme unless `use_site_logo` is off.
- **Brand CSS in Drupal is a library per file**, so a site loads exactly one brand (theme setting) or all of them (switcher).
  Theme settings changes needed no cache clear: `config:<theme>.settings` on the page's cache tags did it.

## Found building tokens, card and dialog

- **`variant` is reserved by SDC.** `#type: component` always injects `variant: ''` (`ComponentElement::preRenderComponent`),
  so a `variant` enum prop makes any render without one throw and return HTTP 500. Use the native `variants:` metadata key
  (also what Canvas and UI Patterns read for their variant pickers). Storybook derives the variant control from it.
- **Tokens must not claim `color-scheme`.** Setting it in `semantic.css` made Magoo dark on a light-only Olivero page (dark
  dialog, theme text still dark). Only the opt-in `magoo/base` sets it now.
- **Unlayered theme rules leak into components.** Olivero's `h2` color and margins beat the layered `mg-dialog h2` rules. That
  is the layer contract working as intended, but it means a theme's element styling reaches inside components. Real Magoo themes
  must not style bare elements unlayered against Magoo; `@scope` is the eventual isolation tool.
- **Slots need truly empty wrappers.** Twig whitespace control keeps unused slots empty so `:empty` hides them. Drupal only adds
  whitespace to slots that were passed, so this works in both environments.
- **Twig.js differs from Twig.** It evaluates both branches of a ternary (a mutating `setAttribute` always runs), and
  `drupal-attribute` drops `''` values. Boolean attributes use `true` inside an `{% if %}`.
- **Invoker Commands + `closedby` make the JS tier tiny.** `dialog.js` is one delegated listener that feature-detects and does
  nothing in current browsers. Without it, and without native support, the trigger does nothing (no no-JS fallback exists).
- **Open-state axe checks** need the enter transition to finish first, or contrast is measured at partial opacity.
- **Literal fallbacks can drift from tokens.** Components repeat primitive values as `var()` fallbacks. Tests cover that the
  fallbacks work, not that they still equal the tokens. A validator comparing them is worth adding.
- **The `.info.yml` shim is fine as a module.** It never got in the way; SDC namespace, libraries and JS attach all worked.

## Verified in Drupal 11.4.6 (drupal-test, Olivero, CSS aggregation on)

- **Discovery needs an installed extension.** `ComponentPluginManager::getScanDirectories()` only scans installed modules and
  themes. A bare package can't be discovered, so `magoo.info.yml` is a module shim. A module beat a theme: it doesn't show in
  Appearance and doesn't depend on the active theme.
- **`@layer` survives aggregation**, including the leading `@layer a, b, c;` statement, `@property` and nested `@supports`.
- **Aggregation can reorder files**, so a layer-order statement in only one file is not enough. Every component CSS repeats it
  (enforced by `pnpm validate`). The duplicate statements are harmless.
- **Slot whitespace comes from Drupal.** Rendering via `#type: component` wraps slot content in whitespace
  (`<mg-badge …>    text\n  </mg-badge>`). It collapses inside `display: inline-block`, but `textContent` isn't exact. Tests
  through Twig.js see the exact text, so the two environments differ slightly here.
- **Extra attributes.** SDC adds `data-component-id` and `data-component-variant` to the element. Harmless, and free hooks.
- **Tokens need a theme opt-in** (`libraries: [magoo/tokens]`). Without it components still render from their fallbacks, by design.

## Tooling

- Storybook's indexer needs a literal `export default {…}`, so `sdcMeta()` is spread into it rather than called as the export.
- Vitest browser mode with the Twig plugin needs the plugin's runtime deps as direct dependencies under pnpm (see CLAUDE.md).
- `@import` waterfall: not applicable. There is no `index.css`, because SDC attaches each component's CSS itself. This removes
  one of the old plan's open questions.

## Still open

- Whether `mg-badge` needs an ARIA role or `role="status"` in some uses (axe passes, but semantics depend on context).
- Baseline vs enhanced toggle in Storybook is not built yet (light/dark toggle is).
- Canvas (Experience Builder) compatibility of the `.component.yml` files is untested.
- Heading level of the dialog title is fixed at `h2`.
