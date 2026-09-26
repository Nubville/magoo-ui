import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import template from './container.twig';
import containerCss from './container.css?url';
import { loadCss, loadTokens, resetDocument } from '../../tests/support.js';

const render = (args = {}, style = '') => {
  document.body.style.margin = '0';
  document.body.innerHTML = template({ content: '<div id="inner" style="block-size:2rem">Content</div>', ...args });
  const container = document.querySelector('mg-container');
  if (style) container.style.cssText = style;
  return container;
};
const width = (el) => el.getBoundingClientRect().width;

beforeEach(async () => {
  await page.viewport(1800, 800);
});
afterEach(() => {
  resetDocument();
  document.body.style.margin = '';
});

describe('mg-container markup', () => {
  it('defaults size, passes overrides through and has no wrapper', () => {
    expect(render().getAttribute('size')).toBe('md');
    expect(render({ size: 'lg' }).getAttribute('size')).toBe('lg');
    expect(render().firstElementChild.id).toBe('inner');
  });
});

describe('mg-container layout', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(containerCss);
  });

  it('is a block', () => {
    expect(getComputedStyle(render()).display).toBe('block');
  });

  it.each([
    ['sm', 640],
    ['md', 1024],
    ['lg', 1280],
  ])('is at most %s wide (%spx), gutter included', (size, max) => {
    const container = render({ size });
    expect(width(container)).toBe(max);
    expect(width(document.getElementById('inner'))).toBe(max - 32);
  });

  it('centers itself in a wider viewport', () => {
    const { left, right } = render().getBoundingClientRect();
    expect(left).toBeCloseTo(window.innerWidth - right, 1);
    expect(left).toBeGreaterThan(0);
  });

  it('has no width limit when full, only the gutter', () => {
    const container = render({ size: 'full' });
    expect(width(container)).toBe(window.innerWidth);
    expect(width(document.getElementById('inner'))).toBe(window.innerWidth - 32);
  });

  it('shrinks with a narrow viewport and never overflows it', async () => {
    await page.viewport(360, 700);
    const container = render({ size: 'lg' });
    expect(width(container)).toBe(360);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it('lets a consumer set the maximum and the gutter with the public custom properties', () => {
    const container = render({}, '--mg-container-max:30rem;--mg-container-gutter:0');
    expect(width(container)).toBe(480);
    expect(width(document.getElementById('inner'))).toBe(480);
  });
});

describe('mg-container baseline (container.css only, no tokens)', () => {
  it('still has its width and gutter from literal fallbacks', async () => {
    await loadCss(containerCss);
    const container = render();
    expect(width(container)).toBe(1024);
    expect(getComputedStyle(container).paddingLeft).toBe('16px');
  });
});
