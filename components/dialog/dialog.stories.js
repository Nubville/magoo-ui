import { expect } from 'storybook/test';
import template from './dialog.twig';
import yml from './dialog.component.yml?raw';
import { sdcMeta } from '../../.storybook/sdc.js';

// The dialog JS tier is a no-op in current browsers, but load it so stories behave like Drupal.
import './dialog.js';

const buttons = (id) => `
  <button type="button" command="close" commandfor="${id}">Cancel</button>
  <button type="button" command="close" commandfor="${id}">Save</button>`;

const paragraph = 'Dialogs trap focus, close on Escape, and make the page behind them inert. All of it is native.';

export default {
  title: 'Components/Dialog',
  tags: ['autodocs'],
  ...sdcMeta({
    id: 'dialog',
    yml,
    template,
    args: {
      id: 'dialog-default',
      title: 'Edit profile',
      trigger_label: 'Open dialog',
      body: `<p style="margin:0">${paragraph}</p>`,
      footer: buttons('dialog-default'),
    },
  }),
};

export const Default = {};

export const Small = { args: { id: 'dialog-small', size: 'sm', title: 'Small', footer: buttons('dialog-small') } };

export const Large = { args: { id: 'dialog-large', size: 'lg', title: 'Large', footer: buttons('dialog-large') } };

export const ScrollingBody = {
  args: {
    id: 'dialog-scroll',
    title: 'Long content',
    body: Array.from({ length: 30 }, (_, i) => `<p>Paragraph ${i + 1}. ${paragraph}</p>`).join(''),
    footer: buttons('dialog-scroll'),
  },
};

export const WithForm = {
  args: {
    id: 'dialog-form',
    title: 'Rename',
    body: '<form method="dialog" id="rename"><p><label for="rename-input">Name</label><br><input id="rename-input" type="text" autofocus></p></form>',
    footer:
      '<button type="button" command="close" commandfor="dialog-form">Cancel</button><button type="submit" form="rename">Rename</button>',
  },
};

export const CustomTrigger = {
  args: {
    id: 'dialog-custom',
    title: 'Custom trigger',
    trigger: '<button type="button" command="show-modal" commandfor="dialog-custom">Any button will do</button>',
    footer: buttons('dialog-custom'),
  },
};

export const NotDismissible = {
  args: { id: 'dialog-modal-only', closedby: 'none', title: 'Choose one', footer: buttons('dialog-modal-only') },
};

// Opens the dialog, so the story test (and its axe run) checks the modal itself.
export const Open = {
  args: { id: 'dialog-open', title: 'Open on load', footer: buttons('dialog-open') },
  play: async ({ canvasElement }) => {
    const dialog = canvasElement.querySelector('dialog');
    canvasElement.querySelector('mg-dialog > button').click();
    await expect(dialog.open).toBe(true);
    // Let the enter animation finish, so contrast is measured at full opacity.
    await Promise.all(dialog.getAnimations({ subtree: true }).map((animation) => animation.finished));
  },
};
