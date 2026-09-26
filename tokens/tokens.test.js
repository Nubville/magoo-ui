import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadCss, loadTokens, resetDocument } from '../tests/support.js';
import { contrast, pairs, resolveColor } from '../tests/contrast.js';

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

// The color the browser paints for a token in a color scheme (the brand comes from <body>, see applyBrand).
const resolve = (scheme, token) => resolveColor(token, { scheme });

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
    expect(value('--mg-space-inset-md')).toBe(value('--mg-space-3'));
    expect(value('--mg-radius-container')).toBe(value('--mg-radius-3'));
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

// What the browser paints for a declaration using the token, at the element's real size.
const painted = (declaration, size = 'inline-size:10rem;block-size:4rem') => {
  const probe = document.createElement('div');
  probe.style.cssText = `${size};border:0 solid;${declaration}`;
  document.body.append(probe);
  const style = getComputedStyle(probe);
  const result = { width: style.width, borderWidth: style.borderTopWidth, radius: style.borderTopLeftRadius };
  probe.remove();
  return result;
};

describe('space scale (Open Props steps)', () => {
  const px = (step) => Number.parseFloat(painted(`inline-size:var(--mg-space-${step})`).width);
  const steps = Array.from({ length: 15 }, (_, i) => i + 1);

  it('matches the Open Props values, in px at a 16px root', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(px)).toEqual([4, 8, 16, 20, 24, 28, 32, 48, 64, 80]);
    expect([11, 12, 13, 14, 15].map(px)).toEqual([120, 160, 240, 320, 480]);
  });

  it('only ever grows', () => {
    const sizes = steps.map(px);
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    expect(new Set(sizes).size).toBe(sizes.length);
  });

  it('keeps every fluid step between its floor and its ceiling', () => {
    const fluid = (step) => Number.parseFloat(painted(`inline-size:var(--mg-space-fluid-${step})`).width);
    const bounds = [[8, 16], [16, 24], [24, 32], [32, 48], [64, 80], [80, 120], [120, 160], [160, 240], [240, 320], [320, 480]]; // prettier-ignore
    bounds.forEach(([floor, ceiling], index) => {
      const value = fluid(index + 1);
      expect(value, `fluid-${index + 1} = ${value}px`).toBeGreaterThanOrEqual(floor);
      expect(value).toBeLessThanOrEqual(ceiling);
    });
  });
});

describe('shape tokens', () => {
  const radii = [
    ...[0, 1, 2, 3, 4, 5, 6].map((n) => `radius-${n}`),
    'radius-pill',
    ...[1, 2, 3, 4, 5].map((n) => `radius-blob-${n}`),
    ...[1, 2, 3, 4, 5, 6].map((n) => `radius-drawn-${n}`),
    ...[1, 2, 3, 4, 5, 6].map((n) => `radius-conditional-${n}`),
  ];

  it.each(radii)('--mg-%s is a valid border-radius', (name) => {
    const probe = document.createElement('div');
    probe.style.cssText = 'inline-size:10rem;block-size:4rem';
    probe.style.borderRadius = `var(--mg-${name})`;
    document.body.append(probe);
    // An invalid-at-computed-time value falls back to square, which would also be "0px": compare against a real shape.
    const radius = getComputedStyle(probe).borderTopLeftRadius;
    probe.remove();
    if (name === 'radius-0') expect(radius).toBe('0px');
    else expect(radius, `${name} painted as ${radius}`).not.toBe('0px');
  });

  it('has border widths 1, 2, 5, 10 and 25px', () => {
    const width = (n) => painted(`border-width:var(--mg-border-width-${n})`).borderWidth;
    expect([1, 2, 3, 4, 5].map(width)).toEqual(['1px', '2px', '5px', '10px', '25px']);
  });

  it('drops a conditional radius to square only when the element spans the viewport', () => {
    // The computed value stays an unresolved clamp() (it depends on layout), so test the effect: is the corner hittable?
    const cornerHit = (inlineSize) => {
      const probe = document.createElement('div');
      probe.style.cssText = `position:fixed;inset:0 auto auto 0;inline-size:${inlineSize};block-size:8rem;background:red;border-radius:var(--mg-radius-conditional-3)`;
      document.body.append(probe);
      const hit = document.elementFromPoint(1, 1) === probe;
      probe.remove();
      return hit;
    };
    expect(cornerHit('50vw'), 'inset element keeps its rounded corner').toBe(false);
    expect(cornerHit('100vw'), 'edge-to-edge element is square').toBe(true);
  });

  it('lets a brand carry a whole shape, and components then use it whole', async () => {
    const container = () => painted('border-radius:var(--mg-radius-container)').radius;
    const before = container();
    await applyBrand('sketch');
    const drawn = container();
    expect(drawn).not.toBe(before);
    expect(drawn).not.toBe('0px');
    document.body.dataset.mgTheme = 'ink';
    await loadCss(brands.ink);
    expect(container().split(' ')[0]).toBe('0px');
  });
});
