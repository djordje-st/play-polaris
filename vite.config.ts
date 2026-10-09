import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/solid-start/plugin/vite'
import solidPlugin from 'vite-plugin-solid'
import { cloudflare } from '@cloudflare/vite-plugin'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({ server: { build: { inlineCss: true } } }),
    solidPlugin({ ssr: true }),
  ],
})
