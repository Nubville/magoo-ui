import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadCss, loadTokens, resetDocument } from '../tests/support.js';

// Every brand in themes/, found by glob so a new file is tested with no change here.
const brandUrls = import.meta.glob('../themes/*.css', { query: '?url', import: 'default', eager: true });
const brands = Object.fromEntries(
  Object.entries(brandUrls).map(([path, url]) => [path.match(/([^/]+)\.css$/)[1], url]),
);
const brandNames = ['default', ...Object.keys(brands)];

// The default brand is the tokens with no data-mg-theme attribute.
const applyBrand = async (brand) => {
  if (brand === 'default') return;
  await loadCss(brands[brand]);
  document.body.dataset.mgTheme = brand;
};

// Resolve a token to the actual color the browser paints, in a given color scheme.
const resolve = (scheme, token) => {
  const probe = Object.assign(document.createElement('div'), {});
  probe.style.colorScheme = scheme;
  probe.style.color = `var(${token})`;
  document.body.append(probe);
  const [r, g, b] = getComputedStyle(probe)
    .color.match(/[\d.]+/g)
    .map(Number);
  probe.remove();
  return [r, g, b];
};

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const text = 4.5; // WCAG 1.4.3 normal text
const ui = 3; // WCAG 1.4.11 non-text contrast

const surfaces = ['canvas', 'surface'];
const statuses = ['neutral', 'info', 'success', 'warning', 'danger'];
const pairs = [
  ...['canvas', 'surface', 'surface-muted'].flatMap((bg) => [
    ['text', bg, text],
    ['text-muted', bg, text],
  ]),
  ...surfaces.flatMap((bg) => [
    ['link', bg, text],
    ['link-hover', bg, text],
    ['border-strong', bg, ui],
    ['focus-ring', bg, ui],
    ['accent', bg, ui],
  ]),
  ['accent-fg', 'accent', text],
  ['accent-fg', 'accent-hover', text],
  ['text-inverse', 'text', text],
  ...statuses.map((status) => [`${status}-fg`, `${status}-bg`, text]),
];

beforeEach(loadTokens);
afterEach(() => {
  resetDocument();
  document.body.removeAttribute('data-mg-theme');
  document.body.removeAttribute('data-mg-mode');
});

describe.each(brandNames)('brand %s', (brand) => {
  beforeEach(() => applyBrand(brand));

  describe.each(['light', 'dark'])('semantic color contrast (%s)', (scheme) => {
    it.each(pairs)('%s on %s is at least %s:1', (fg, bg, minimum) => {
      const ratio = contrast(resolve(scheme, `--mg-color-${fg}`), resolve(scheme, `--mg-color-${bg}`));
      expect(ratio, `${brand}: ${fg} on ${bg} (${scheme}) = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(minimum);
    });
  });

  it('resolves different colors for light and dark', () => {
    expect(resolve('light', '--mg-color-canvas')).not.toEqual(resolve('dark', '--mg-color-canvas'));
    expect(resolve('light', '--mg-color-accent')).not.toEqual(resolve('dark', '--mg-color-accent'));
  });
});

describe('brands', () => {
  it('re-resolves semantic tokens against the brand primitives on the element that carries it', async () => {
    const before = resolve('light', '--mg-color-accent');
    await applyBrand('forest');
    expect(resolve('light', '--mg-color-accent')).not.toEqual(before);
    // The status colors do not use the brand ramp, so retinting the brand leaves them alone.
    document.body.removeAttribute('data-mg-theme');
    const info = resolve('light', '--mg-color-info-bg');
    document.body.dataset.mgTheme = 'forest';
    expect(resolve('light', '--mg-color-info-bg')).toEqual(info);
  });

  it('lets a brand remap a role and change a primitive', async () => {
    const value = (token) => getComputedStyle(document.body).getPropertyValue(token).trim();
    const heading = value('--mg-font-heading');
    const radius = value('--mg-radius-container');
    await applyBrand('ink');
    expect(value('--mg-font-heading')).not.toBe(heading);
    expect(value('--mg-radius-container')).not.toBe(radius);
    expect(value('--mg-radius-container')).toBe('0');
  });

  it('scopes a brand to a subtree', async () => {
    await loadCss(brands.forest);
    document.body.innerHTML = '<div id="in" data-mg-theme="forest"></div><div id="out"></div>';
    const accent = (id) => {
      const el = document.getElementById(id);
      el.style.color = 'var(--mg-color-accent)';
      return getComputedStyle(el).color;
    };
    expect(accent('in')).not.toBe(accent('out'));
  });

  it('forces a color scheme per subtree with data-mg-mode', () => {
    document.body.innerHTML = '<div id="d" data-mg-mode="dark"></div><div id="l" data-mg-mode="light"></div>';
    const bg = (id) => {
      const el = document.getElementById(id);
      el.style.color = 'var(--mg-color-canvas)';
      return getComputedStyle(el).color;
    };
    expect(bg('d')).toBe('rgb(2, 6, 23)');
    expect(bg('l')).toBe('rgb(255, 255, 255)');
  });
});

describe('three tiers', () => {
  const value = (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim();

  it('resolves semantic tokens to the primitive they point at', () => {
    expect(value('--mg-space-inset-md')).toBe(value('--mg-space-4'));
    expect(value('--mg-radius-container')).toBe(value('--mg-radius-lg'));
    expect(value('--mg-text-h1-size')).toBe(value('--mg-font-size-4xl'));
  });

  it('lets one unlayered override re-theme every consumer of a semantic token', () => {
    const style = document.createElement('style');
    style.textContent = ':root { --mg-space-inset-md: 3px; }';
    document.head.append(style);
    expect(value('--mg-space-inset-md')).toBe('3px');
    style.remove();
  });
});
