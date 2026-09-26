import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import template from './popover.twig';
import popoverCss from './popover.css?url';
import { loadCss, loadTokens, resetDocument } from '../../tests/support.js';

const base = { id: 'p', trigger_label: 'Details', body: '<p>Panel</p>' };

const render = (args = {}, style = '') => {
  document.body.innerHTML = `<div style="${style}">${template({ ...base, ...args })}</div>`;
  return {
    host: document.querySelector('mg-popover'),
    panel: document.querySelector('[popover]'),
    trigger: document.querySelector('mg-popover > button'),
  };
};

// Wait for the open/close transition, so geometry is measured at rest.
const settle = (panel) => Promise.all(panel.getAnimations().map((animation) => animation.finished));

beforeEach(async () => {
  await page.viewport(900, 700);
});
afterEach(resetDocument);

describe('mg-popover markup', () => {
  it('points the trigger at the panel and makes the panel a popover', () => {
    const { host, panel, trigger } = render();
    expect(trigger.getAttribute('popovertarget')).toBe('p');
    expect(trigger.textContent.trim()).toBe('Details');
    expect(panel.id).toBe('p');
    expect(panel.getAttribute('popover')).toBe('auto');
    expect(panel.getAttribute('slot')).toBe('body');
    expect(host.getAttribute('placement')).toBe('bottom');
  });

  it('passes placement and dismiss through', () => {
    const { host, panel } = render({ placement: 'top', dismiss: 'manual' });
    expect(host.getAttribute('placement')).toBe('top');
    expect(panel.getAttribute('popover')).toBe('manual');
  });

  it('names the panel only when asked to', () => {
    expect(render().panel.hasAttribute('aria-label')).toBe(false);
    const { panel } = render({ label: 'More about this' });
    expect(panel.getAttribute('role')).toBe('group');
    expect(panel.getAttribute('aria-label')).toBe('More about this');
  });

  it('escapes the label so it cannot break out of the attribute', () => {
    const { host, panel } = render({ label: '"><script>x</script>' });
    expect(panel.getAttribute('aria-label')).toBe('"><script>x</script>');
    expect(host.querySelector('script')).toBeNull();
    expect(host.children).toHaveLength(2);
  });

  it('uses the trigger slot instead of the default button when given', () => {
    const { host } = render({ trigger: '<button id="mine" popovertarget="p">Mine</button>' });
    expect(host.querySelectorAll(':scope > button')).toHaveLength(1);
    expect(host.querySelector(':scope > #mine')).not.toBeNull();
  });

  it('leaves an unused body truly empty', () => {
    expect(render({ body: undefined }).panel.innerHTML).toBe('');
  });
});

describe('mg-popover native behavior', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(popoverCss);
  });

  it('is not displayed while closed, and does not shift the trigger', () => {
    const { panel, trigger } = render();
    expect(getComputedStyle(panel).display).toBe('none');
    expect(trigger.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it('opens from the trigger with no JS of its own, into the top layer', async () => {
    const { panel, trigger } = render();
    await userEvent.click(trigger);
    expect(panel.matches(':popover-open')).toBe(true);
    expect(getComputedStyle(panel).display).not.toBe('none');
    expect(trigger.getAttribute('aria-expanded')).toBeNull(); // The browser exposes the state, no attribute needed.
  });

  it('toggles closed from the same trigger', async () => {
    const { panel, trigger } = render();
    await userEvent.click(trigger);
    await userEvent.click(trigger);
    expect(panel.matches(':popover-open')).toBe(false);
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    const { panel, trigger } = render();
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');
    expect(panel.matches(':popover-open')).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('light-dismisses on a click outside when auto', async () => {
    const { panel, trigger } = render({}, 'padding:2rem');
    document.body.insertAdjacentHTML('beforeend', '<p id="elsewhere" style="margin-top:20rem">Elsewhere</p>');
    await userEvent.click(trigger);
    await userEvent.click(document.getElementById('elsewhere'));
    expect(panel.matches(':popover-open')).toBe(false);
  });

  it('stays open on a click outside when manual, and closes from a hide button', async () => {
    const { panel, trigger } = render({
      dismiss: 'manual',
      body: '<button id="done" popovertarget="p" popovertargetaction="hide">Done</button>',
    });
    document.body.insertAdjacentHTML('beforeend', '<p id="elsewhere" style="margin-top:20rem">Elsewhere</p>');
    await userEvent.click(trigger);
    await userEvent.click(document.getElementById('elsewhere'));
    expect(panel.matches(':popover-open')).toBe(true);
    await userEvent.keyboard('{Escape}');
    expect(panel.matches(':popover-open')).toBe(true); // Nothing but the trigger or a hide button closes a manual popover.
    await userEvent.click(document.getElementById('done'));
    expect(panel.matches(':popover-open')).toBe(false);
  });

  it('closes another auto popover when one opens', async () => {
    document.body.innerHTML = `${template({ ...base, id: 'a' })}${template({ ...base, id: 'b' })}`;
    const [a, b] = document.querySelectorAll('[popover]');
    const [ta, tb] = document.querySelectorAll('mg-popover > button');
    await userEvent.click(ta);
    await userEvent.click(tb);
    expect(a.matches(':popover-open')).toBe(false);
    expect(b.matches(':popover-open')).toBe(true);
  });

  it('never exceeds the viewport on a narrow screen', async () => {
    await page.viewport(360, 700);
    const { panel, trigger } = render({ body: '<p style="inline-size:100rem">Wide</p>' });
    await userEvent.click(trigger);
    expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(360 - 32);
  });

  it('scrolls its own content when tall, not the page', async () => {
    const { panel, trigger } = render({ body: '<p style="block-size:3000px">Tall</p>' });
    await userEvent.click(trigger);
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(700 - 32);
  });
});

describe('mg-popover anchor positioning', () => {
  beforeEach(async () => {
    await loadTokens();
    await loadCss(popoverCss);
  });

  const geometry = async (args, style = 'padding:20rem 20rem') => {
    const parts = render(args, style);
    await userEvent.click(parts.trigger);
    await settle(parts.panel);
    return { ...parts, p: parts.panel.getBoundingClientRect(), t: parts.trigger.getBoundingClientRect() };
  };
  const center = (rect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

  it('opens below the trigger, centered on it, with the offset gap', async () => {
    const { p, t } = await geometry({ placement: 'bottom' });
    expect(p.top - t.bottom).toBeCloseTo(8, 0);
    expect(center(p).x).toBeCloseTo(center(t).x, 0);
  });

  it('opens above, and to either side, for the other placements', async () => {
    const top = await geometry({ placement: 'top' });
    expect(top.t.top - top.p.bottom).toBeCloseTo(8, 0);
    expect(center(top.p).x).toBeCloseTo(center(top.t).x, 0);
    resetDocument();
    await loadTokens();
    await loadCss(popoverCss);
    const end = await geometry({ placement: 'end' });
    expect(end.p.left - end.t.right).toBeCloseTo(8, 0);
    expect(center(end.p).y).toBeCloseTo(center(end.t).y, 0);
    resetDocument();
    await loadTokens();
    await loadCss(popoverCss);
    const start = await geometry({ placement: 'start' });
    expect(start.t.left - start.p.right).toBeCloseTo(8, 0);
  });

  it('follows the writing direction for start and end', async () => {
    document.documentElement.dir = 'rtl';
    try {
      const { p, t } = await geometry({ placement: 'end' });
      // In RTL, end is the left-hand side.
      expect(p.right).toBeLessThanOrEqual(t.left);
    } finally {
      document.documentElement.dir = '';
    }
  });

  it('flips to the other side when there is no room', async () => {
    // A trigger at the bottom of the viewport cannot open downward.
    const { p, t } = await geometry(
      { placement: 'bottom', body: '<p style="block-size:8rem">Tall</p>' },
      'padding-top:33rem',
    );
    expect(p.bottom).toBeLessThanOrEqual(t.top);
  });

  it('lets a consumer change the gap with the public custom property', async () => {
    const parts = render({}, 'padding:20rem 20rem;--mg-popover-offset:2rem');
    await userEvent.click(parts.trigger);
    await settle(parts.panel);
    expect(parts.panel.getBoundingClientRect().top - parts.trigger.getBoundingClientRect().bottom).toBeCloseTo(32, 0);
  });
});

describe('mg-popover baseline (popover.css alone, no tokens)', () => {
  it('still looks like a panel from its literal fallbacks', async () => {
    await loadCss(popoverCss);
    const { panel, trigger } = render();
    await userEvent.click(trigger);
    const style = getComputedStyle(panel);
    expect(style.borderTopWidth).toBe('1px');
    expect(style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(style.paddingTop).toBe('16px');
  });
});
