import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadCss, loadTokens, resetDocument } from '../tests/support.js';
import {
  apca,
  colorTokenNames,
  contrast,
  floor2,
  groups,
  hex,
  pairs,
  ratioOf,
  resolveColor,
  tokenNames,
} from '../tests/contrast.js';
import forestCss from '../themes/forest.css?url';

describe('contrast math (WCAG 2 relative luminance, via Color.js)', () => {
  it('is 21:1 for black on white, in either order, and 1:1 for a color on itself', () => {
    expect(contrast('#000', '#fff')).toBeCloseTo(21, 5);
    expect(contrast('#fff', '#000')).toBeCloseTo(21, 5);
    expect(contrast('#fff', '#fff')).toBe(1);
  });

  it('matches the well-known AA boundary grays on white', () => {
    // #767676 is the lightest gray that passes 4.5:1 on white, #777777 just misses it.
    expect(contrast('#767676', '#fff')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#777777', '#fff')).toBeLessThan(4.5);
    expect(floor2(contrast('#777777', '#fff'))).toBe('4.47'); // 4.478 truncates, it does not round up to 4.48
  });

  it('truncates instead of rounding up, so a near miss never displays as a pass', () => {
    expect(floor2(4.499)).toBe('4.49');
    expect(floor2(4.5)).toBe('4.50');
    expect(floor2(21)).toBe('21.00');
  });

  it('formats any CSS color as hex', () => {
    expect(hex('#ffffff')).toBe('#ffffff');
    expect(hex('rgb(15, 23, 42)')).toBe('#0f172a');
    expect(hex('color(srgb 0.5 0.5 0.5)')).toBe('#808080');
  });

  it('measures the painted 8-bit color, not unrounded floats', () => {
    // 0.5 is 127.5 of 255, which paints as 128, so it must match #808080 exactly.
    expect(contrast('color(srgb 0.5 0.5 0.5)', '#fff')).toBe(contrast('#808080', '#fff'));
  });

  it('refuses a translucent color instead of reporting a ratio for the wrong thing', () => {
    expect(() => contrast('rgb(0 0 0 / 50%)', '#fff')).toThrow(/translucent/);
  });

  it('reports APCA as an informational second opinion, larger for dark text on white', () => {
    expect(apca('#000', '#fff')).toBeGreaterThan(100);
    expect(apca('#767676', '#fff')).toBeGreaterThan(60);
    expect(apca('#767676', '#fff')).toBeLessThan(apca('#000', '#fff'));
  });
});

describe('the pair table', () => {
  it('has only well-formed pairs of known thresholds', () => {
    for (const [fg, bg, minimum] of pairs) {
      expect(typeof fg).toBe('string');
      expect(typeof bg).toBe('string');
      expect([3, 4.5]).toContain(minimum);
    }
  });

  it('covers every status color and lists each token once for pickers', () => {
    for (const status of ['neutral', 'info', 'success', 'warning', 'danger']) {
      expect(pairs).toContainEqual([`${status}-fg`, `${status}-bg`, 4.5]);
    }
    expect(new Set(tokenNames).size).toBe(tokenNames.length);
    expect(groups.map((group) => group.title)).toContain('Borders, focus and controls');
  });
});

describe('listing the color tokens', () => {
  it('finds each --mg-color-* once, without the translucent backdrop', () => {
    const css =
      ':root{--mg-color-text:#000;--mg-color-text: red;--mg-color-backdrop:rgb(0 0 0/50%);--mg-color-accent-fg:#fff}';
    expect(colorTokenNames(css)).toEqual(['accent-fg', 'text']);
  });
});

describe('resolving a token to a painted color', () => {
  beforeEach(loadTokens);
  afterEach(() => {
    resetDocument();
    document.body.removeAttribute('data-mg-theme');
  });

  it('resolves the semantic tokens to their primitives in each mode', () => {
    expect(hex(resolveColor('--mg-color-canvas', { scheme: 'light' }))).toBe('#ffffff');
    expect(hex(resolveColor('--mg-color-canvas', { scheme: 'dark' }))).toBe('#020617');
  });

  it('resolves inside a brand scope without touching the page', async () => {
    await loadCss(forestCss);
    const before = ratioOf('accent', 'canvas', { scheme: 'light' });
    const forest = ratioOf('accent', 'canvas', { scheme: 'light', brand: 'forest' });
    expect(forest).not.toBe(before);
    expect(document.body.hasAttribute('data-mg-theme')).toBe(false);
    expect(document.querySelector('[data-mg-theme]')).toBeNull(); // The scope element is removed again.
  });

  it('reads colors the browser reports in a form other than rgb(), such as color-mix() and oklch()', () => {
    // Computed style gives color(srgb 0.5 0.5 0.5) for the first and an oklab()/oklch() form for the second.
    const style = document.createElement('style');
    style.textContent = ':root{--zz-mix:color-mix(in srgb, #000 50%, #fff);--zz-oklch:oklch(1 0 0)}';
    document.head.append(style);
    expect(hex(resolveColor('--zz-mix'))).toBe('#808080');
    expect(hex(resolveColor('--zz-oklch'))).toBe('#ffffff');
    expect(contrast(resolveColor('--zz-mix'), resolveColor('--zz-oklch'))).toBeCloseTo(3.95, 2);
    // A translucent token cannot be given a contrast ratio.
    style.textContent += ':root{--zz-glass:rgb(0 0 0 / 50%)}';
    expect(() => resolveColor('--zz-glass')).toThrow(/translucent/);
    style.remove();
  });

  it('agrees with a plain contrast() of the two resolved colors', () => {
    const options = { scheme: 'dark' };
    expect(ratioOf('text', 'canvas', options)).toBe(
      contrast(resolveColor('--mg-color-text', options), resolveColor('--mg-color-canvas', options)),
    );
  });
});
