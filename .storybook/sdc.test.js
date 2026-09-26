import { describe, expect, it } from 'vitest';
import { sdcMeta } from './sdc.js';

const yml =
  'name: Thing\ndescription: A thing.\nprops:\n  type: object\n  properties:\n    size:\n      type: string\n      enum: [md, sm]\n      default: md\n';
const meta = (extra = {}) => sdcMeta({ id: 'thing', yml, template: () => '', ...extra });

describe('sdcMeta', () => {
  it('passes the canvas layout through as a story parameter, next to the component it loads', () => {
    expect(meta({ layout: 'fullscreen' }).parameters).toMatchObject({
      layout: 'fullscreen',
      magoo: { component: 'thing' },
    });
  });

  it('leaves the layout to the preview default when none is given', () => {
    expect(meta().parameters).not.toHaveProperty('layout');
    expect(meta().parameters.magoo.component).toBe('thing');
  });

  it('derives args and controls from the component.yml', () => {
    const { args, argTypes } = meta({ args: { content: 'x' } });
    expect(args).toEqual({ size: 'md', content: 'x' });
    expect(argTypes.size.options).toEqual(['md', 'sm']);
  });
});
