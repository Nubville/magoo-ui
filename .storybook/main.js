import { join } from 'node:path';
import twig from 'vite-plugin-twig-drupal';

const root = join(import.meta.dirname, '..');

/** @type {import('@storybook/html-vite').StorybookConfig} */
export default {
  framework: '@storybook/html-vite',
  stories: ['../tokens/**/*.stories.js', '../components/**/*.stories.js'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-vitest'],
  // Serve the shipped CSS as-is so stories test the same files Drupal serves (never through Vite's CSS pipeline).
  staticDirs: [
    { from: '../tokens', to: '/magoo/tokens' },
    { from: '../components', to: '/magoo/components' },
    { from: '../themes', to: '/magoo/themes' },
  ],
  viteFinal: (config) => {
    config.plugins = [...(config.plugins ?? []), twig({ namespaces: { magoo: join(root, 'components') } })];
    return config;
  },
};
