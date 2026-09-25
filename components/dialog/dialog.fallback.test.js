// The JS tier, exercised as if the browser had no Invoker Commands and no closedby.
// Separate file: it removes native feature markers from the prototypes before dialog.js loads.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import template from './dialog.twig';
import dialogCss from './dialog.css?url';
import { loadCss, resetDocument } from '../../tests/support.js';

const removed = [];
const hide = (proto, name) => {
  const descriptor = Object.getOwnPropertyDescriptor(proto, name);
  if (descriptor) {
    removed.push([proto, name, descriptor]);
    delete proto[name];
  }
};

beforeAll(async () => {
  hide(HTMLButtonElement.prototype, 'commandForElement');
  hide(HTMLDialogElement.prototype, 'closedBy');
  await import('./dialog.js');
  await loadCss(dialogCss);
});

afterAll(() => removed.forEach(([proto, name, descriptor]) => Object.defineProperty(proto, name, descriptor)));
afterEach(resetDocument);

const render = (args = {}) => {
  document.body.innerHTML = template({ id: 'f', title: 'Fallback', body: 'Body', footer: '', ...args });
  const dialog = document.querySelector('dialog');
  // Stop the browser's own Invoker Commands handling, so only the fallback can act (a browser without them).
  dialog.addEventListener('command', (event) => event.preventDefault());
  return { dialog, trigger: document.querySelector('mg-dialog > button') };
};

const clickAt = (dialog, x, y) =>
  dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));

describe('mg-dialog JS tier (no native Invoker Commands / closedby)', () => {
  it('opens from the trigger', () => {
    const { dialog, trigger } = render();
    trigger.click();
    expect(dialog.open).toBe(true);
    expect(dialog.matches(':modal')).toBe(true);
  });

  it('closes from the close button', () => {
    const { dialog, trigger } = render();
    trigger.click();
    expect(dialog.open).toBe(true);
    dialog.querySelector('[slot="header"] > button').click();
    expect(dialog.open).toBe(false);
  });

  it('ignores a command button that points at something that is not a dialog', () => {
    render();
    document.body.insertAdjacentHTML(
      'beforeend',
      '<div id="x"></div><button id="b" command="show-modal" commandfor="x">x</button>',
    );
    expect(() => document.getElementById('b').click()).not.toThrow();
  });

  it('light-dismisses on a click outside the box when closedby="any"', () => {
    const { dialog, trigger } = render();
    trigger.click();
    expect(dialog.open).toBe(true);
    clickAt(dialog, -5, -5);
    expect(dialog.open).toBe(false);
  });

  it('does not close on a click inside the box', () => {
    const { dialog, trigger } = render();
    trigger.click();
    const box = dialog.getBoundingClientRect();
    clickAt(dialog, box.left + 10, box.top + 10);
    expect(dialog.open).toBe(true);
  });

  it('does not light-dismiss when closedby is not "any"', () => {
    const { dialog, trigger } = render({ closedby: 'none' });
    trigger.click();
    clickAt(dialog, -5, -5);
    expect(dialog.open).toBe(true);
  });
});
