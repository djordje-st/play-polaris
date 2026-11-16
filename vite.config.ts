import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import solidPlugin from 'vite-plugin-solid'
import { cloudflare } from '@cloudflare/vite-plugin'
import { slimManifest } from './src/polaris/catalog.ts'
import type { Plugin } from 'vite'

// The catalog reads about a third of each Polaris manifest.
const slimManifests: Plugin = {
  name: 'slim-manifests',
  generateBundle(_, bundle) {
    for (const file of Object.values(bundle)) {
      if (
        file.type === 'asset' &&
        /custom-elements-.*\.json$/.test(file.fileName)
      ) {
        file.source = slimManifest(Buffer.from(file.source).toString())
      }
    }
  },
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            // The builder route's head shares these with the editor. In the
            // entry chunk they would make every lazy editor chunk depend on
            // it, and Vite would then request the entry's stylesheet, which is
            // already inlined.
            {
              name: 'catalog',
              test: /polaris\/catalog\.ts|custom-elements\.json/,
            },
            // Start preloads only a route's direct imports, so a small chunk
            // behind another one costs a round trip before hydration.
            {
              name: 'ui',
              test: /components\/(ui|ThemeMenu|Logo)\.tsx|editor\/names\.ts/,
            },
          ],
        },
      },
    },
  },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({ server: { build: { inlineCss: true } } }),
    solidPlugin({ ssr: true }),
    slimManifests,
  ],
})
