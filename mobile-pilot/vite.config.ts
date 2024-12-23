import path from 'node:path'
import { defineConfig } from 'npm:vite@^6.0.1'
import deno from '@deno/vite-plugin'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [deno(), react()],
  base: './',
  server: {
    port: 3000,
  },
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
})
