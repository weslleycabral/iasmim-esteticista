// Versão .md de cada página indexável, para assistentes de IA (proposta do llms.txt: mesmo endereço + .md).
// /servicos/botox/ → /servicos/botox.md; a inicial → /index.md. Conteúdo em src/lib/llms.ts (paginasMd).
// Cabeçalhos (text/markdown, noindex) em public/_headers; o Worker também entrega o .md a quem pede
// "Accept: text/markdown" no endereço normal da página.
import type { APIRoute, GetStaticPaths } from 'astro';
import { paginasMd, mdPath } from '../lib/llms';

export const getStaticPaths = (async () =>
  (await paginasMd()).map(({ path, md }) => ({ params: { pagina: mdPath(path).slice(1, -3) }, props: { md } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.md as string, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
