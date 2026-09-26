// Foundations: the token tiers and bare elements, rendered with the real CSS (primitives, semantic, base).
// Plain HTML, no Twig: these are not components.

const hues = ['gray', 'blue', 'green', 'amber', 'red'];
const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

const semanticPairs = [
  ['text', 'canvas'],
  ['text-muted', 'canvas'],
  ['text', 'surface'],
  ['text', 'surface-muted'],
  ['link', 'surface'],
  ['accent-fg', 'accent'],
  ['neutral-fg', 'neutral-bg'],
  ['info-fg', 'info-bg'],
  ['success-fg', 'success-bg'],
  ['warning-fg', 'warning-bg'],
  ['danger-fg', 'danger-bg'],
];

const wrap = (html) => `<div style="padding:var(--mg-space-inset-lg)">${html}</div>`;
const label = (name) => `<code style="font-size:var(--mg-text-caption-size);background:none;padding:0">${name}</code>`;

export default {
  title: 'Foundations',
  parameters: { layout: 'fullscreen' },
};

export const PrimitiveColors = {
  name: 'Tier 1 · Primitive colors',
  render: () =>
    wrap(`
      <p>Raw ramps. Named by hue and step, never by purpose. Only <code>semantic.css</code> may reference these.</p>
      ${hues
        .map(
          (hue) => `
        <h3>${hue}</h3>
        <div style="display:grid;grid-template-columns:repeat(11,minmax(0,1fr));gap:var(--mg-space-gap-sm)">
          ${steps
            .map(
              (step) => `<div>
                <div style="block-size:3rem;border-radius:var(--mg-radius-control);border:var(--mg-border-width) solid var(--mg-color-border);background:var(--mg-color-${hue}-${step})"></div>
                ${label(step)}
              </div>`,
            )
            .join('')}
        </div>`,
        )
        .join('')}`),
};

export const SemanticColors = {
  name: 'Tier 2 · Semantic colors',
  render: () =>
    wrap(`
      <p>Named by role. Each pair below is contrast-tested in light and dark (<code>tokens.test.js</code>).
      Switch the Theme toolbar to see both.</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));gap:var(--mg-space-gap-md)">
        ${semanticPairs
          .map(
            ([
              fg,
              bg,
            ]) => `<div style="padding:var(--mg-space-inset-md);border-radius:var(--mg-radius-container);border:var(--mg-border-width) solid var(--mg-color-border);background:var(--mg-color-${bg});color:var(--mg-color-${fg})">
              <strong style="font-size:var(--mg-text-h4-size)">Aa</strong>
              <div style="font-size:var(--mg-text-small-size)">${fg} on ${bg}</div>
            </div>`,
          )
          .join('')}
      </div>`),
};

export const Typography = {
  name: 'Tier 2 · Typography',
  render: () =>
    wrap(`
      ${[1, 2, 3, 4, 5, 6].map((n) => `<h${n}>Heading ${n} <small style="font-weight:normal">--mg-text-h${n}-size</small></h${n}>`).join('')}
      <p style="font-size:var(--mg-text-lead-size)">Lead paragraph. <small>--mg-text-lead-size</small></p>
      <p>Body text uses <code>--mg-text-body-size</code> with <code>--mg-text-body-leading</code>. The quick brown fox jumps over the lazy dog.</p>
      <p><small>Small text, <code>--mg-text-small-size</code>.</small></p>`),
};

export const SpaceShapeMotion = {
  name: 'Tier 2 · Space, shape, elevation',
  render: () =>
    wrap(`
      <h3>Inset (padding)</h3>
      ${['xs', 'sm', 'md', 'lg']
        .map(
          (
            size,
          ) => `<div style="display:flex;align-items:center;gap:var(--mg-space-gap-md);margin-block-end:var(--mg-space-stack-sm)">
            <div style="background:var(--mg-color-info-bg);inline-size:calc(var(--mg-space-inset-${size}) * 2 + 1rem);padding-inline:0"><div style="margin-inline:var(--mg-space-inset-${size});background:var(--mg-color-info-fg);block-size:1rem"></div></div>
            ${label(`--mg-space-inset-${size}`)}
          </div>`,
        )
        .join('')}
      <h3>Radius and shadow</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--mg-space-gap-lg)">
        ${[
          ['radius-control', 'shadow-raised'],
          ['radius-container', 'shadow-overlay'],
          ['radius-round', 'shadow-raised'],
        ]
          .map(
            ([radius, shadow]) =>
              `<div style="inline-size:9rem;padding:var(--mg-space-inset-md);background:var(--mg-color-surface);border:var(--mg-border-width) solid var(--mg-color-border);border-radius:var(--mg-${radius});box-shadow:var(--mg-${shadow});text-align:center">${label(radius)}<br>${label(shadow)}</div>`,
          )
          .join('')}
      </div>`),
};

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const SpaceScale = {
  name: 'Tier 1 · Space scale',
  render: () =>
    wrap(`
      <p>Numbered steps, not multipliers (after <a href="https://open-props.style/#sizes">Open Props</a>): the jumps widen as you climb, so
      1rem is <code>3</code>, 2rem is <code>7</code> and 3rem is <code>8</code>. Only <code>semantic.css</code> may reference these.</p>
      <h3>Steps</h3>
      ${range(1, 15)
        .map(
          (
            step,
          ) => `<div style="display:flex;align-items:center;gap:var(--mg-space-gap-md);margin-block-end:var(--mg-space-stack-sm)">
            <div style="flex:none;inline-size:9rem">${label(`--mg-space-${step}`)}</div>
            <div style="inline-size:var(--mg-space-${step});max-inline-size:calc(100% - 10rem);block-size:1rem;background:var(--mg-color-accent);border-radius:var(--mg-radius-control)"></div>
          </div>`,
        )
        .join('')}
      <h3>Fluid (grows with the viewport between a floor and a ceiling)</h3>
      ${range(1, 10)
        .map(
          (
            step,
          ) => `<div style="display:flex;align-items:center;gap:var(--mg-space-gap-md);margin-block-end:var(--mg-space-stack-sm)">
            <div style="flex:none;inline-size:9rem">${label(`--mg-space-fluid-${step}`)}</div>
            <div style="inline-size:var(--mg-space-fluid-${step});max-inline-size:calc(100% - 10rem);block-size:1rem;background:var(--mg-color-info-fg);border-radius:var(--mg-radius-control)"></div>
          </div>`,
        )
        .join('')}`),
};

const swatch = (name, css, extra = '') =>
  `<div style="flex:none;inline-size:8rem;text-align:center">
    <div style="block-size:5rem;background:var(--mg-color-surface-muted);border:var(--mg-border-width) solid var(--mg-color-border-strong);${css}${extra}"></div>
    ${label(name)}
  </div>`;

export const BordersAndShapes = {
  name: 'Tier 1 · Borders and shapes',
  render: () =>
    wrap(`
      <p>A radius is always used whole: <code>border-radius: var(--mg-radius-…)</code>, never inside <code>calc()</code>, because the
      drawn and blob shapes are two-part and percentage-based.</p>
      <h3>Border width</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--mg-space-gap-lg)">
        ${range(1, 5)
          .map((n) =>
            swatch(
              `--mg-border-width-${n}`,
              `border-width:var(--mg-border-width-${n});border-color:var(--mg-color-accent)`,
            ),
          )
          .join('')}
      </div>
      <h3>Radius</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--mg-space-gap-lg)">
        ${[...range(0, 6).map((n) => `radius-${n}`), 'radius-pill'].map((name) => swatch(`--mg-${name}`, `border-radius:var(--mg-${name})`)).join('')}
      </div>
      <h3>Blob (organic)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--mg-space-gap-lg)">
        ${range(1, 5)
          .map((n) => swatch(`--mg-radius-blob-${n}`, `border-radius:var(--mg-radius-blob-${n})`))
          .join('')}
      </div>
      <h3>Drawn (hand-drawn wobble)</h3>
      <div style="display:flex;flex-wrap:wrap;gap:var(--mg-space-gap-lg)">
        ${range(1, 6)
          .map((n) => swatch(`--mg-radius-drawn-${n}`, `border-radius:var(--mg-radius-drawn-${n})`))
          .join('')}
      </div>
      <h3>Conditional (square at the viewport edge)</h3>
      <p>The same radius, on an inset box and on one that spans the whole viewport.</p>
      <div style="display:flex;flex-wrap:wrap;gap:var(--mg-space-gap-lg)">
        ${swatch('--mg-radius-conditional-3', 'border-radius:var(--mg-radius-conditional-3)')}
      </div>
      <div style="margin-inline:calc(var(--mg-space-inset-lg) * -1);margin-block-start:var(--mg-space-stack-md);text-align:center">
        <div style="block-size:5rem;background:var(--mg-color-surface-muted);border:var(--mg-border-width) solid var(--mg-color-border-strong);border-radius:var(--mg-radius-conditional-3)"></div>
        ${label('--mg-radius-conditional-3, edge to edge')}
      </div>`),
};

export const Elements = {
  name: 'Base · Bare elements',
  render: () =>
    wrap(`
      <h1>Bare elements</h1>
      <p>Styled by <code>base.css</code> from semantic tokens alone, with no classes. A <a href="#">link</a>, <strong>strong</strong>,
      <em>emphasis</em>, <mark>marked text</mark>, <small>small print</small>, inline <code>code</code> and <kbd>Ctrl</kbd> + <kbd>K</kbd>.</p>
      <h2>Lists</h2>
      <ul><li>Unordered</li><li>List<ul><li>Nested</li></ul></li></ul>
      <ol><li>Ordered</li><li>List</li></ol>
      <dl><dt>Term</dt><dd>Definition</dd></dl>
      <blockquote>A block quotation, with a stronger inline-start border.</blockquote>
      <pre><code>const tokens = 'three tiers';\nconsole.log(tokens);</code></pre>
      <hr>
      <figure>
        <svg role="img" aria-label="Placeholder" width="320" height="120" viewBox="0 0 320 120"><rect width="320" height="120" fill="currentColor" opacity=".15"/></svg>
        <figcaption>A figure caption.</figcaption>
      </figure>
      <table>
        <caption>Table caption</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">Role</th></tr></thead>
        <tbody><tr><th scope="row">Primitive</th><td>Raw value</td></tr><tr><th scope="row">Semantic</th><td>Purpose</td></tr></tbody>
      </table>
      <details><summary>Details and summary</summary><p>Disclosure content.</p></details>
      <h2>Form controls</h2>
      <form onsubmit="return false">
        <fieldset>
          <legend>Profile</legend>
          <p><label for="el-name">Name</label><br><input id="el-name" type="text" placeholder="Ada Lovelace"></p>
          <p><label for="el-role">Role</label><br><select id="el-role"><option>Designer</option><option>Engineer</option></select></p>
          <p><label for="el-bio">Bio</label><br><textarea id="el-bio" rows="3"></textarea></p>
          <p><label for="el-bad">Invalid</label><br><input id="el-bad" type="text" aria-invalid="true" value="oops"></p>
          <p><label><input type="checkbox" checked> Checkbox</label> <label><input type="radio" name="r" checked> Radio</label></p>
          <p><progress value="40" max="100" aria-label="Progress"></progress> <meter value="0.6" aria-label="Meter"></meter></p>
          <p><button type="button">Button</button> <button type="button" disabled>Disabled</button></p>
        </fieldset>
      </form>`),
};
