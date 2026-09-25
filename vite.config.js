import { join } from 'node:path';
import { defineConfig } from 'vite';
import twig from 'vite-plugin-twig-drupal';

// Only used by Vitest and Storybook. Nothing here is needed to consume the components.
export default defineConfig({
  // Pre-bundle what the Twig plugin's generated code imports, so a cold Vitest run doesn't reload mid-test.
  optimizeDeps: { include: ['twig', 'drupal-attribute', 'drupal-twig-extensions/twig'] },
  plugins: [twig({ namespaces: { magoo: join(import.meta.dirname, 'components') } })],
});
