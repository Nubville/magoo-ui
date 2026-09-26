import { expect } from 'storybook/test';
import template from './stack.twig';
import yml from './stack.component.yml?raw';
import { sdcMeta } from '../../.storybook/sdc.js';

const items =
  '<h3>A heading</h3><p>A paragraph. The stack owns the space between blocks, so none of them need a margin.</p><button type="button">An action</button>';

export default {
  title: 'Layout/Stack',
  tags: ['autodocs'],
  ...sdcMeta({ id: 'stack', yml, template, layout: 'padded', args: { content: items } }),
};

export const Default = {};

export const Gaps = {
  render: () =>
    `<div style="display:flex;gap:var(--mg-space-gap-lg)">${['none', 'sm', 'md', 'lg']
      .map(
        (gap) =>
          `<div style="flex:1">${template({ gap, content: `<mg-badge>${gap}</mg-badge><p>One</p><p>Two</p><p>Three</p>` })}</div>`,
      )
      .join('')}</div>`,
};

export const Alignment = {
  render: () =>
    `<div style="display:flex;gap:var(--mg-space-gap-lg)">${['stretch', 'start', 'center', 'end']
      .map(
        (align) =>
          `<div style="flex:1;border:var(--mg-border-width) dashed var(--mg-color-border);padding:var(--mg-space-inset-sm)">${template({ align, content: `<button type="button">${align}</button><button type="button">Longer label</button>` })}</div>`,
      )
      .join('')}</div>`,
};

export const Nested = {
  render: () =>
    template({
      gap: 'lg',
      content: `<h3>Outer, large gap</h3>${template({ gap: 'sm', content: '<p>Inner, small gap</p><p>Inner, small gap</p>' })}<p>Back in the outer stack</p>`,
    }),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('mg-stack')).toHaveLength(2);
  },
};
