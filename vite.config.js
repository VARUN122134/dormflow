import { defineConfig } from 'vite'

export default defineConfig({
  base: '/dormflow/app/',
  build: {
    outDir: 'docs/app',
    assetsDir: 'assets',
  },
})
