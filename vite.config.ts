import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base под GitHub Pages: https://georgy-itech.github.io/sable-landing/
export default defineConfig({
  base: '/sable-landing/',
  plugins: [react()],
});
