import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: '/simulador-fisica-final/',
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {

          if (/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.name)) {
            return 'webfonts/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // o "modern"
        silenceDeprecations: [
          // 'mixed-decls',
          'color-functions',
          'global-builtin',
          'import',
          // 'if-function',
        ]
      },
    },
  },
});
