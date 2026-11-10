// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const SITE = 'https://iasmimesteticista.com.br';

// lastmod do sitemap = campo "atualizado" do frontmatter de cada .md (a mesma data do JSON-LD dateModified
// e do "Página revisada em…" visível), e não a data do build. /servicos/ = a revisão mais recente dos serviços.
function datasDasPaginas() {
  /** @param {string} arq */
  const atualizado = (arq) => readFileSync(arq, 'utf8').match(/^atualizado:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
  /** @param {string} dir @returns {string[]} */
  const listar = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : []));
  const datas = new Map();
  const base = new URL('./src/content/', import.meta.url).pathname;
  const servicos = listar(join(base, 'servicos'));
  for (const arq of servicos) datas.set(`${SITE}/servicos/${relative(join(base, 'servicos'), arq).replace(/\.md$/, '')}/`, atualizado(arq));
  datas.set(`${SITE}/servicos/`, servicos.map(atualizado).sort().at(-1));
  const rotas = { inicio: '/', sobre: '/sobre/', contato: '/contato/', 'perguntas-frequentes': '/perguntas-frequentes/', depoimentos: '/depoimentos/', 'anna-pegova': '/produtos/anna-pegova/' };
  for (const [id, rota] of Object.entries(rotas)) datas.set(SITE + rota, atualizado(join(base, 'paginas', `${id}.md`)));
  return datas;
}
const lastmod = datasDasPaginas();

// Páginas fora do sitemap (noindex): 404, /bio/ (página de links do Instagram, duplica a navegação) e /privacidade/ (página legal)
const FORA_DO_SITEMAP = ['/404', '/bio/', '/privacidade/'];

export default defineConfig({
  site: SITE,
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
      filter: (page) => !FORA_DO_SITEMAP.some((p) => new URL(page).pathname.startsWith(p)),
      // changefreq e priority ficam de fora: o Google ignora os dois (só usa lastmod, se for confiável)
      serialize: (item) => ({ ...item, lastmod: lastmod.get(item.url) }),
    }),
  ],
});
