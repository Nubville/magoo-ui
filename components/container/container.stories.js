import template from './container.twig';
import yml from './container.component.yml?raw';
import { sdcMeta } from '../../.storybook/sdc.js';

// The tinted page behind makes the column and its gutter visible.
const page = (inner) =>
  `<div style="background:var(--mg-color-surface-muted);padding-block:var(--mg-space-inset-lg)">${inner}</div>`;
const column = (label) =>
  `<div style="background:var(--mg-color-surface);border:var(--mg-border-width) solid var(--mg-color-border);padding:var(--mg-space-inset-md)"><strong>${label}</strong><p style="margin-block-end:0">Centered, at most this wide, with a gutter each side.</p></div>`;

export default {
  title: 'Layout/Container',
  tags: ['autodocs'],
  ...sdcMeta({ id: 'container', yml, template, layout: 'fullscreen', args: { content: column('Container') } }),
};

export const Default = { render: (args) => page(template(args)) };

export const Sizes = {
  render: () =>
    ['sm', 'md', 'lg', 'full']
      .map(
        (size) =>
          `<div style="margin-block-end:var(--mg-space-stack-md)">${page(template({ size, content: column(`size="${size}"`) }))}</div>`,
      )
      .join(''),
};
