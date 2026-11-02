// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://iasmimesteticista.com.br',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'monthly',
      lastmod: new Date(),
    }),
  ],
});
