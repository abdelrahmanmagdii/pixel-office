import { defineConfig } from 'vite';

// Project Pages works with relative base './'.
// Override: BASE_PATH=/repo-name/ npm run build
const base = process.env.BASE_PATH || './';

export default defineConfig({
  base,
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
