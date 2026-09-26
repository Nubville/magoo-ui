import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import template from './grid.twig';
import gridCss from './grid.css?url';
import baseCss from '../../tokens/base.css?url';
import { loadCss, loadTokens, resetDocument } from '../../tests/support.js';

const cell = (n, extra = '') => `<div class="i" ${extra} style="block-size:2rem">${n}</div>`;
const six = [1, 2, 3, 4, 5, 6].map((n) => cell(n)).join('');

// Render a grid inside a box of an exact width, so column counts can be worked out by hand.
const render = (args = {}, width = 1000) => {
  document.body.style.margin = '0';
  document.body.innerHTML = `<div style="inline-size:${width}px">${template({ content: six, ...args })}</div>`;
  return document.querySelector('mg-grid');
};
const items = () => [...document.querySelectorAll('mg-grid > *')].map((el) => el.getBoundingClientRect());
const columnCount = () => new Set(items().map((r) => Math.round(r.left))).size;

beforeEach(async () => {
  await page.viewport(1800, 800);
});
afterEach(() => {
  resetDocument();
  document.body.style.margin = '';
});

describe('mg-grid markup', () => {
  it('defaults every attribute, and passes overrides through', () => {
    const grid = render();
    expect(['columns', 'min', 'gap', 'align'].map((name) => grid.getAttribute(name))).toEqual([
      'auto',
      'md',
      'md',
      'stretch',
    ]);
    const custom = render({ columns: '3', min: 'lg', gap: 'none', align: 'center' });
    expect(['columns', 'min', 'gap', 'align'].map((name) => custom.getAttribute(name))).toEqual([
      '3',
      'lg',
      'none',
      'center',
    ]);
  });

  it('has no wrapper: the children are the grid items', () => {
    expect([...render().children].map((child) => child.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);
  });
});

describe('mg-grid layout', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(baseCss);
    await loadCss(gridCss);
  });

  it('is a grid', () => {
    expect(getComputedStyle(render()).display).toBe('grid');
  });

  // 1000px wide, 16px gap: n columns need n * min + (n - 1) * 16.
  it.each([
    ['sm', 5], // 160px: 5 * 160 + 64 = 864 fits, 6 * 160 + 80 = 1040 does not
    ['md', 3], // 256px: 3 * 256 + 32 = 800 fits, 4 * 256 + 48 = 1072 does not
    ['lg', 2], // 384px: 2 * 384 + 16 = 784 fits, 3 * 384 + 32 = 1184 does not
  ])('fits as many %s columns as there is room for (%s)', (min, columns) => {
    render({ min });
    expect(columnCount()).toBe(columns);
  });

  it('shares the width evenly and leaves no gap at the edges', () => {
    render();
    const [first, second, , , , sixth] = items();
    expect(first.left).toBe(0);
    expect(first.width).toBeCloseTo((1000 - 2 * 16) / 3, 1);
    expect(second.left - first.right).toBeCloseTo(16, 1);
    expect(sixth.right).toBeCloseTo(1000, 1);
  });

  it('caps the columns below what would fit', () => {
    render({ columns: '2' }); // 3 would fit
    expect(columnCount()).toBe(2);
    expect(items()[0].width).toBeCloseTo((1000 - 16) / 2, 1);
  });

  it('caps the columns however wide the grid is', () => {
    render({ columns: '4' }, 1700); // 6 would fit
    expect(columnCount()).toBe(4);
    expect(items()[0].width).toBeCloseTo((1700 - 3 * 16) / 4, 1);
  });

  it('drops columns for a narrow container, whatever the cap, without any breakpoint', () => {
    render({ columns: '4' }, 500); // only 1 fits at 256px
    expect(columnCount()).toBe(1);
    expect(items()[0].width).toBeCloseTo(500, 1);
  });

  it('never overflows a container narrower than the minimum width', () => {
    const grid = render({ min: 'lg' }, 200);
    expect(grid.getBoundingClientRect().width).toBe(200);
    expect(items().every((r) => r.right <= 200 + 0.5)).toBe(true);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(1800);
  });

  it.each([
    ['md', 16],
    ['sm', 8],
    ['lg', 24],
    ['none', 0],
  ])('puts the %s gap (%spx) between columns and between rows', (gap, pixels) => {
    render({ gap, columns: '2' });
    const [a, b, c] = items();
    expect(b.left - a.right).toBeCloseTo(pixels, 1);
    expect(c.top - a.bottom).toBeCloseTo(pixels, 1);
  });

  it('gives every item in a row the same height when stretching, and its own height otherwise', () => {
    const rows = '<div style="block-size:6rem">tall</div><div>short</div>';
    render({ content: rows, columns: '2' });
    const [a, b] = items();
    expect(b.height).toBe(a.height);
    render({ content: rows, columns: '2', align: 'start' });
    const [c, d] = items();
    expect(d.height).toBeLessThan(c.height);
    render({ content: rows, columns: '2', align: 'end' });
    const [e, f] = items();
    expect(f.bottom).toBeCloseTo(e.bottom, 1);
    render({ content: rows, columns: '2', align: 'center' });
    const [g, h] = items();
    expect(h.top + h.height / 2).toBeCloseTo(g.top + g.height / 2, 1);
  });

  it('lets an item marked span="full" take a whole row', () => {
    render({ content: `${cell('feature', 'span="full"')}${cell(2)}${cell(3)}${cell(4)}`, columns: '3' });
    const [feature, second, third] = items();
    expect(feature.width).toBeCloseTo(1000, 1);
    expect(second.top).toBeGreaterThan(feature.bottom);
    expect(third.left).toBeGreaterThan(second.left);
  });

  it("resets the items' own block margins, which base.css would otherwise add", () => {
    render({ content: '<p id="p">One</p><p>Two</p>' });
    expect(getComputedStyle(document.getElementById('p')).marginBlock).toBe('0px');
  });

  it('lets a wide item shrink to its track instead of stretching the grid', () => {
    render({ content: `<div><div style="inline-size:2000px">wide</div></div>${cell(2)}`, columns: '2' });
    const [wide, other] = items();
    expect(wide.width).toBeCloseTo((1000 - 16) / 2, 1);
    expect(other.right).toBeCloseTo(1000, 1);
  });

  it('accepts a zero gap given with a unit', () => {
    const grid = render({ columns: '2' });
    grid.style.setProperty('--mg-grid-gap', '0px');
    expect(columnCount()).toBe(2);
  });

  it('lets a consumer set the columns, minimum and gap with the public custom properties', () => {
    const grid = render({ columns: '2' });
    grid.style.cssText = '--mg-grid-columns:3;--mg-grid-gap:2rem;--mg-grid-min:8rem';
    const [a, b] = items();
    expect(columnCount()).toBe(3);
    expect(b.left - a.right).toBeCloseTo(32, 1);
  });

  it('keeps a nested grid on its own settings', () => {
    const inner = template({ columns: '2', min: 'sm', gap: 'sm', content: cell('x') + cell('y') });
    render({ columns: '2', content: `<div id="wrap">${inner}</div>${cell(2)}` });
    const [x, y] = [...document.querySelectorAll('mg-grid mg-grid > *')].map((el) => el.getBoundingClientRect());
    expect(y.left - x.right).toBeCloseTo(8, 1);
  });
});

describe('mg-grid baseline (grid.css only, no tokens)', () => {
  it('still lays out and spaces items from its literal fallbacks', async () => {
    await loadCss(gridCss);
    render({ columns: '2' });
    const [a, b] = items();
    expect(b.left - a.right).toBeCloseTo(16, 1);
    expect(columnCount()).toBe(2);
  });
});
