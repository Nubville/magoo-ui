// WCAG contrast for the semantic color tokens (dev-only, not shipped). The tests and the Storybook contrast page both
// import this, so what the page shows is exactly what CI enforces. Color.js parses any CSS color the browser reports
// (rgb(), color(srgb …), oklch(), from color-mix()) and does the math.
import Color from 'colorjs.io';

export const AA = 4.5; // WCAG 1.4.3 normal text
export const AA_LARGE = 3; // WCAG 1.4.3 large text (18.66px bold, or 24px)
export const AAA = 7; // WCAG 1.4.6 normal text
export const AAA_LARGE = 4.5; // WCAG 1.4.6 large text
export const UI = 3; // WCAG 1.4.11 non-text contrast

const statuses = ['neutral', 'info', 'success', 'warning', 'danger'];
const surfaces = ['canvas', 'surface'];

/**
 * The pairings the design system promises. Each is [foreground, background, minimum] with bare token names
 * (`text` is --mg-color-text). Add any new pairing here and it is tested, and shown, in every brand and both modes.
 */
export const groups = [
  {
    title: 'Body text',
    criterion: '1.4.3 Contrast (Minimum)',
    pairs: ['canvas', 'surface', 'surface-muted'].flatMap((bg) => [
      ['text', bg, AA],
      ['text-muted', bg, AA],
    ]),
  },
  {
    title: 'Links',
    criterion: '1.4.3 Contrast (Minimum)',
    pairs: surfaces.flatMap((bg) => [
      ['link', bg, AA],
      ['link-hover', bg, AA],
    ]),
  },
  {
    title: 'Filled controls',
    criterion: '1.4.3 Contrast (Minimum)',
    pairs: [
      ['accent-fg', 'accent', AA],
      ['accent-fg', 'accent-hover', AA],
      ['text-inverse', 'text', AA],
    ],
  },
  {
    title: 'Status',
    criterion: '1.4.3 Contrast (Minimum)',
    pairs: statuses.map((status) => [`${status}-fg`, `${status}-bg`, AA]),
  },
  {
    title: 'Borders, focus and controls',
    criterion: '1.4.11 Non-text Contrast',
    pairs: surfaces.flatMap((bg) => [
      ['border-strong', bg, UI],
      ['focus-ring', bg, UI],
      ['accent', bg, UI],
    ]),
  },
];

export const pairs = groups.flatMap((group) => group.pairs);

/** Every token name that appears in a pair, for pickers. */
export const tokenNames = [...new Set(pairs.flat().filter((item) => typeof item === 'string'))].sort();

/**
 * The color as it is painted: in sRGB, in gamut, rounded to the 8 bits a screen shows. Contrast is measured on this,
 * so `color-mix()` results and unrounded floats agree with what a person sees.
 * @param {string | Color} input any CSS color, or a Color
 * @returns {Color}
 */
export const paint = (input) => {
  const color = new Color(input);
  if (color.alpha < 1) throw new Error(`${color.toString()} is translucent: contrast needs an opaque color`);
  const srgb = color.to('srgb').toGamut();
  return new Color(
    'srgb',
    srgb.coords.map((channel) => Math.round(channel * 255) / 255),
  );
};

/** WCAG 2 contrast ratio of two colors (any CSS color strings or Colors). */
export const contrast = (a, b) => Color.contrast(paint(a), paint(b), 'WCAG21');

/** APCA lightness contrast (Lc, 0 to about 108) of text on a background. The WCAG 3 draft, informational only. */
export const apca = (foreground, background) => Math.abs(Color.contrast(paint(background), paint(foreground), 'APCA'));

/** Truncate, never round up: 4.499 must not read as "4.50" and pass. */
export const floor2 = (ratio) => (Math.floor(ratio * 100) / 100).toFixed(2);

export const hex = (input) => paint(input).toString({ format: 'hex', collapse: false });

/** The `--mg-color-*` token names declared in a stylesheet, bare (`text`), without the translucent backdrop. */
export const colorTokenNames = (css) =>
  [...new Set([...css.matchAll(/--mg-color-([a-z0-9-]+)\s*:/g)].map((match) => match[1]))]
    .filter((name) => name !== 'backdrop')
    .sort();

/**
 * The color the browser actually paints for a token. Resolved inside a scope element that carries the brand and mode
 * attributes, so it works for any brand and either mode without touching the page. With no options it inherits
 * whatever the page (or <body>) already has.
 * @param {string} token e.g. "--mg-color-text"
 * @param {{ scheme?: 'light' | 'dark' | 'auto', brand?: string }} [options]
 * @returns {Color} the painted color (see paint)
 */
export const resolveColor = (token, { scheme, brand } = {}) => {
  const scope = document.createElement('div');
  scope.style.cssText = 'position:fixed;inset-block-start:0;inset-inline-start:-9999px;';
  if (scheme) scope.dataset.mgMode = scheme;
  if (brand && brand !== 'default') scope.dataset.mgTheme = brand;
  const probe = document.createElement('span');
  probe.style.color = `var(${token})`;
  scope.append(probe);
  document.body.append(scope);
  const color = getComputedStyle(probe).color;
  scope.remove();
  return paint(color);
};

/** Contrast ratio of two bare token names (`text`, `canvas`), in a brand and mode. */
export const ratioOf = (fg, bg, options) =>
  contrast(resolveColor(`--mg-color-${fg}`, options), resolveColor(`--mg-color-${bg}`, options));
