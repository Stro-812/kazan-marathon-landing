import { defineConfig } from 'astro/config';
export default defineConfig({
  build: { inlineStylesheets: 'always' },
  server: { host: '127.0.0.1', port: 4321 },
});
