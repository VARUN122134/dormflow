import { defineConfig } from 'vite'

export default defineConfig({
  base: '/dormflow/app/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
