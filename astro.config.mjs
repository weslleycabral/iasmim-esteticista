// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://iasmimesteticista.com.br',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'always' },
  compressHTML: true,
  // Pré-carrega a página do link quando o mouse passa por cima (ou o dedo toca)
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  // Fontes baixadas no build e servidas pelo próprio site (nada de fonts.googleapis.com em produção).
  // Uso: <Font cssVariable="--font-gloock" /> no <head> (já no Base.astro) e var(--font-gloock) no CSS.
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Gloock',
      cssVariable: '--font-gloock',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
      fallbacks: ['Didot', 'Bodoni MT', 'Georgia', 'serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Archivo',
      cssVariable: '--font-archivo',
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      display: 'swap',
      fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
    },
  ],
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'monthly',
      lastmod: new Date(),
    }),
  ],
});
