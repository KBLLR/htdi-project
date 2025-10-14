import { defineConfig } from 'vite';
import { resolve } from 'path';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  root: 'src',
  publicDir: resolve(__dirname, 'static'),
  plugins: [glsl()],
  assetsInclude: ['**/*.glsl', '**/*.vs', '**/*.fs', '**/*.vert', '**/*.frag'],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'three/examples': resolve(__dirname, 'node_modules/three/examples'),
      'three/examples/jsm': resolve(__dirname, 'node_modules/three/examples/jsm')
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true
  }
});
