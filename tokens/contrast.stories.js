// Foundations / Contrast: WCAG contrast of the semantic color tokens, in every brand and both modes.
// Dev-only. It reads the real computed colors from the real CSS, and shares its pair table and math with the tests
// (tests/contrast.js), so what this page shows is exactly what CI enforces.
import semanticCss from '../tokens/semantic.css?raw';
import {
  AA,
  AA_LARGE,
  AAA,
  AAA_LARGE,
  UI,
  apca,
  colorTokenNames,
  floor2,
  groups,
  hex,
  ratioOf,
  resolveColor,
} from '../tests/contrast.js';

// Every opaque semantic color, read from the stylesheet, so a new token shows up in the picker with no change here.
const allTokens = colorTokenNames(semanticCss);

const brandNames = [
  'default',
  ...Object.keys(import.meta.glob('../themes/*.css')).map((path) => path.match(/([^/]+)\.css$/)[1]),
];
const schemes = ['light', 'dark'];
const capital = (word) => word[0].toUpperCase() + word.slice(1);

const wrap = (html) => `<div style="padding:var(--mg-space-inset-lg)">${html}</div>`;
const token = (name) => `<code style="font-size:var(--mg-text-small-size)">--mg-color-${name}</code>`;
const muted = (text) =>
  `<span style="color:var(--mg-color-text-muted);font-size:var(--mg-text-small-size)">${text}</span>`;
const srOnly = (text) =>
  `<span style="position:absolute;inline-size:1px;block-size:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap">${text}</span>`;

// Pass and fail are always words as well as colors.
const badge = (ok, label) => {
  const tone = ok ? 'success' : 'danger';
  return `<span style="display:inline-block;padding:0 var(--mg-space-inset-xs);border:var(--mg-border-width) solid var(--mg-color-${tone}-border);border-radius:var(--mg-radius-control);background:var(--mg-color-${tone}-bg);color:var(--mg-color-${tone}-fg);font-size:var(--mg-text-small-size);font-weight:var(--mg-text-strong-weight);white-space:nowrap">${label} ${ok ? '✓ pass' : '✗ fail'}</span>`;
};

const scopeAttrs = (scheme, brand) =>
  `data-mg-mode="${scheme}"${brand === 'default' ? '' : ` data-mg-theme="${brand}"`}`;

// The swatch renders inside a brand and mode scope, so it shows the very colors the ratio was measured on.
const chip = (fg, bg, isText, scheme, brand) => {
  const box =
    'inline-size:3.5rem;block-size:2.5rem;box-sizing:border-box;border-radius:var(--mg-radius-control);box-shadow:inset 0 0 0 1px rgb(128 128 128 / 0.45)';
  const body = isText
    ? `<span style="display:grid;place-items:center;${box};background:var(--mg-color-${bg});color:var(--mg-color-${fg});font-size:1.25rem;font-weight:600">Aa</span>`
    : `<span aria-hidden="true" style="display:block;${box};background:var(--mg-color-${bg});border:0.25rem solid var(--mg-color-${fg})"></span>`;
  return `<span ${scopeAttrs(scheme, brand)} style="display:inline-block;flex:none">${body}</span>`;
};

const measure = (fg, bg, minimum, scheme, brand) => {
  const options = { scheme, brand };
  const ratio = ratioOf(fg, bg, options);
  return {
    ratio,
    ok: ratio >= minimum,
    hexes: `${hex(resolveColor(`--mg-color-${fg}`, options))} on ${hex(resolveColor(`--mg-color-${bg}`, options))}`,
  };
};

const cell = (fg, bg, minimum, scheme, brand) => {
  const { ratio, ok, hexes } = measure(fg, bg, minimum, scheme, brand);
  const isText = minimum >= AA;
  const aaa = isText ? (ratio >= AAA ? badge(true, 'AAA') : muted('AAA not met')) : '';
  return `<div style="display:flex;align-items:center;gap:var(--mg-space-gap-md)">
    ${chip(fg, bg, isText, scheme, brand)}
    <div>
      <strong>${floor2(ratio)}:1</strong> ${muted(`needs ${minimum}:1`)}<br>
      ${badge(ok, isText ? 'AA' : 'UI')} ${aaa}<br>
      ${muted(hexes)}
    </div>
  </div>`;
};

const tally = (brand, scheme) => {
  const all = groups.flatMap((group) => group.pairs);
  const passing = all.filter(([fg, bg, minimum]) => ratioOf(fg, bg, { scheme, brand }) >= minimum).length;
  return { passing, total: all.length };
};

const legend = `<p>Text pairs need <strong>${AA}:1</strong> (WCAG 1.4.3). Borders, focus rings and controls need <strong>${UI}:1</strong> (1.4.11).
  AAA (${AAA}:1) is shown as a bonus, not a requirement. Ratios are truncated, never rounded up.</p>`;

const matrix = (brand) =>
  wrap(`
    <h1>Color contrast</h1>
    <h2>Brand: ${brand}</h2>
    ${legend}
    <p>${schemes
      .map((scheme) => {
        const { passing, total } = tally(brand, scheme);
        return `${capital(scheme)}: ${badge(passing === total, `${passing} of ${total} pairs`)}`;
      })
      .join(' ')} ${muted('Change the brand in the toolbar.')}</p>
    ${groups
      .map(
        (group) => `
      <h3>${group.title} ${muted(`WCAG ${group.criterion}`)}</h3>
      <table>
        <thead><tr><th scope="col">Pair</th>${schemes.map((scheme) => `<th scope="col">${capital(scheme)}</th>`).join('')}</tr></thead>
        <tbody>${group.pairs
          .map(
            ([fg, bg, minimum]) =>
              `<tr><th scope="row" style="font-weight:normal">${token(fg)}<br>on ${token(bg)}</th>${schemes
                .map((scheme) => `<td>${cell(fg, bg, minimum, scheme, brand)}</td>`)
                .join('')}</tr>`,
          )
          .join('')}</tbody>
      </table>`,
      )
      .join('')}`);

const columns = brandNames.flatMap((brand) => schemes.map((scheme) => ({ brand, scheme })));

const allBrands = () =>
  wrap(`
    <h1>Color contrast</h1>
    <h2>Every brand, both modes</h2>
    ${legend}
    <div role="region" aria-label="Contrast ratios for every brand and mode" tabindex="0" style="overflow-x:auto">
    <table>
      <thead><tr><th scope="col">Pair</th>${columns
        .map(({ brand, scheme }) => `<th scope="col">${brand}<br>${muted(scheme)}</th>`)
        .join('')}</tr></thead>
      <tbody>
        <tr><th scope="row">Pairs passing</th>${columns
          .map(({ brand, scheme }) => {
            const { passing, total } = tally(brand, scheme);
            return `<td>${badge(passing === total, `${passing}/${total}`)}</td>`;
          })
          .join('')}</tr>
        ${groups
          .map(
            (group) => `
          <tr><th scope="colgroup" colspan="${columns.length + 1}" style="text-align:start">${group.title} ${muted(`WCAG ${group.criterion}`)}</th></tr>
          ${group.pairs
            .map(
              ([fg, bg, minimum]) =>
                `<tr><th scope="row" style="font-weight:normal">${token(fg)}<br>on ${token(bg)}</th>${columns
                  .map(({ brand, scheme }) => {
                    const { ratio, ok } = measure(fg, bg, minimum, scheme, brand);
                    const tone = ok ? 'success' : 'danger';
                    return `<td style="background:var(--mg-color-${tone}-bg);color:var(--mg-color-${tone}-fg);white-space:nowrap">${floor2(ratio)} ${ok ? '✓' : '✗'}${srOnly(ok ? 'pass' : 'fail')}</td>`;
                  })
                  .join('')}</tr>`,
            )
            .join('')}`,
          )
          .join('')}
      </tbody>
    </table>
    </div>`);

const checker = () => {
  const root = document.createElement('div');
  root.style.padding = 'var(--mg-space-inset-lg)';
  const select = (id, label, options, value) =>
    `<label>${label}<br><select id="${id}">${options.map((option) => `<option${option === value ? ' selected' : ''}>${option}</option>`).join('')}</select></label>`;
  root.innerHTML = `
    <h1>Color contrast</h1>
    <h2>Try a pair</h2>
    <p>Any two semantic color tokens, in any brand and mode.</p>
    <div style="display:flex;flex-wrap:wrap;gap:var(--mg-space-gap-lg)">
      ${select('fg', 'Foreground', allTokens, 'text')}
      ${select('bg', 'Background', allTokens, 'surface')}
      ${select('brand', 'Brand', brandNames, 'default')}
      ${select('mode', 'Mode', schemes, 'light')}
    </div>
    <div id="out" aria-live="polite" style="margin-block-start:var(--mg-space-stack-lg)"></div>`;

  const update = () => {
    const [fg, bg, brand, scheme] = ['fg', 'bg', 'brand', 'mode'].map((id) => root.querySelector(`#${id}`).value);
    const options = { scheme, brand };
    const ratio = ratioOf(fg, bg, options);
    const rows = [
      ['Normal text', 'AA', AA],
      ['Large text (24px, or 18.66px bold)', 'AA', AA_LARGE],
      ['Normal text', 'AAA', AAA],
      ['Large text', 'AAA', AAA_LARGE],
      ['Borders, icons and controls (non-text)', 'AA', UI],
    ];
    const box = `background:var(--mg-color-${bg});color:var(--mg-color-${fg});padding:var(--mg-space-inset-md);border-radius:var(--mg-radius-container);border:var(--mg-border-width) solid var(--mg-color-border)`;
    root.querySelector('#out').innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:var(--mg-space-gap-lg);align-items:stretch">
        <span ${scopeAttrs(scheme, brand)} style="display:block;flex:1 1 16rem">
          <span style="display:block;${box}">
            <span style="display:block;font-size:1rem">The quick brown fox jumps over the lazy dog.</span>
            <span style="display:block;font-size:1.5rem;font-weight:700;margin-block-start:var(--mg-space-stack-sm)">Large heading</span>
          </span>
        </span>
        <div style="flex:1 1 16rem">
          <p style="margin:0;font-size:var(--mg-text-h2-size);font-weight:var(--mg-text-strong-weight)">${floor2(ratio)}:1</p>
          ${muted(`${hex(resolveColor(`--mg-color-${fg}`, options))} on ${hex(resolveColor(`--mg-color-${bg}`, options))}`)}<br>
          ${muted(`APCA Lc ${apca(resolveColor(`--mg-color-${fg}`, options), resolveColor(`--mg-color-${bg}`, options)).toFixed(1)} (the WCAG 3 draft: informational, not a requirement)`)}
        </div>
      </div>
      <table style="margin-block-start:var(--mg-space-stack-md)">
        <thead><tr><th scope="col">Use</th><th scope="col">Level</th><th scope="col">Needs</th><th scope="col">Result</th></tr></thead>
        <tbody>${rows
          .map(
            ([use, level, minimum]) =>
              `<tr><th scope="row" style="font-weight:normal">${use}</th><td>${level}</td><td>${minimum}:1</td><td>${badge(ratio >= minimum, level)}</td></tr>`,
          )
          .join('')}</tbody>
      </table>`;
  };

  root.addEventListener('change', update);
  update();
  return root;
};

export default {
  title: 'Foundations/Contrast',
  parameters: { layout: 'fullscreen' },
};

export const Matrix = {
  name: 'Matrix (current brand)',
  render: (_, { globals }) => matrix(globals.brand ?? 'default'),
};

export const AllBrands = {
  name: 'All brands',
  render: allBrands,
};

export const Checker = {
  name: 'Try a pair',
  render: checker,
};
