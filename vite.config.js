import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: el sitio vive bajo /document-center/ en GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './'
});
