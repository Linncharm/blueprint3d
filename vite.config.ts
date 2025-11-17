import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './example',
  publicDir: false,
  server: {
    port: 3000,
    open: '/index.html'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'example/index.html')
      }
    }
  }
});
