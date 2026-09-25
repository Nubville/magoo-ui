// Every brand in themes/, found by glob. Their CSS is linked in preview-head.html, the attribute picks one.
const brands = Object.keys(import.meta.glob('../themes/*.css')).map((path) => path.match(/([^/]+)\.css$/)[1]);

/** @type {import('@storybook/html-vite').Preview} */
export default {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    // Fail the story tests on axe violations instead of only reporting them.
    a11y: { test: 'error' },
  },
  globalTypes: {
    brand: {
      description: 'Brand (data-mg-theme on <body>)',
      toolbar: { title: 'Brand', icon: 'paintbrush', items: ['default', ...brands], dynamicTitle: true },
    },
    mode: {
      description: 'Color scheme',
      toolbar: { title: 'Mode', icon: 'circlehollow', items: ['auto', 'light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { brand: 'default', mode: 'auto' },
  decorators: [
    // color-scheme drives every light-dark() token, so forcing it on <html> re-themes the whole canvas.
    (story, { globals }) => {
      document.documentElement.style.colorScheme = globals.mode === 'auto' ? '' : globals.mode;
      return story();
    },
    // A brand is one data attribute, exactly as the Drupal theme sets it on <body>.
    (story, { globals }) => {
      if (globals.brand === 'default') delete document.body.dataset.mgTheme;
      else document.body.dataset.mgTheme = globals.brand;
      return story();
    },
    // Each story declares which component CSS it needs via parameters.magoo.component.
    (story, { parameters }) => {
      const name = parameters.magoo?.component;
      const href = `/magoo/components/${name}/${name}.css`;
      if (name && !document.head.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.append(link);
      }
      return story();
    },
  ],
};
