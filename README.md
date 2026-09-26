# Magoo UI

A design system of [Drupal single directory components](https://www.drupal.org/docs/develop/theming-drupal/using-single-directory-components).
Components are Twig + CSS (+ optional JS) rendering undefined `<mg-*>` custom elements. They ship exactly as authored:
**Drupal needs no build step and no `node_modules`.** Storybook, Vite and Vitest are development tooling only.

## Use it in Drupal

1. Install the package into `web/modules/custom/magoo` (or via composer, `type: drupal-module`) and enable the `magoo` module.
   The module is only a discovery shim: Drupal scans installed modules and themes for `components/`.
2. Add the tokens to your theme's `*.info.yml`:
   ```yaml
   libraries:
     - magoo/tokens # design tokens only, changes nothing on its own
     - magoo/base # optional: styles bare HTML elements and follows the user's light/dark preference
   ```
3. Use a component from Twig, or from a render array:
   ```twig
   {% include 'magoo:badge' with { variant: 'success' } %}
   {% embed 'magoo:card' with { variant: 'elevated' } %}{% block header %}Title{% endblock %}{% block body %}Hi{% endblock %}{% endembed %}
   ```
   ```php
   ['#type' => 'component', '#component' => 'magoo:dialog', '#props' => ['id' => 'x', 'title' => 'Hi'], '#slots' => [...]]
   ```
   Component CSS/JS is attached automatically by SDC.

## Design tokens: three tiers

| Tier                             | Example                                    | Change it to                                  |
| -------------------------------- | ------------------------------------------ | --------------------------------------------- |
| Primitive (`primitives.css`)     | `--mg-color-blue-600`, `--mg-space-4`      | add or edit raw values                        |
| Semantic (`semantic.css`)        | `--mg-color-accent`, `--mg-space-inset-md` | **re-theme**: point roles at other primitives |
| Component (`--mg-<component>-*`) | `--mg-card-padding`, `--mg-dialog-width`   | tweak one component                           |

Components and base styles use semantic tokens only, so overriding a semantic token re-themes everything that uses it.
Colors work in light and dark through `light-dark()`; every text/background pair is contrast-tested.

## Overriding and layers

All Magoo CSS is inside `@layer mg.tokens, mg.base, mg.components, mg.enhanced`. Layer order, not selector specificity,
decides which tier wins, and **your unlayered CSS always beats Magoo**, so no `!important` and no specificity fights:

```css
:root {
  --mg-color-accent: #7c3aed;
} /* re-theme via a semantic token */
mg-card {
  --mg-card-padding: 2rem;
} /* tweak one component */
mg-card > [slot='header'] {
  letter-spacing: 0;
} /* or just write a rule */
```

If you use your own layers, declare them after `magoo/tokens` loads (Drupal loads it in the base group) so they rank above `mg`.

## Develop

```sh
pnpm install
pnpm exec playwright install chromium   # once
pnpm storybook                          # http://localhost:6006
pnpm test                               # component tests + every story as a test (axe included)
pnpm lint && pnpm validate
```

## Layout

```
components/<name>/   <name>.component.yml  <name>.twig  <name>.css  [<name>.js]  <name>.stories.js  <name>.test.js
tests/               shared test helpers
tokens/              primitives.css (tier 1), semantic.css (tier 2), base.css (bare elements), foundations stories
magoo.info.yml       Drupal discovery shim (module, no PHP)
magoo.libraries.yml  magoo/tokens and magoo/base libraries
.storybook/          Storybook + the sdcMeta() helper
scripts/             validate-components.mjs
schemas/             Drupal's SDC metadata schemas (vendored, used by validate)
docs/                old-plan.md (superseded), seams.md
```

Components: `badge`, `card`, `dialog` (native `<dialog>` + Invoker Commands, with an optional JS fallback), `popover` (native Popover API + CSS anchor positioning, no JS), `avatar` (picture or initials, optional JS for broken images), and the layout components `container` (centered column with a gutter), `stack` (vertical rhythm, owns the gap) and `grid` (responsive columns from a minimum item width, no breakpoints).
