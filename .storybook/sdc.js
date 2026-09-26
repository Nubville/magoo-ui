import { load } from 'js-yaml';

/**
 * Build the argTypes, default args and render function of a story meta from an SDC's `*.component.yml`, so props, defaults and docs can't drift from what Drupal reads.
 *
 * @param {object} options
 * The story file keeps `title` and `tags` as literals, because Storybook's indexer reads them statically:
 *
 *   export default { title: 'Components/Badge', tags: ['autodocs'], ...sdcMeta({ ... }) };
 *
 * @param {string} options.id Directory and file basename of the component, e.g. "badge".
 * @param {string} options.yml Raw contents of the component.yml (import with ?raw).
 * @param {Function} options.template The compiled Twig template.
 * @param {object} [options.args] Story args for the slots, e.g. { content: 'Draft' }.
 * @param {'centered'|'padded'|'fullscreen'} [options.layout] Canvas layout. Pass it here, not as a sibling `parameters` key in the
 *   story file: the `parameters` returned below would overwrite it (that is how the grid stories ended up shrink-wrapped).
 */
export function sdcMeta({ id, yml, template, args = {}, layout }) {
  const component = load(yml);
  const argTypes = {};
  const defaults = {};

  for (const [key, prop] of Object.entries(component.props?.properties ?? {})) {
    argTypes[key] = {
      description: prop.description ?? prop.title,
      control: { type: prop.enum ? 'select' : prop.type === 'boolean' ? 'boolean' : 'text' },
      options: prop.enum,
      table: { category: 'props' },
    };
    if (prop.default !== undefined) defaults[key] = prop.default;
  }
  // Drupal's native SDC variants. The first one listed is the default, matching the `variant|default(...)` in the Twig.
  const variants = Object.keys(component.variants ?? {});
  if (variants.length) {
    argTypes.variant = {
      description: 'Component variant (the SDC `variants` key).',
      control: { type: 'select' },
      options: variants,
      table: { category: 'variants' },
    };
    defaults.variant = variants[0];
  }
  for (const [key, slot] of Object.entries(component.slots ?? {})) {
    argTypes[key] = {
      description: slot.description ?? slot.title,
      control: { type: 'text' },
      table: { category: 'slots' },
    };
  }

  return {
    argTypes,
    args: { ...defaults, ...args },
    parameters: {
      ...(layout && { layout }),
      magoo: { component: id },
      docs: { description: { component: `${component.description}\n\nDrupal: \`{% include 'magoo:${id}' %}\`` } },
    },
    render: (storyArgs) => template(storyArgs),
  };
}
