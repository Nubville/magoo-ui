# Seams

Running notes on what didn't fit, found while building. Newest first.

## Found building the contrast page

- **Computed style is not always `rgb()`.** A `color-mix()` token comes back as `color(srgb 0.5 0.5 0.5)`. My first resolver took
  the digits of the string and read a 50% gray as `#010101`, a silently wrong ratio. Color.js parses whatever the browser
  reports; the test that reproduced it failed before the dependency and passes after.
- **Measure the painted color, not the float.** `0.5` is 127.5 of 255 and paints as 128, which moves 3.95:1 to 3.98:1.
  Everything is gamut-mapped and rounded to 8 bits first. A translucent token throws rather than getting a ratio for the wrong
  thing (the backdrop is left out of the picker).
- **Truncate the ratio.** `#777777` on white is 4.478:1. Rounded it reads 4.48 and looks closer to a pass than it is; WCAG
  gives no rounding, so the page truncates (4.47).
- **A brand with no `<link>` in `preview-head.html` would show the default colors under its own name**, a false pass on the
  page. `pnpm validate` now requires every `themes/*.css` to be linked there.
- **A brand scope needs no page change.** `data-mg-theme` and `data-mg-mode` on a throwaway element resolve any brand and
  either mode in one page, which is what lets the heatmap show all of them at once. Swatches render inside the same scope,
  so they show the exact colors the ratio was computed from.
- **Border swatches carry no text.** Non-text pairs (3:1) are drawn as a bordered box, since text at 3:1 would fail axe.

## Found when the grid "did not respond" (Storybook)

- **Symptom:** in Storybook the grid stayed one 92px column at every window width and ignored the `columns` control. The component
  was fine (real Drupal: 3, 2, 1 columns at 992, 728, 388px). The story was rendering in `sb-main-centered`, whose root
  shrink-wraps to its content, so there was no width for the grid to respond to.
- **Cause:** `...sdcMeta()` returns its own `parameters`, which overwrote the `layout` set beside it. Three story files had
  the same bug: grid, container and (since the first session) card, which had asked for `padded` and never got it.
  `sdcMeta` now takes `layout`, and `pnpm validate` rejects a sibling `parameters`.
- **My first regression check was vacuous:** a `play` assertion that the grid fills the canvas passed with the bug restored,
  because the story test harness never applies Storybook's layout wrapper. Found by breaking it. Replaced with a unit
  test of `sdcMeta` and the validator rule.
- **Any grid in a shrink-wrapped parent** (inline-block, float, a flex item sized to content) collapses the same way: percentage
  and `auto-fit` sizing need a definite width. That is inherent to responsive grids, not specific to this one.

## Found building the grid

- **A unitless `0` inside `calc()` next to a percentage is invalid**, and the invalid declaration is dropped whole, not
  clamped. `gap="none"` defaulted to `0`, so the column-cap `calc(100% - (n - 1) * 0)` died and the grid fell to one
  column. Fixed with `0px`; a consumer's `--mg-grid-gap` needs a unit too (documented in the CSS, and tested with `0px`).
- **"At most N columns, each at least min wide" is one expression, no breakpoints:** `minmax(min(100%, max(min, (100% - (N-1) *
gap) / N)), 1fr)` inside `repeat(auto-fit, ...)`. The default cap is 99 columns, so the minimum width decides. It lives in
  `mg.enhanced`; the baseline is a plain `auto-fit` (the cap is ignored there).
- **`min-inline-size: 0` on items was dead code.** The automatic minimum size only applies to `auto` tracks, and these have a
  fixed minimum. I had added it defensively, then found removing it broke nothing (proved by a mutation, then deleted it).
  Switching the tracks to a bare `1fr` would need it back.
- **`span="full"` is `grid-column: 1 / -1`, not `span N`**: a fixed span wider than the current column count would create
  implicit columns and overflow. A full row is the only span that is always safe.
- **Real Drupal, real cards:** 3 columns at a 992px container, 2 at 728px, 1 at 388px, no overflow, equal card heights in a
  row (the card's own `body` slot takes the spare height, so footers line up).

## Found building avatar, container and stack

- **Drupal's `#markup` strips custom elements.** `Xss::filterAdmin` removed `<mg-badge>`, `<mg-avatar>` and `<button>` (all not
  on its tag list), leaving bare text. A slot filled from a render array must use `#type: inline_template` (or a real
  component render array), and body text in a text format will not keep `<mg-*>` tags unless the format allows them. My
  showcase had silently lost the dialog's footer button this way.
- **`drupal-attribute` (Twig.js) does not escape, Drupal's `Attribute` does.** Pre-escaping into `attributes` would
  double-escape in Drupal, so the avatar prints its name with `|e('html_attr')` directly in the tag instead.
- **CSS cannot see a failed image**, so the avatar's fallback is a 25-line delegated `error` listener. The initials sit behind
  an image with an opaque background (a transparent PNG must not show them through), so without JS a broken picture is an
  empty avatar, not initials. Chosen over `:has()`, which would have made the no-JS case strictly worse.
- **The host names the avatar, not the image.** `role="img"` + `aria-label` on `<mg-avatar>`, `alt=""` on the picture, initials
  `aria-hidden`: a picture that fails to load can never change what a screen reader announces. Leave `alt` empty beside a
  visible name.
- **Layout is where Canvas shines.** Container and stack slots take other components, so a Canvas author can nest container >
  stack > card > stack with no text authoring problem. A page with those and an avatar validated and rendered first time.
- **A flex stack reacts to text nodes too**: unwrapped text between elements becomes an anonymous flex item and takes a gap.

## Found building the popover

- **No JS tier at all.** `popovertarget` and the `popover` attribute do open, close, Escape, light dismiss, one-auto-at-a-time,
  the top layer and focus return. Positioning is CSS anchor positioning in `mg.enhanced`; the baseline is the UA's own
  centered-in-the-viewport placement, and a browser without the Popover API ignores the attribute and shows the panel inline.
  Both fallbacks are by construction only: Chromium (the test browser) has both features, so neither is exercised.
- **The implicit anchor is enough.** A popover opened with `popovertarget` is anchored to that button with no `anchor-name`,
  so any number of popovers can share a page. The catch: a trigger slot that is not a `popovertarget` button has no anchor.
- **A single logical `position-area` keyword centers on the other axis** (`block-end` opens below, centered on the trigger).
  Near a viewport edge the panel is shifted back inside rather than centered, which is the wanted behavior.
- **`popover="manual"` ignores Escape and outside clicks.** Only the trigger or a `popovertargetaction="hide"` button closes it.
- **Twig.js does not autoescape; Drupal's Twig does.** `aria-label="{{ label }}"` broke out of its attribute in Storybook and
  the tests only. Attribute values now use `|e('html_attr')`, which is safe under Drupal's autoescape and correct in both.
- **A closed panel at `opacity: 0` would hide the inline fallback**, so the fade block requires `selector(:popover-open)`.
- **Vitest's own `<script>` lives in `document`**: scope a "no script injected" check to the component.

## Found trying Canvas (drupal/canvas 1.11.0 on Drupal 11.4.6)

- **Installing was uneventful.** `composer require drupal/canvas`, `drush en canvas` (pulls in media and media_library). Eligible SDCs
  become `component` config entities (`sdc.magoo.badge`) on the next cache rebuild, and render in the editor's live preview
  through the active theme, so `magoo_theme`'s tokens, brand and even the dev switcher show up inside the canvas.
- **Every required prop needs `examples:`.** `dialog` (required `id`, `title`) was silently left out until they had one. The
  reason is discoverable: `SingleDirectoryComponentDiscovery::create(\Drupal::getContainer())->checkRequirements('magoo:dialog')`
  throws with the list. Fixed in `dialog.component.yml`.
- **Component `variants:` are not surfaced.** Every "variants" in Canvas is _page_ variants (page templates). A Canvas-placed
  badge has no way to be anything but the default (`neutral`), a card is always `outlined`.
- **Slots take components, not text.** The badge's `content` slot renders as an empty pill in the editor, and a Canvas author
  has no way to type into it. Card slots are fine as drop zones for other components. Text a component displays needs to be a
  prop (a string prop gets a text field), or Canvas can't author it.
- **Only scalar props are editable:** `size` became a select (from its `enum`), `compact` a checkbox.

## Found adopting Open Props scales and shapes

- **Numbered steps have coarser density knobs.** The scale has no 0.75rem (`2` is .5rem, `3` is 1rem), so ink's "compact"
  is now a full step tighter than before. Steps are a vocabulary, not a ramp to interpolate.
- **Multi-value radii break `calc()`.** `card.css` used `calc(var(--_radius) - 1px)` for media corners, which is invalid
  for `drawn-*` and `blob-*`. Fixed by `overflow: clip` on the card. Trade-off: content in a corner is now cut by the curve, so
  a large radius with small padding (forest's 2rem on a compact card) clips whatever pokes out.
- **`radius-conditional-*` computes to an unresolved `clamp()`** (it depends on layout), so tests check the effect by
  hit-testing the corner. `100vw` includes a classic scrollbar, so with one showing an edge-to-edge box keeps its radius.
- **`--mg-size-control` moved from 2.5rem to 3rem**: no 2.5rem step exists. Buttons and inputs are 48px tall now.
- **Container radius is now 1rem (was .5rem), control 5px (was .375rem)**: the nearest steps. A brand wanting the old look
  remaps to `--mg-radius-2`.

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
  so a `variant` enum prop makes any render without one throw and return HTTP 500. Use the native `variants:` metadata key.
  Storybook derives the variant control from it. (An earlier version of this note said Canvas reads `variants:` for a picker.
  It does not: see "Found trying Canvas". UI Patterns was never checked.)
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
