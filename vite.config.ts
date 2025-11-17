import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './example',
  publicDir: false,  // Disable default public dir handling
  server: {
    port: 3000,
    open: '/index.html',
    // Serve models directory as static files
    fs: {
      strict: false  // Allow serving files from outside root
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: './dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'example/index.html')
      }
    }
  }
});
