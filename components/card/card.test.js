import { afterEach, describe, expect, it } from 'vitest';
import template from './card.twig';
import cardCss from './card.css?url';
import { loadCss, loadTokens, resetDocument } from '../../tests/support.js';

const render = (args) => {
  document.body.innerHTML = template(args);
  return document.querySelector('mg-card');
};

const slot = (card, name) => card.querySelector(`:scope > [slot="${name}"]`);
const full = {
  media: '<img alt="" width="100" height="50" src="data:,">',
  header: 'Title',
  body: 'Body',
  footer: 'Foot',
};

afterEach(resetDocument);

describe('mg-card markup', () => {
  it('always emits the four slot wrappers, and leaves unused ones truly empty', () => {
    const card = render({ body: 'Only body' });
    expect([...card.children].map((child) => child.getAttribute('slot'))).toEqual([
      'media',
      'header',
      'body',
      'footer',
    ]);
    expect(slot(card, 'media').innerHTML).toBe('');
    expect(slot(card, 'body').textContent).toBe('Only body');
  });

  it('defaults variant and only sets compact when asked', () => {
    expect(render({}).getAttribute('variant')).toBe('outlined');
    expect(render({}).hasAttribute('compact')).toBe(false);
    expect(render({ compact: true }).hasAttribute('compact')).toBe(true);
  });

  it('does not escape slot HTML', () => {
    expect(slot(render({ body: '<p>hi</p>' }), 'body').querySelector('p')).not.toBeNull();
  });
});

describe('mg-card layout (baseline: card.css only, no tokens)', () => {
  it('is a grid with fallback padding and border', async () => {
    await loadCss(cardCss);
    const card = render(full);
    expect(getComputedStyle(card).display).toBe('grid');
    expect(getComputedStyle(card).borderTopWidth).toBe('1px');
    expect(getComputedStyle(slot(card, 'body')).paddingLeft).toBe('16px');
  });

  it('hides unused slots so they take no space', async () => {
    await loadCss(cardCss);
    const card = render({ body: 'Only body' });
    expect(getComputedStyle(slot(card, 'media')).display).toBe('none');
    expect(getComputedStyle(slot(card, 'footer')).display).toBe('none');
    // border 1px + padding 16px each side + one line of text
    expect(slot(card, 'body').getBoundingClientRect().height).toBeGreaterThan(32);
    expect(card.getBoundingClientRect().height).toBeLessThan(80);
  });

  it('keeps DOM order equal to visual order', async () => {
    await loadCss(cardCss);
    const card = render(full);
    const tops = ['media', 'header', 'body', 'footer'].map((name) => slot(card, name).getBoundingClientRect().top);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(4);
  });

  it('uses one padding between stacked text regions, not two', async () => {
    await loadCss(cardCss);
    const card = render(full);
    expect(getComputedStyle(slot(card, 'header')).paddingTop).toBe('16px');
    expect(getComputedStyle(slot(card, 'body')).paddingTop).toBe('0px');
    expect(getComputedStyle(slot(card, 'footer')).paddingTop).toBe('0px');
    // ...but a lone body or a body under media keeps its own top padding.
    expect(getComputedStyle(slot(render({ body: 'x' }), 'body')).paddingTop).toBe('16px');
  });

  it('makes media full-bleed', async () => {
    await loadCss(cardCss);
    const card = render(full);
    const image = card.querySelector('img');
    expect(image.getBoundingClientRect().width).toBe(card.clientWidth);
  });

  it('tightens padding when compact', async () => {
    await loadCss(cardCss);
    expect(getComputedStyle(slot(render({ ...full, compact: true }), 'body')).paddingLeft).toBe('8px');
  });

  it('keeps the footer at the bottom when the card is stretched', async () => {
    await loadCss(cardCss);
    document.body.innerHTML = `<div style="display:grid;height:400px">${template({ body: 'x', footer: 'Foot' })}</div>`;
    const card = document.querySelector('mg-card');
    const footer = slot(card, 'footer').getBoundingClientRect();
    expect(Math.round(card.getBoundingClientRect().bottom - footer.bottom)).toBe(1); // the border
  });
});

describe('mg-card nesting', () => {
  it('does not apply outer slot styles to a nested card', async () => {
    await loadCss(cardCss);
    const outer = render({ header: 'Outer', body: template({ compact: true, header: 'Inner', body: 'x' }) });
    const inner = slot(outer, 'body').querySelector('mg-card');
    expect(getComputedStyle(slot(inner, 'header')).paddingLeft).toBe('8px'); // inner is compact
    expect(getComputedStyle(slot(outer, 'header')).paddingLeft).toBe('16px');
    expect(getComputedStyle(slot(inner, 'header')).gridArea).toContain('header');
  });
});

describe('mg-card with tokens', () => {
  it('lets consumers override the public custom properties', async () => {
    await loadTokens();
    await loadCss(cardCss);
    const card = render(full);
    card.style.setProperty('--mg-card-padding', '3px');
    expect(getComputedStyle(slot(card, 'header')).paddingLeft).toBe('3px');
  });
});
