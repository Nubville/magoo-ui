import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import baseCss from './base.css?url';
import { loadCss, loadTokens, resetDocument } from '../tests/support.js';

const style = (selector) => getComputedStyle(document.querySelector(selector));
// What a semantic token resolves to as a used value, e.g. a color or a length.
const resolved = (property, token) => {
  const probe = document.createElement('div');
  probe.style[property] = `var(${token})`;
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
};

afterEach(() => {
  resetDocument();
  document.documentElement.style.colorScheme = '';
});

describe('tokens alone', () => {
  it('leave the color scheme to the host theme', async () => {
    await loadTokens();
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('normal');
  });
});

describe('base elements map to semantic tokens', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(baseCss);
    document.body.innerHTML = `
      <h1>H1</h1><h3>H3</h3><p>Paragraph <a href="#">link</a> <code>code</code> <mark>mark</mark></p>
      <blockquote>Quote</blockquote><hr>
      <table><caption>Cap</caption><thead><tr><th>Th</th></tr></thead><tbody><tr><td>Td</td></tr></tbody></table>
      <label for="i">Label</label><input id="i" value="x"><input id="bad" aria-invalid="true">
      <button>Button</button><button disabled>Off</button><div hidden id="h">hidden</div>`;
  });

  it('takes over the page color scheme', () => {
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('light dark');
  });

  it('styles the body from the canvas and text tokens', () => {
    expect(style('body').backgroundColor).toBe(resolved('color', '--mg-color-canvas'));
    expect(style('body').color).toBe(resolved('color', '--mg-color-text'));
    expect(style('body').fontSize).toBe(resolved('fontSize', '--mg-text-body-size'));
    expect(style('body').margin).toBe('0px');
  });

  it('sizes headings from the heading scale', () => {
    expect(style('h1').fontSize).toBe(resolved('fontSize', '--mg-text-h1-size'));
    expect(style('h3').fontSize).toBe(resolved('fontSize', '--mg-text-h3-size'));
    expect(Number(style('h1').fontWeight)).toBe(600);
  });

  it('colors links and marks from semantic roles', () => {
    expect(style('a').color).toBe(resolved('color', '--mg-color-link'));
    expect(style('mark').backgroundColor).toBe(resolved('color', '--mg-color-warning-bg'));
    expect(style('code').backgroundColor).toBe(resolved('color', '--mg-color-surface-muted'));
  });

  it('spaces blocks with the stack tokens', () => {
    expect(style('p').marginBottom).toBe(resolved('marginBottom', '--mg-space-stack-md'));
  });

  it('styles form controls with a 3:1 border and the control size', () => {
    expect(style('#i').borderTopColor).toBe(resolved('color', '--mg-color-border-strong'));
    expect(style('#i').minHeight).toBe(resolved('minHeight', '--mg-size-control'));
    expect(style('#i').borderTopLeftRadius).toBe(resolved('borderRadius', '--mg-radius-control'));
    expect(style('#bad').borderTopColor).toBe(resolved('color', '--mg-color-danger-fg'));
    expect(style('button').minHeight).toBe(resolved('minHeight', '--mg-size-control'));
  });

  it('dims disabled controls and keeps [hidden] hidden', () => {
    expect(style('button[disabled]').opacity).toBe('0.6');
    expect(style('#h').display).toBe('none');
  });

  it('is beaten by any unlayered CSS, so it is safe beside a theme', () => {
    const theme = Object.assign(document.createElement('style'), { textContent: 'h1 { font-size: 11px; }' });
    document.head.append(theme);
    expect(style('h1').fontSize).toBe('11px');
    theme.remove();
  });

  it('follows a forced dark scheme', () => {
    const light = style('body').backgroundColor;
    document.documentElement.style.colorScheme = 'dark';
    expect(style('body').backgroundColor).not.toBe(light);
  });
});
