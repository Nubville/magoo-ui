import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import template from './stack.twig';
import stackCss from './stack.css?url';
import baseCss from '../../tokens/base.css?url';
import { loadCss, loadTokens, resetDocument } from '../../tests/support.js';

const items = '<p id="a">One</p><p id="b">Two</p><p id="c">Three</p>';

const render = (args = {}, style = '') => {
  document.body.innerHTML = `<div style="${style}">${template({ content: items, ...args })}</div>`;
  return document.querySelector('mg-stack');
};
const box = (id) => document.getElementById(id).getBoundingClientRect();

afterEach(resetDocument);

describe('mg-stack markup', () => {
  it('defaults gap and align, and passes overrides through', () => {
    expect(render().getAttribute('gap')).toBe('md');
    expect(render().getAttribute('align')).toBe('stretch');
    const stack = render({ gap: 'lg', align: 'center' });
    expect(stack.getAttribute('gap')).toBe('lg');
    expect(stack.getAttribute('align')).toBe('center');
  });

  it('has no wrapper: the children are the stack items', () => {
    const stack = render();
    expect([...stack.children].map((child) => child.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('mg-stack layout', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(baseCss);
    await loadCss(stackCss);
  });

  it('is a single column', () => {
    const style = getComputedStyle(render());
    expect(style.display).toBe('flex');
    expect(style.flexDirection).toBe('column');
  });

  it.each([
    ['md', 16],
    ['sm', 8],
    ['lg', 32],
    ['none', 0],
  ])('puts exactly the %s gap (%spx) between children', (gap, pixels) => {
    render({ gap });
    expect(box('b').top - box('a').bottom).toBeCloseTo(pixels, 1);
    expect(box('c').top - box('b').bottom).toBeCloseTo(pixels, 1);
  });

  it('does not add space before the first or after the last child', () => {
    const stack = render();
    expect(box('a').top).toBeCloseTo(stack.getBoundingClientRect().top, 1);
    expect(box('c').bottom).toBeCloseTo(stack.getBoundingClientRect().bottom, 1);
  });

  it("resets the children's own block margins, which base.css would otherwise add to the gap", () => {
    render();
    expect(getComputedStyle(document.getElementById('b')).marginBlock).toBe('0px');
  });

  it('leaves the same paragraphs with their base margins outside a stack', () => {
    document.body.innerHTML = '<p id="loose">Loose</p>';
    expect(Number.parseFloat(getComputedStyle(document.getElementById('loose')).marginBlockEnd)).toBeGreaterThan(0);
  });

  it('stretches children by default, and shrinks them to content for start, center and end', () => {
    const stack = render({}, 'inline-size:30rem');
    const width = stack.getBoundingClientRect().width;
    expect(box('a').width).toBeCloseTo(width, 1);
    for (const align of ['start', 'center', 'end']) {
      render({ align }, 'inline-size:30rem');
      expect(box('a').width, align).toBeLessThan(width / 2);
    }
    const centered = render({ align: 'center' }, 'inline-size:30rem');
    const { left, width: w } = box('a');
    expect(left + w / 2).toBeCloseTo(centered.getBoundingClientRect().left + width / 2, 0);
  });

  it('lets a consumer set the gap with the public custom property, whatever the attribute', () => {
    render({ gap: 'sm' }, '--mg-stack-gap:3rem');
    expect(box('b').top - box('a').bottom).toBeCloseTo(48, 1);
  });

  it('keeps a nested stack on its own gap', () => {
    const inner = template({ gap: 'sm', content: '<p id="x">x</p><p id="y">y</p>' });
    render({ gap: 'lg', content: `<div id="wrap">${inner}</div><p id="after">after</p>` });
    expect(box('y').top - box('x').bottom).toBeCloseTo(8, 1);
    expect(box('after').top - document.getElementById('wrap').getBoundingClientRect().bottom).toBeCloseTo(32, 1);
  });
});

describe('mg-stack baseline (stack.css only, no tokens)', () => {
  it('still spaces children from its literal fallbacks', async () => {
    await loadCss(stackCss);
    document.body.innerHTML = template({ content: '<div id="a">a</div><div id="b">b</div>' });
    expect(box('b').top - box('a').bottom).toBeCloseTo(16, 1);
  });
});
