// Confere o site gerado em dist/: SEO básico, JSON-LD, links internos, NAP, llms.txt e sitemap.
// Uso: npm run build && node scripts/check-dist.mjs
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://iasmimesteticista.com.br';
const NAP = {
  nome: 'Iasmim Esteticista',
  endereco: 'R. José Pereira Cansanção, 19 - Salesianos, Juazeiro do Norte - CE, 63050-012, Brasil',
  telefone: '(88) 99989-0590',
};

const erros = [];
const avisos = [];
const erro = (arq, msg) => erros.push(`${arq}: ${msg}`);

function listar(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? listar(p) : [p];
  });
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

const texto = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// Um caminho interno existe em dist/?
function existe(path) {
  const limpo = decodeURIComponent(path.split('#')[0].split('?')[0]);
  if (limpo === '' || limpo === '/') return existsSync(join(DIST, 'index.html'));
  const alvo = join(DIST, limpo);
  if (limpo.endsWith('/')) return existsSync(join(alvo, 'index.html'));
  return existsSync(alvo) && statSync(alvo).isFile();
}

const arquivos = listar(DIST);
const paginas = arquivos.filter((f) => f.endsWith('.html'));
const titulos = new Map();
const descricoes = new Map();
let totalLinks = 0;
let totalLd = 0;

for (const arq of paginas) {
  const rel = '/' + relative(DIST, arq);
  const html = readFileSync(arq, 'utf8');
  const e404 = rel === '/404.html';

  if (!/<html[^>]*\slang="pt-BR"/.test(html)) erro(rel, 'falta lang="pt-BR" no <html>');

  const h1s = html.match(/<h1[\s>]/g) ?? [];
  if (h1s.length !== 1) erro(rel, `tem ${h1s.length} <h1> (esperado 1)`);

  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
  if (!title) erro(rel, 'sem <title>');
  else {
    const t = decode(title);
    if (t.length > 60) erro(rel, `<title> com ${t.length} caracteres (máx. 60): "${t}"`);
    if (titulos.has(t)) erro(rel, `<title> repetido com ${titulos.get(t)}`);
    titulos.set(t, rel);
  }

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc) erro(rel, 'sem meta description');
  else {
    const d = decode(desc);
    if (d.length > 155) erro(rel, `meta description com ${d.length} caracteres (máx. 155)`);
    if (!e404 && !/Juazeiro do Norte/.test(d)) avisos.push(`${rel}: meta description sem "Juazeiro do Norte"`);
    if (descricoes.has(d)) erro(rel, `meta description repetida com ${descricoes.get(d)}`);
    descricoes.set(d, rel);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (e404) {
    if (canonical) erro(rel, '404 não deve ter canonical');
    if (!/<meta name="robots" content="noindex/.test(html)) erro(rel, '404 sem noindex');
  } else if (!canonical) erro(rel, 'sem canonical');
  else {
    const esperado = SITE + (rel === '/index.html' ? '/' : rel.replace(/index\.html$/, ''));
    if (canonical !== esperado) erro(rel, `canonical "${canonical}" diferente de "${esperado}"`);
  }

  for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) {
    if (!html.includes(`property="${prop}"`)) erro(rel, `sem ${prop}`);
  }
  if (!html.includes('name="twitter:card"')) erro(rel, 'sem twitter:card');

  // JSON-LD
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocos.length) erro(rel, 'sem JSON-LD');
  for (const [, json] of blocos) {
    totalLd++;
    try {
      const dados = JSON.parse(json);
      const grafo = dados['@graph'] ?? [dados];
      const tipos = grafo.map((n) => n['@type']).flat();
      if (!tipos.includes('BeautySalon')) erro(rel, 'JSON-LD sem BeautySalon');
      if (!e404 && rel !== '/index.html' && !tipos.includes('BreadcrumbList')) erro(rel, 'JSON-LD sem BreadcrumbList');
      if (rel.startsWith('/servicos/') && rel !== '/servicos/index.html' && !tipos.includes('Service'))
        erro(rel, 'página de serviço sem Service no JSON-LD');
      const temFaqVisivel = /class="faq"/.test(html);
      if (temFaqVisivel && !tipos.includes('FAQPage')) erro(rel, 'FAQ visível sem FAQPage no JSON-LD');
      if (JSON.stringify(dados).includes('aggregateRating')) erro(rel, 'aggregateRating não deve ser usado');
    } catch (e) {
      erro(rel, `JSON-LD inválido: ${e.message}`);
    }
  }

  // NAP idêntico no rodapé
  const rodape = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
  const tRodape = texto(rodape);
  for (const [k, v] of Object.entries(NAP)) if (!tRodape.includes(v)) erro(rel, `rodapé sem NAP (${k}): "${v}"`);

  // CTA do WhatsApp
  if (!/href="https:\/\/wa\.me\/5588999890590\?text=/.test(html)) erro(rel, 'sem link de WhatsApp com mensagem');

  // Links internos
  for (const [, href] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    let path = null;
    if (href.startsWith(SITE)) path = href.slice(SITE.length) || '/';
    else if (href.startsWith('/') && !href.startsWith('//')) path = href;
    else if (href.startsWith('#') || /^(https?:|mailto:|tel:|data:)/.test(href)) continue;
    else {
      erro(rel, `link relativo não suportado: ${href}`);
      continue;
    }
    totalLinks++;
    if (!existe(path)) erro(rel, `link interno quebrado: ${href}`);
    const semHash = path.split('#')[0].split('?')[0];
    if (!/\.[a-z0-9]+$/i.test(semHash) && !semHash.endsWith('/')) erro(rel, `link sem barra final: ${href}`);
  }
  // Âncoras na mesma página
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) {
    if (!html.includes(`id="${id}"`)) erro(rel, `âncora #${id} não existe na página`);
  }
}

// Arquivos obrigatórios
for (const f of ['robots.txt', 'llms.txt', 'llms-full.txt', 'sitemap-index.xml', 'favicon.svg', 'og-iasmim-esteticista.png']) {
  if (!existsSync(join(DIST, f))) erros.push(`falta dist/${f}`);
}

// robots.txt libera os robôs de IA
const robots = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
for (const bot of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended', 'Bingbot', 'Applebot']) {
  if (!new RegExp(`User-agent: ${bot}\\nAllow: /`).test(robots)) erros.push(`robots.txt não libera ${bot}`);
}
if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) erros.push('robots.txt sem Sitemap');

// Sitemap cobre todas as páginas indexáveis
const smFiles = arquivos.filter((f) => /sitemap-\d+\.xml$/.test(f));
const sm = smFiles.map((f) => readFileSync(f, 'utf8')).join('');
const urlsSitemap = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const arq of paginas) {
  const rel = '/' + relative(DIST, arq);
  if (rel === '/404.html') continue;
  const url = SITE + (rel === '/index.html' ? '/' : rel.replace(/index\.html$/, ''));
  if (!urlsSitemap.includes(url)) erros.push(`sitemap sem ${url}`);
}
for (const u of urlsSitemap) if (!existe(u.slice(SITE.length) || '/')) erros.push(`sitemap aponta para página inexistente: ${u}`);

// llms.txt: links válidos
for (const f of ['llms.txt', 'llms-full.txt']) {
  if (!existsSync(join(DIST, f))) continue;
  const t = readFileSync(join(DIST, f), 'utf8');
  if (!t.startsWith('# ')) erros.push(`${f} não começa com "# "`);
  for (const [, u] of t.matchAll(/\]\((https:\/\/iasmimesteticista\.com\.br[^)]*)\)/g)) {
    if (!existe(u.slice(SITE.length) || '/')) erros.push(`${f}: link quebrado ${u}`);
  }
  if (!t.includes(NAP.endereco)) erros.push(`${f} sem endereço completo`);
}

console.log(`Páginas HTML: ${paginas.length}`);
console.log(`Blocos JSON-LD válidos verificados: ${totalLd}`);
console.log(`Links internos verificados: ${totalLinks}`);
console.log(`URLs no sitemap: ${urlsSitemap.length}`);
for (const a of avisos) console.log(`aviso: ${a}`);
if (erros.length) {
  console.error(`\n${erros.length} problema(s):`);
  for (const e of erros) console.error(` - ${e}`);
  process.exit(1);
}
console.log('\nTudo certo.');
