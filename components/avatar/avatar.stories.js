import { expect } from 'storybook/test';
import template from './avatar.twig';
import yml from './avatar.component.yml?raw';
import { sdcMeta } from '../../.storybook/sdc.js';

// The optional JS tier: reveals the initials when a picture fails to load.
import './avatar.js';

// A drawn stand-in for a photo, so stories need no network.
const photo = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#f59e0b"/><circle cx="40" cy="32" r="14" fill="#fef3c7"/><path d="M12 80c2-22 14-30 28-30s26 8 28 30z" fill="#fef3c7"/></svg>',
)}`;

export default {
  title: 'Components/Avatar',
  tags: ['autodocs'],
  ...sdcMeta({ id: 'avatar', yml, template, args: { initials: 'AL', alt: 'Ada Lovelace' } }),
};

export const Default = {};

export const WithPicture = { args: { src: photo } };

export const Sizes = {
  render: () =>
    `<div style="display:flex;align-items:center;gap:var(--mg-space-gap-md)">${['xs', 'sm', 'md', 'lg', 'xl']
      .map((size) => template({ size, initials: size, alt: `Size ${size}` }))
      .join('')}</div>`,
};

export const Shapes = {
  render: () =>
    `<div style="display:flex;align-items:center;gap:var(--mg-space-gap-md)">${['circle', 'rounded', 'square']
      .flatMap((variant) => [
        template({ variant, size: 'lg', initials: 'AB', alt: `${variant} initials` }),
        template({ variant, size: 'lg', src: photo, alt: `${variant} picture` }),
      ])
      .join('')}</div>`,
};

// The name is already visible next to the avatar, so the avatar itself stays silent (no alt).
export const BesideAName = {
  render: () =>
    `<div style="display:flex;align-items:center;gap:var(--mg-space-gap-md)">${template({ initials: 'GH', src: photo })}<div><strong>Grace Hopper</strong><br>Rear Admiral</div></div>`,
};

// A picture that fails to load: avatar.js hides it, so the initials show.
export const BrokenPicture = {
  args: { src: '/does-not-exist.png', initials: 'AL' },
  play: async ({ canvasElement }) => {
    const image = canvasElement.querySelector('mg-avatar > img');
    await new Promise((resolve) =>
      image.hidden ? resolve() : image.addEventListener('error', resolve, { once: true }),
    );
    await expect(image.hidden).toBe(true);
  },
};
