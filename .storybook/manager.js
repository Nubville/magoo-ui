import { addons } from 'storybook/manager-api';
import { create } from 'storybook/theming/create';

// The halo variant reads on a light or a dark sidebar: the art has a black outline, which would vanish on dark.
addons.setConfig({
  theme: create({
    base: 'light',
    brandTitle: 'Magoo UI',
    brandUrl: 'https://github.com/Nubville/magoo-ui',
    brandImage: '/logo-on-dark.svg',
    brandTarget: '_blank',
  }),
});
