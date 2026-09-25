import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import template from './dialog.twig';
import dialogCss from './dialog.css?url';
import { loadCss, loadTokens, resetDocument } from '../../tests/support.js';
// The JS tier must be a harmless no-op where Invoker Commands and closedby exist (Chromium here).
import './dialog.js';

const base = { id: 'd', title: 'Edit profile', body: '<p>Body</p>', footer: '<button>Ok</button>' };

const render = (args = {}) => {
  document.body.innerHTML = template({ ...base, ...args });
  return {
    host: document.querySelector('mg-dialog'),
    dialog: document.querySelector('dialog'),
    trigger: document.querySelector('mg-dialog > button'),
  };
};

beforeEach(async () => {
  await page.viewport(1200, 800);
});
afterEach(resetDocument);

describe('mg-dialog markup', () => {
  it('wires the trigger, close button and accessible name to the dialog id', () => {
    const { dialog, trigger } = render();
    expect(trigger.getAttribute('command')).toBe('show-modal');
    expect(trigger.getAttribute('commandfor')).toBe('d');
    expect(trigger.textContent.trim()).toBe('Open');
    expect(dialog.id).toBe('d');
    expect(dialog.getAttribute('aria-labelledby')).toBe('d-title');
    expect(document.getElementById('d-title').textContent).toBe('Edit profile');
    const close = dialog.querySelector('[slot="header"] > button');
    expect(close.getAttribute('command')).toBe('close');
    expect(close.getAttribute('commandfor')).toBe('d');
    expect(close.getAttribute('aria-label')).toBe('Close');
  });

  it('defaults size and closedby, and passes overrides through', () => {
    expect(render().host.getAttribute('size')).toBe('md');
    expect(render().dialog.getAttribute('closedby')).toBe('any');
    const { host, dialog } = render({ size: 'lg', closedby: 'none' });
    expect(host.getAttribute('size')).toBe('lg');
    expect(dialog.getAttribute('closedby')).toBe('none');
  });

  it('uses the trigger slot instead of the default button when given', () => {
    const { host } = render({ trigger: '<button id="mine" command="show-modal" commandfor="d">Mine</button>' });
    expect(host.querySelectorAll(':scope > button')).toHaveLength(1);
    expect(host.querySelector(':scope > #mine')).not.toBeNull();
  });

  it('leaves unused slots truly empty', () => {
    const { dialog } = render({ footer: undefined });
    expect(dialog.querySelector('[slot="footer"]').innerHTML).toBe('');
  });
});

describe('mg-dialog native behavior', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(dialogCss);
  });

  it('is not displayed while closed, despite the component setting display when open', () => {
    const { dialog } = render();
    expect(getComputedStyle(dialog).display).toBe('none');
  });

  it('opens as a modal from the trigger with no JS of its own, and lays out as a grid', async () => {
    const { dialog, trigger } = render();
    await userEvent.click(trigger);
    expect(dialog.open).toBe(true);
    expect(dialog.matches(':modal')).toBe(true);
    expect(getComputedStyle(dialog).display).toBe('grid');
  });

  it('moves focus into the dialog, and back to the trigger on Escape', async () => {
    const { dialog, trigger } = render();
    await userEvent.click(trigger);
    expect(dialog.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes from the close button and from footer buttons using command="close"', async () => {
    const { dialog, trigger } = render({
      footer: '<button id="cancel" command="close" commandfor="d">Cancel</button>',
    });
    await userEvent.click(trigger);
    await userEvent.click(dialog.querySelector('[slot="header"] > button'));
    expect(dialog.open).toBe(false);
    await userEvent.click(trigger);
    await userEvent.click(document.getElementById('cancel'));
    expect(dialog.open).toBe(false);
  });

  it('closes when a form with method=dialog is submitted', async () => {
    const { dialog, trigger } = render({ body: '<form method="dialog"><button id="go">Go</button></form>' });
    await userEvent.click(trigger);
    await userEvent.click(document.getElementById('go'));
    expect(dialog.open).toBe(false);
  });

  it('makes the rest of the page inert while open', async () => {
    const { trigger } = render();
    await userEvent.click(trigger);
    // The trigger sits behind the modal, so it can no longer be reached: the modal owns focus.
    expect(trigger.matches(':focus')).toBe(false);
    expect(document.querySelector('dialog').matches(':modal')).toBe(true);
  });

  it('scrolls the body, not the page, when the content is tall', async () => {
    const { dialog, trigger } = render({ body: '<p style="block-size:3000px">Tall</p>' });
    await userEvent.click(trigger);
    const body = dialog.querySelector('[slot="body"]');
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(dialog.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight - 32);
    expect(getComputedStyle(body).overflowY).toBe('auto');
  });

  it.each([
    ['sm', 352],
    ['md', 512],
    ['lg', 768],
  ])('is %s wide (%spx)', async (size, width) => {
    const { dialog, trigger } = render({ size });
    await userEvent.click(trigger);
    expect(Math.round(dialog.getBoundingClientRect().width)).toBe(width);
  });

  it('never exceeds the viewport on a narrow screen', async () => {
    await page.viewport(360, 700);
    const { dialog, trigger } = render({ size: 'lg' });
    await userEvent.click(trigger);
    expect(dialog.getBoundingClientRect().width).toBeLessThanOrEqual(360 - 32);
  });

  it('lets consumers override the public custom properties', async () => {
    const { dialog, host, trigger } = render();
    host.style.setProperty('--mg-dialog-width', '20rem');
    await userEvent.click(trigger);
    expect(Math.round(dialog.getBoundingClientRect().width)).toBe(320);
  });
});
