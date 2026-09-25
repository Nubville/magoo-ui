import { join } from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import viteConfig from './vite.config.js';

// A factory, because Vitest mutates the object it is given and the two projects must not share one.
const browser = () => ({ enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] });

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: { name: 'components', include: ['components/**/*.test.js', 'tokens/**/*.test.js'], browser: browser() },
          // Serve the repo root so tests can <link> the real CSS files.
          server: { fs: { allow: [import.meta.dirname] } },
        },
        {
          extends: true,
          plugins: [storybookTest({ configDir: join(import.meta.dirname, '.storybook') })],
          test: { name: 'stories', browser: browser() },
        },
      ],
    },
  }),
);
