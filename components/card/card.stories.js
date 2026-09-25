import { expect } from 'storybook/test';
import template from './card.twig';
import yml from './card.component.yml?raw';
import { sdcMeta } from '../../.storybook/sdc.js';

// Decorative image so stories need no network.
const image =
  '<img alt="" width="640" height="240" src="data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 240"><rect width="640" height="240" fill="#7c9cd8"/><circle cx="480" cy="80" r="40" fill="#f5d476"/><path d="M0 240 L200 90 L340 190 L440 130 L640 240Z" fill="#3d5a94"/></svg>',
  ) +
  '">';

const text = 'Cards group related content. Slots you leave out take no space.';

export default {
  title: 'Components/Card',
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  ...sdcMeta({
    id: 'card',
    yml,
    template,
    args: {
      header: 'Card title',
      body: `<p style="margin:0">${text}</p>`,
      footer: '<a href="#">Read more</a>',
    },
  }),
};

export const Default = {};

export const WithMedia = { args: { media: image } };

export const Compact = { args: { compact: true } };

export const BodyOnly = { args: { header: '', footer: '' } };

export const Variants = {
  render: () =>
    ['outlined', 'elevated', 'flat']
      .map((variant) => template({ variant, header: variant, body: `<p style="margin:0">${text}</p>` }))
      .map((card) => `<div style="margin-block-end:1rem">${card}</div>`)
      .join(''),
};

export const Nested = {
  render: () =>
    template({
      header: 'Outer card',
      body: template({ variant: 'flat', compact: true, header: 'Inner card', body: 'Styled independently.' }),
    }),
  play: async ({ canvasElement }) => {
    const [outer, inner] = canvasElement.querySelectorAll('mg-card');
    await expect(getComputedStyle(inner.querySelector(':scope > [slot="header"]')).gridArea).toContain('header');
    await expect(outer).not.toBe(inner);
  },
};

// Cards in a row stretch to the same height, and footers stay at the bottom.
export const EqualHeight = {
  render: () => `
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem">
      ${template({ header: 'Short', body: 'One line.', footer: '<a href="#">Link</a>' })}
      ${template({ header: 'Longer', body: `${text} ${text} ${text}`, footer: '<a href="#">Link</a>' })}
      ${template({ media: image, header: 'With media', body: 'Media on top.', footer: '<a href="#">Link</a>' })}
    </div>`,
};
