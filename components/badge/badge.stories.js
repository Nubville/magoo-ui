import { expect } from 'storybook/test';
import template from './badge.twig';
import yml from './badge.component.yml?raw';
import { sdcMeta } from '../../.storybook/sdc.js';

export default {
  title: 'Components/Badge',
  tags: ['autodocs'],
  ...sdcMeta({ id: 'badge', yml, template, args: { content: 'Draft' } }),
};

export const Default = {};

export const Success = { args: { variant: 'success', content: 'Published' } };

export const Small = { args: { size: 'sm', variant: 'info', content: 'New' } };

export const AllVariants = {
  render: () =>
    ['neutral', 'info', 'success', 'warning', 'danger']
      .map((variant) => template({ variant, content: variant }))
      .join(' '),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('mg-badge')).toHaveLength(5);
  },
};
