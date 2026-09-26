import { expect } from 'storybook/test';
import template from './popover.twig';
import yml from './popover.component.yml?raw';
import { sdcMeta } from '../../.storybook/sdc.js';

const body = '<p style="margin:0">A non-modal panel. Press Escape or click outside to close it.</p>';

export default {
  title: 'Components/Popover',
  tags: ['autodocs'],
  ...sdcMeta({
    id: 'popover',
    yml,
    template,
    args: { id: 'popover-default', trigger_label: 'Details', body },
  }),
};

export const Default = {};

// Each placement gets room to open into, so none of them flip.
export const Placements = {
  render: () =>
    `<div style="display:grid;grid-template-columns:repeat(2,max-content);gap:12rem 14rem;padding:8rem 10rem">${[
      'top',
      'bottom',
      'start',
      'end',
    ]
      .map((placement) => template({ id: `popover-${placement}`, trigger_label: placement, placement, body }))
      .join('')}</div>`,
};

export const Manual = {
  args: {
    id: 'popover-manual',
    dismiss: 'manual',
    trigger_label: 'Manual',
    body: `<p style="margin:0 0 var(--mg-space-stack-sm,0.5rem)">Stays open until you use the trigger or this button, and ignores Escape and outside clicks.</p><button type="button" popovertarget="popover-manual" popovertargetaction="hide">Done</button>`,
  },
};

export const CustomTrigger = {
  args: {
    id: 'popover-custom',
    trigger: '<button type="button" popovertarget="popover-custom" aria-label="More information">ⓘ</button>',
  },
};

export const RichContent = {
  args: {
    id: 'popover-rich',
    label: 'Share this page',
    trigger_label: 'Share',
    body: `<h3 style="margin:0 0 var(--mg-space-stack-sm,0.5rem)">Share</h3><ul style="margin:0;padding-inline-start:1.25rem"><li><a href="#">Copy link</a></li><li><a href="#">Email</a></li><li><a href="#">Print</a></li></ul>`,
  },
};

// Opens the popover, so the story test (and its axe run) checks the panel itself.
export const Open = {
  args: { id: 'popover-open', trigger_label: 'Open on load' },
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector('[popover]');
    canvasElement.querySelector('mg-popover > button').click();
    await expect(panel.matches(':popover-open')).toBe(true);
    // Let the enter animation finish, so contrast is measured at full opacity.
    await Promise.all(panel.getAnimations().map((animation) => animation.finished));
  },
};
