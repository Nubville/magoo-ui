import { afterEach, describe, expect, it } from 'vitest';
import template from './badge.twig';
import badgeCss from './badge.css?url';
import { loadCss, loadTokens, resetDocument } from '../../tests/support.js';

const render = (args) => {
  document.body.innerHTML = template(args);
  return document.querySelector('mg-badge');
};

afterEach(resetDocument);

describe('mg-badge markup', () => {
  it('renders variant and size as attributes with defaults', () => {
    const badge = render({ content: 'Draft' });
    expect(badge.getAttribute('variant')).toBe('neutral');
    expect(badge.getAttribute('size')).toBe('md');
    expect(badge.textContent).toBe('Draft');
  });

  it('passes props through as attributes', () => {
    const badge = render({ variant: 'danger', size: 'sm', content: 'Failed' });
    expect(badge.getAttribute('variant')).toBe('danger');
    expect(badge.getAttribute('size')).toBe('sm');
  });
});

describe('mg-badge baseline (badge.css only, no tokens)', () => {
  it('still has a background and padding from its fallbacks', async () => {
    await loadCss(badgeCss);
    const style = getComputedStyle(render({ content: 'Draft' }));
    expect(style.backgroundColor).toBe('rgb(241, 245, 249)');
    expect(style.paddingInline).toBe('8px');
    expect(style.display).toBe('inline-block');
  });

  it('applies variant fallbacks', async () => {
    await loadCss(badgeCss);
    const style = getComputedStyle(render({ variant: 'success', content: 'OK' }));
    expect(style.backgroundColor).toBe('rgb(220, 252, 231)');
  });
});

describe('mg-badge with tokens', () => {
  it('lets consumers override the public custom properties', async () => {
    await loadTokens();
    await loadCss(badgeCss);
    const badge = render({ content: 'Draft' });
    badge.style.setProperty('--mg-badge-bg', 'rgb(1, 2, 3)');
    expect(getComputedStyle(badge).backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('lets unlayered consumer CSS win over the component layer', async () => {
    await loadTokens();
    await loadCss(badgeCss);
    const style = Object.assign(document.createElement('style'), { textContent: 'mg-badge { padding-inline: 1px; }' });
    document.head.append(style);
    expect(getComputedStyle(render({ content: 'Draft' })).paddingInline).toBe('1px');
    style.remove();
  });
});
