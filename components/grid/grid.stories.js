import { expect } from 'storybook/test';
import template from './grid.twig';
import yml from './grid.component.yml?raw';
import { sdcMeta } from '../../.storybook/sdc.js';

const tile = (label, body = '', extra = '') =>
  `<div ${extra} style="padding:var(--mg-space-inset-md);background:var(--mg-color-surface-muted);border:var(--mg-border-width) solid var(--mg-color-border);border-radius:var(--mg-radius-container)"><strong>${label}</strong>${body}</div>`;
const tiles = (count, body) => Array.from({ length: count }, (_, i) => tile(`Item ${i + 1}`, body)).join('');

export default {
  title: 'Layout/Grid',
  tags: ['autodocs'],
  ...sdcMeta({ id: 'grid', yml, template, layout: 'fullscreen', args: { content: tiles(7) } }),
};

export const Default = { render: (args) => `<div style="padding:var(--mg-space-inset-md)">${template(args)}</div>` };

// Resize the canvas: columns drop by themselves as the width shrinks, with no breakpoints.
export const CappedColumns = {
  render: () =>
    ['2', '3', '4']
      .map(
        (columns) =>
          `<div style="padding:var(--mg-space-inset-md)"><p><code>columns="${columns}"</code></p>${template({ columns, content: tiles(6) })}</div>`,
      )
      .join(''),
};

export const MinimumWidths = {
  render: () =>
    ['sm', 'md', 'lg']
      .map(
        (min) =>
          `<div style="padding:var(--mg-space-inset-md)"><p><code>min="${min}"</code></p>${template({ min, content: tiles(6) })}</div>`,
      )
      .join(''),
};

// Items in a row share a height, whatever their content.
export const EqualHeights = {
  render: () =>
    `<div style="padding:var(--mg-space-inset-md)">${template({
      columns: '3',
      content: [
        tile('Short', '<p>Just a line.</p>'),
        tile(
          'Longer',
          '<p>This one has quite a lot more to say, so it runs to several lines when the columns are narrow.</p>',
        ),
        tile('Medium', '<p>A sentence or two of content.</p>'),
      ].join(''),
    })}</div>`,
};

export const FeaturedItem = {
  args: {
    columns: '5',
  },
  render: () =>
    `<div style="padding:var(--mg-space-inset-md)">${template({
      columns: '3',
      content: tile('Featured', '<p>span="full" takes a whole row.</p>', 'span="full"') + tiles(5),
    })}</div>`,
  play: async ({ canvasElement }) => {
    const [featured, next] = [...canvasElement.querySelectorAll('mg-grid > *')];
    await expect(featured.getBoundingClientRect().width).toBeGreaterThan(next.getBoundingClientRect().width * 2);
  },
};

export const Gaps = {
  render: () =>
    ['none', 'sm', 'md', 'lg']
      .map(
        (gap) =>
          `<div style="padding:var(--mg-space-inset-md)"><p><code>gap="${gap}"</code></p>${template({ gap, columns: '3', content: tiles(3) })}</div>`,
      )
      .join(''),
};
