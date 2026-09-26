import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import template from './avatar.twig';
import avatarCss from './avatar.css?url';
import { loadCss, loadTokens, resetDocument } from '../../tests/support.js';
// The JS tier: it must only ever touch <img> inside <mg-avatar>.
import './avatar.js';

const pixel =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const broken = '/does-not-exist.png';

const render = (args = {}) => {
  document.body.innerHTML = template({ initials: 'ab', ...args });
  return document.querySelector('mg-avatar');
};
const size = (el) => el.getBoundingClientRect().width;
const settled = (image) =>
  new Promise((resolve) => (image.complete ? resolve() : image.addEventListener('load', resolve, { once: true })));
const failed = (image) => new Promise((resolve) => image.addEventListener('error', resolve, { once: true }));

beforeEach(async () => {
  await page.viewport(800, 600);
});
afterEach(resetDocument);

describe('mg-avatar markup', () => {
  it('defaults shape and size, and passes overrides through', () => {
    const avatar = render();
    expect(avatar.getAttribute('variant')).toBe('circle');
    expect(avatar.getAttribute('size')).toBe('md');
    const custom = render({ variant: 'square', size: 'xl' });
    expect(custom.getAttribute('variant')).toBe('square');
    expect(custom.getAttribute('size')).toBe('xl');
  });

  it('is one named image to assistive technology when given a name, and nothing when not', () => {
    const named = render({ alt: 'Ada Lovelace', src: pixel });
    expect(named.getAttribute('role')).toBe('img');
    expect(named.getAttribute('aria-label')).toBe('Ada Lovelace');
    const anonymous = render({ src: pixel });
    expect(anonymous.hasAttribute('role')).toBe(false);
    expect(anonymous.hasAttribute('aria-label')).toBe(false);
  });

  it('keeps the picture and the initials out of the accessibility tree', () => {
    const avatar = render({ alt: 'Ada', src: pixel });
    expect(avatar.querySelector('img').getAttribute('alt')).toBe('');
    expect(avatar.querySelector('span').getAttribute('aria-hidden')).toBe('true');
    expect(avatar.querySelector('span').textContent).toBe('ab');
  });

  it('renders no image without a src', () => {
    expect(render().querySelector('img')).toBeNull();
  });

  it('escapes the name and the src so they cannot break out of their attributes', () => {
    const avatar = render({ alt: '"><b>x</b>', src: '/a.png?x="y"&z=1' });
    expect(avatar.getAttribute('aria-label')).toBe('"><b>x</b>');
    expect(avatar.querySelector('b')).toBeNull();
    expect(avatar.querySelector('img').getAttribute('src')).toBe('/a.png?x="y"&z=1');
    expect(avatar.children).toHaveLength(2);
  });
});

describe('mg-avatar layout', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(avatarCss);
  });

  it.each([
    ['xs', 24],
    ['sm', 32],
    ['md', 40],
    ['lg', 56],
    ['xl', 80],
  ])('is %s: %spx square', (name, pixels) => {
    const avatar = render({ size: name });
    expect(size(avatar)).toBe(pixels);
    expect(avatar.getBoundingClientRect().height).toBe(pixels);
  });

  it.each([
    ['circle', '999px'], // --mg-radius-round, the pill
    ['rounded', '5px'], // --mg-radius-control
    ['square', '0px'],
  ])('is %s (radius %s, following the tokens)', (variant, radius) => {
    expect(getComputedStyle(render({ variant })).borderTopLeftRadius).toBe(radius);
  });

  it('does not shrink in a tight flex row', () => {
    document.body.innerHTML = `<div style="display:flex;inline-size:20px">${template({ initials: 'a' })}</div>`;
    expect(size(document.querySelector('mg-avatar'))).toBe(40);
  });

  it('shows the initials, centered and uppercase, when there is no picture', () => {
    const avatar = render();
    const span = avatar.querySelector('span');
    const a = avatar.getBoundingClientRect();
    const s = span.getBoundingClientRect();
    expect(getComputedStyle(avatar).textTransform).toBe('uppercase');
    expect(s.left + s.width / 2).toBeCloseTo(a.left + a.width / 2, 0);
    expect(s.top + s.height / 2).toBeCloseTo(a.top + a.height / 2, 0);
  });

  it('covers the initials with a loaded picture, however transparent it is', async () => {
    const avatar = render({ src: pixel });
    const image = avatar.querySelector('img');
    await settled(image);
    const { left, top, width } = avatar.getBoundingClientRect();
    expect(document.elementFromPoint(left + width / 2, top + width / 2)).toBe(image);
    expect(getComputedStyle(image).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(image.getBoundingClientRect().width).toBeCloseTo(width - 2, 0);
  });

  it('lets a consumer set the size and the colors with the public custom properties', () => {
    document.body.innerHTML = template({ initials: 'a' });
    const avatar = document.querySelector('mg-avatar');
    avatar.style.cssText = '--mg-avatar-size:3rem;--mg-avatar-bg:rgb(1, 2, 3)';
    expect(size(avatar)).toBe(48);
    expect(getComputedStyle(avatar).backgroundColor).toBe('rgb(1, 2, 3)');
  });
});

describe('mg-avatar JS tier (a picture that fails to load)', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(avatarCss);
  });

  it('hides a broken picture so the initials show', async () => {
    const avatar = render({ src: broken });
    const image = avatar.querySelector('img');
    await failed(image);
    expect(image.hidden).toBe(true);
    expect(getComputedStyle(image).display).toBe('none');
    const { left, top, width } = avatar.getBoundingClientRect();
    expect(document.elementFromPoint(left + width / 2, top + width / 2)).toBe(avatar.querySelector('span'));
  });

  it('leaves a picture that loads alone', async () => {
    const image = render({ src: pixel }).querySelector('img');
    await settled(image);
    expect(image.hidden).toBe(false);
  });

  it('only touches images inside an avatar', async () => {
    document.body.innerHTML = `<img id="plain" src="${broken}" alt="">`;
    const plain = document.getElementById('plain');
    await failed(plain);
    expect(plain.hidden).toBe(false);
  });

  it('handles avatars inserted after the script ran', async () => {
    document.body.insertAdjacentHTML('beforeend', template({ initials: 'late', src: `${broken}?late` }));
    const image = document.querySelector('mg-avatar > img');
    await failed(image);
    expect(image.hidden).toBe(true);
  });

  it('catches an image that had already failed before the script loaded', async () => {
    const avatar = render({ src: `${broken}?early` });
    const image = avatar.querySelector('img');
    await failed(image);
    image.hidden = false; // The error came and went unhandled, as if no listener existed.
    await import('./avatar.js?again');
    expect(image.hidden).toBe(true);
  });
});

describe('mg-avatar baseline (avatar.css only, no tokens)', () => {
  it('still has a size, a shape and colors from its literal fallbacks', async () => {
    await loadCss(avatarCss);
    const avatar = render();
    const style = getComputedStyle(avatar);
    expect(size(avatar)).toBe(40);
    expect(style.borderTopLeftRadius).toBe('999px');
    expect(style.backgroundColor).toBe('rgb(241, 245, 249)');
  });
});
