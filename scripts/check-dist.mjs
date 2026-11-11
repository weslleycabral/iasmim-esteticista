// Confere o site gerado em dist/: SEO técnico, JSON-LD, links internos, NAP, imagens, sitemap, robots.txt, llms.txt
// e a marcação das métricas (GA4 e data-evento/data-posicao nos links de contato).
// Uso: npm run build && node scripts/check-dist.mjs [pasta]   (pasta padrão: dist/)
// Qualquer erro faz a publicação parar (npm run deploy roda esta conferência antes do wrangler deploy).
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const DIST = process.argv[2] ? resolve(process.argv[2]) + '/' : new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://iasmimesteticista.com.br';
const RAIZ = new URL('../', import.meta.url).pathname;
const negocio = JSON.parse(readFileSync(new URL('../src/data/negocio.json', import.meta.url), 'utf8'));
const e = negocio.endereco;
// NAP idêntico ao do Google: sai do negocio.json, nos mesmos formatos que o site usa
const NAP = {
  nome: negocio.nome,
  endereco: e.linha, // formato do Google (llms.txt, JSON-LD)
  telefone: negocio.telefone,
};
// rodapé: formato editorial da linha 3C (mesmo texto de enderecoTexto em src/lib/site.ts)
const NAP_RODAPE = { ...NAP, endereco: `${e.rua} — ${e.bairro}, ${e.cidade} (${e.uf}), ${e.cep}` };

// Robôs de busca e de IA que o robots.txt precisa liberar explicitamente
const ROBOS = [
  'Googlebot', 'Bingbot', 'Applebot', 'Google-Extended', 'Applebot-Extended',
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
];
// Imagem de compartilhamento: JPEG (o WhatsApp, a Meta e o LinkedIn não documentam WebP em og:image)
const OG = { arquivo: 'og-iasmim-esteticista.jpg', largura: 1200, altura: 630, maxBytes: 300 * 1024 };
// Únicas imagens fora de WebP/AVIF/SVG/ICO permitidas no site (as do Astro saem em AVIF/WebP)
const RASTER_PERMITIDOS = new Set([OG.arquivo, 'apple-touch-icon.png']);
// Promessas proibidas na copy (depoimentos em <blockquote> ficam de fora: são citações literais)
const PROIBIDAS = [
  /\b(a|o)s? melhor(es)? (esteticista|clínica|profissional|tratamento|limpeza|peeling|resultado|do Cariri|da cidade)/i,
  /garanti(do|da|dos|das|mos|r)\b/i,
  /sem dor\b/i,
  /não dói/i,
  /indolor/i,
  /revolucion/i,
  /milagr/i,
  /100% (seguro|natural|eficaz|garantido)/i,
  /Dysport/i,
];

// Métricas (METRICAS.md 1.3): o evento esperado em cada tipo de link de contato (o listener de src/scripts/site.ts lê data-evento)
const EVENTOS = [
  [/^https:\/\/wa\.me\//, 'whatsapp'],
  [/^tel:/, 'ligar'],
  [/^https:\/\/www\.google\.com\/maps\/dir\//, 'rota'],
  [/^https:\/\/(www\.)?instagram\.com\//, 'instagram'],
  [/^https:\/\/(share\.google\/|g\.page\/|maps\.google\.com\/|www\.google\.com\/maps\/(reviews|place)\/)/, 'google-perfil'],
];
const POSICAO = /^[a-z][a-z0-9-]*$/;
let totalEventos = 0;

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
// texto como um robô que não roda CSS nem JS lê (sem <script>/<style>)
const textoCru = (html) => texto(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, ' '));

// Um caminho interno existe em dist/?
function existe(path) {
  const limpo = decodeURIComponent(path.split('#')[0].split('?')[0]);
  if (limpo === '' || limpo === '/') return existsSync(join(DIST, 'index.html'));
  const alvo = join(DIST, limpo);
  if (limpo.endsWith('/')) return existsSync(join(alvo, 'index.html'));
  return existsSync(alvo) && statSync(alvo).isFile();
}

const urlDe = (rel) => SITE + (rel === '/index.html' ? '/' : rel.replace(/index\.html$/, ''));

// Preços publicáveis = os do campo "preco.valor" dos .md (mais a avaliação, de negocio.json)
const mds = listar(join(RAIZ, 'src/content')).filter((f) => f.endsWith('.md'));
const PRECOS = new Set([Number(negocio.avaliacao.valor.replace(/\D/g, ''))]);
for (const f of mds) {
  const fm = readFileSync(f, 'utf8').split(/^---$/m)[1] ?? '';
  const bloco = fm.match(/^preco:\n((?:[ \t]+.*\n?)+)/m)?.[1];
  const v = bloco?.match(/valor:\s*([\d.]+)/)?.[1];
  if (v) PRECOS.add(Number(v));
}
const reaisParaNumero = (s) => Number(s.replace(/\./g, '').replace(',', '.'));

// Percorre o JSON-LD: nós definidos (@id + outros campos) e referências ({ "@id" } sozinho)
function varrerLd(no, definidos, refs, tipos) {
  if (Array.isArray(no)) return no.forEach((n) => varrerLd(n, definidos, refs, tipos));
  if (!no || typeof no !== 'object') return;
  const chaves = Object.keys(no);
  if (no['@id'] && chaves.length === 1) refs.add(no['@id']);
  else if (no['@id']) definidos.set(no['@id'], no);
  if (no['@type']) [no['@type']].flat().forEach((t) => tipos.push({ t, no }));
  for (const k of chaves) if (k !== '@id') varrerLd(no[k], definidos, refs, tipos);
}

const arquivos = listar(DIST);
const paginas = arquivos.filter((f) => f.endsWith('.html'));
const titulos = new Map();
const descricoes = new Map();
const noindex = new Set();
const dataPagina = new Map(); // url → dateModified
let totalLinks = 0;
let totalLd = 0;

for (const arq of paginas) {
  const rel = '/' + relative(DIST, arq);
  const html = readFileSync(arq, 'utf8');
  const e404 = rel === '/404.html';
  const url = urlDe(rel);

  if (!/<html[^>]*\slang="pt-BR"/.test(html)) erro(rel, 'falta lang="pt-BR" no <html>');
  if (!html.trimEnd().endsWith('</html>')) erro(rel, 'há conteúdo depois de </html> (ex.: <script> fora do <Base>)');
  if (!/<meta charset="utf-8"/i.test(html)) erro(rel, 'sem <meta charset="utf-8">');
  if (!/<meta name="viewport" content="width=device-width, initial-scale=1"/.test(html)) erro(rel, 'sem meta viewport');
  if (!/<meta name="theme-color" content="#[0-9a-f]{6}"/i.test(html)) erro(rel, 'sem meta theme-color');
  for (const [rel_, href] of [['icon', '/favicon.ico'], ['icon', '/favicon.svg'], ['apple-touch-icon', '/apple-touch-icon.png']]) {
    if (!new RegExp(`<link rel="${rel_}" href="${href}"`).test(html)) erro(rel, `sem <link rel="${rel_}" href="${href}">`);
  }

  const h1s = html.match(/<h1[\s>]/g) ?? [];
  if (h1s.length !== 1) erro(rel, `tem ${h1s.length} <h1> (esperado 1)`);

  // robots: 404 e páginas noindex ficam fora do sitemap e sem canonical
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1];
  if (!robots) erro(rel, 'sem meta robots');
  const ehNoindex = /noindex/.test(robots ?? '');
  if (ehNoindex) noindex.add(url);
  else if (!/^index, follow/.test(robots ?? '')) erro(rel, `meta robots inesperado: "${robots}"`);

  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
  if (!title) erro(rel, 'sem <title>');
  else {
    const t = decode(title);
    if (t.length > 60) erro(rel, `<title> com ${t.length} caracteres (máx. 60): "${t}"`);
    if (!ehNoindex && !/Juazeiro do Norte/.test(t)) erro(rel, `<title> sem "Juazeiro do Norte": "${t}"`);
    if (titulos.has(t)) erro(rel, `<title> repetido com ${titulos.get(t)}`);
    titulos.set(t, rel);
  }

  const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
  if (!desc) erro(rel, 'sem meta description');
  else {
    const d = decode(desc);
    if (d.length > 155) erro(rel, `meta description com ${d.length} caracteres (máx. 155)`);
    if (!e404 && !/Juazeiro do Norte/.test(d)) {
      if (ehNoindex) avisos.push(`${rel}: meta description sem "Juazeiro do Norte"`);
      else erro(rel, 'meta description sem "Juazeiro do Norte"');
    }
    if (descricoes.has(d)) erro(rel, `meta description repetida com ${descricoes.get(d)}`);
    descricoes.set(d, rel);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (e404) {
    if (canonical) erro(rel, '404 não deve ter canonical');
    if (!/<meta name="robots" content="noindex/.test(html)) erro(rel, '404 sem noindex');
  } else if (ehNoindex) {
    if (canonical) erro(rel, 'página noindex não deve ter canonical (sinais contraditórios)');
  } else if (!canonical) erro(rel, 'sem canonical');
  else {
    if (canonical !== url) erro(rel, `canonical "${canonical}" diferente de "${url}"`);
    if (!/^https:\/\/iasmimesteticista\.com\.br\/(.*\/)?$/.test(canonical)) erro(rel, `canonical sem https ou sem barra final: ${canonical}`);
  }

  // Open Graph e Twitter/X
  for (const prop of ['og:type', 'og:locale', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt']) {
    if (!html.includes(`property="${prop}"`)) erro(rel, `sem ${prop}`);
  }
  for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
    if (!html.includes(`name="${n}"`)) erro(rel, `sem ${n}`);
  }
  const ogImg = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1];
  if (ogImg && ogImg !== `${SITE}/${OG.arquivo}`) erro(rel, `og:image deveria ser ${SITE}/${OG.arquivo} (é ${ogImg})`);
  if (!/<meta property="og:image:width" content="1200"/.test(html) || !/<meta property="og:image:height" content="630"/.test(html))
    erro(rel, 'og:image:width/height diferentes de 1200×630');
  const ogUrl = html.match(/<meta property="og:url" content="([^"]*)"/)?.[1];
  if (!e404 && ogUrl !== url) erro(rel, `og:url "${ogUrl}" diferente do endereço da página`);

  // Texto cru (sem CSS/JS): o odômetro não pode vazar as faixas de algarismos ("2290123456789…")
  const cru = textoCru(html);
  const colado = decode(html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, '');
  if (/0123456789/.test(colado)) erro(rel, 'texto cru tem a sequência "0123456789" (faixas do odômetro no HTML; devem vir só do CSS)');

  // Copy: promessas proibidas fora dos depoimentos (<blockquote>)
  const semCitacoes = textoCru(html.replace(/<blockquote\b[\s\S]*?<\/blockquote>/g, ' '));
  for (const re of PROIBIDAS) {
    const m = semCitacoes.match(re);
    if (m) erro(rel, `promessa proibida na copy: "${m[0]}"`);
  }
  // Preços visíveis: só os publicáveis
  for (const [, v] of cru.matchAll(/R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g)) {
    if (!PRECOS.has(reaisParaNumero(v))) erro(rel, `preço não publicável na página: R$ ${v}`);
  }

  // Migalha visível (Migalhas.astro) e itens do FAQ visível (Faq.astro / <details>)
  const nav = html.match(/<nav aria-label="Você está em">([\s\S]*?)<\/nav>/)?.[1];
  const migalhaVisivel = nav
    ? [...nav.matchAll(/<li(?![^>]*class="extra")[^>]*>([\s\S]*?)<\/li>/g)].map((m) => ({
        nome: texto(m[1].replace(/<span class="sep"[^>]*>[\s\S]*?<\/span>/g, '')),
        href: m[1].match(/href="([^"]+)"/)?.[1] ?? null,
      }))
    : [];
  const faqVisivel = [
    ...html.matchAll(/<details\b[^>]*>\s*<summary\b[^>]*>((?:(?!<\/summary>)[\s\S])*)<\/summary>\s*<p\b[^>]*>([\s\S]*?)<\/p>\s*<\/details>/g),
  ].map((m) => `${texto(m[1])}\n${texto(m[2])}`);

  // JSON-LD
  const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocos.length) erro(rel, 'sem JSON-LD');
  if (blocos.length > 1) erro(rel, `${blocos.length} blocos JSON-LD (esperado 1 @graph)`);
  for (const [, json] of blocos) {
    totalLd++;
    try {
      const dados = JSON.parse(json);
      const grafo = dados['@graph'] ?? [dados];
      const tipos = grafo.map((n) => n['@type']).flat();
      if (!tipos.includes('BeautySalon')) erro(rel, 'JSON-LD sem BeautySalon');
      if (rel.startsWith('/servicos/') && rel !== '/servicos/index.html' && !tipos.includes('Service'))
        erro(rel, 'página de serviço sem Service no JSON-LD');
      const temFaqVisivel = /class="faq"/.test(html);
      if (temFaqVisivel && !tipos.includes('FAQPage')) erro(rel, 'FAQ visível sem FAQPage no JSON-LD');
      const txt = JSON.stringify(dados);
      if (txt.includes('aggregateRating')) erro(rel, 'aggregateRating não deve ser usado');
      if (/"@type":"(Review|AggregateRating)"/.test(txt)) erro(rel, 'Review/AggregateRating não devem ser usados (avaliações da própria empresa)');

      // grafo conectado: toda referência {"@id"} aponta para um nó definido na página
      const definidos = new Map();
      const refs = new Set();
      const todos = [];
      varrerLd(grafo, definidos, refs, todos);
      for (const r of refs) if (!definidos.has(r)) erro(rel, `JSON-LD: referência a @id inexistente: ${r}`);
      for (const [id] of definidos) if (!id.startsWith(SITE + '/')) erro(rel, `JSON-LD: @id fora do domínio: ${id}`);

      // Product sem offers/review é inválido no Google; preços só os publicáveis
      for (const { t, no } of todos) {
        if (t === 'Product' && !no.offers) erro(rel, 'JSON-LD: Product sem offers (inválido no Google)');
        for (const k of ['price', 'minPrice']) {
          if (no[k] !== undefined && !PRECOS.has(Number(no[k]))) erro(rel, `JSON-LD: ${k} ${no[k]} não está entre os preços publicados nos .md`);
        }
      }

      // Negócio local: campos do Google e NAP
      const loja = grafo.find((n) => n['@type'] === 'BeautySalon');
      if (loja) {
        for (const k of ['name', 'url', 'telephone', 'address', 'geo', 'openingHoursSpecification', 'priceRange', 'image', 'logo', 'hasMap', 'sameAs', 'areaServed', 'paymentAccepted', 'founder'])
          if (!loja[k]) erro(rel, `BeautySalon sem ${k}`);
        if (loja.name !== NAP.nome) erro(rel, `BeautySalon.name "${loja.name}" diferente de "${NAP.nome}"`);
        if (loja.telephone !== negocio.telefoneE164) erro(rel, 'BeautySalon.telephone diferente de negocio.telefoneE164');
        const a = loja.address ?? {};
        if (a.streetAddress !== `${e.rua} - ${e.bairro}` || a.addressLocality !== e.cidade || a.postalCode !== e.cep || a.addressRegion !== e.uf)
          erro(rel, 'BeautySalon.address diferente do NAP de negocio.json');
        const casas = (n) => String(n).split('.')[1]?.length ?? 0;
        if (casas(loja.geo?.latitude) < 5 || casas(loja.geo?.longitude) < 5) erro(rel, 'geo com menos de 5 casas decimais');
        for (const s of [negocio.instagram, negocio.googleMaps]) if (!loja.sameAs?.includes(s)) erro(rel, `BeautySalon.sameAs sem ${s}`);
        if ((loja.areaServed ?? []).length !== negocio.areaAtendida.length) erro(rel, 'areaServed diferente de negocio.areaAtendida');
      }
      const pessoa = grafo.find((n) => n['@type'] === 'Person');
      if (!pessoa?.hasCredential?.length || !pessoa?.knowsAbout?.length) erro(rel, 'Person sem hasCredential/knowsAbout');

      // WebPage: data de revisão (igual ao sitemap e visível na página)
      const pagina = grafo.find((n) => n['@id'] === `${url}#webpage`);
      if (!pagina) { if (!e404) erro(rel, 'JSON-LD sem o nó WebPage da página (#webpage)'); }
      else if (!e404 && !ehNoindex) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(pagina.dateModified ?? '')) erro(rel, 'WebPage sem dateModified (campo "atualizado" do .md)');
        else {
          dataPagina.set(url, pagina.dateModified);
          if (!html.includes(`<time datetime="${pagina.dateModified}"`)) erro(rel, `data de atualização ${pagina.dateModified} não aparece na página (<time>)`);
        }
      }

      // FAQPage = FAQ visível, palavra por palavra (nos dois sentidos)
      const faq = grafo.find((n) => n['@type'] === 'FAQPage');
      if (faq) {
        const ld = faq.mainEntity.map((q) => `${q.name}\n${q.acceptedAnswer.text}`);
        const vis = new Set(faqVisivel);
        for (const q of ld) if (!vis.has(q)) erro(rel, `FAQPage com pergunta/resposta que não está igual na página: "${q.split('\n')[0]}"`);
        const ldSet = new Set(ld);
        for (const q of faqVisivel) if (!ldSet.has(q)) erro(rel, `pergunta visível fora do FAQPage: "${q.split('\n')[0]}"`);
      }

      // BreadcrumbList = migalha visível (mesmos nomes e endereços); sem migalha visível, sem BreadcrumbList
      const bc = grafo.find((n) => n['@type'] === 'BreadcrumbList');
      if (rel.startsWith('/servicos/') && !migalhaVisivel.length) erro(rel, 'página de serviço sem migalha visível');
      if (migalhaVisivel.length && !bc) erro(rel, 'migalha visível sem BreadcrumbList no JSON-LD');
      if (!migalhaVisivel.length && bc) erro(rel, 'BreadcrumbList no JSON-LD sem migalha visível na página');
      if (bc && migalhaVisivel.length) {
        const ldNomes = bc.itemListElement.map((i) => i.name);
        const visNomes = migalhaVisivel.map((m) => m.nome);
        if (JSON.stringify(ldNomes) !== JSON.stringify(visNomes))
          erro(rel, `BreadcrumbList (${ldNomes.join(' › ')}) diferente da migalha visível (${visNomes.join(' › ')})`);
        bc.itemListElement.forEach((i, k) => {
          const href = migalhaVisivel[k]?.href;
          if (href && SITE + href !== i.item) erro(rel, `BreadcrumbList item ${k + 1} aponta para ${i.item}, a migalha para ${href}`);
        });
        if (bc.itemListElement.at(-1)?.item !== url) erro(rel, 'último item do BreadcrumbList não é a própria página');
      }
    } catch (e) {
      erro(rel, `JSON-LD inválido: ${e.message}`);
    }
  }

  // NAP idêntico no rodapé
  const rodape = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
  const tRodape = texto(rodape);
  for (const [k, v] of Object.entries(NAP_RODAPE)) if (!tRodape.includes(v)) erro(rel, `rodapé sem NAP (${k}): "${v}"`);

  // CTA do WhatsApp
  if (!/href="https:\/\/wa\.me\/5588999890590\?text=/.test(html)) erro(rel, 'sem link de WhatsApp com mensagem');

  // Métricas: GA4 uma vez (G-15X2KXBTNB); todo link de contato com data-evento certo e data-posicao
  const gas = html.split("var id='G-15X2KXBTNB'").length - 1;
  if (gas !== 1) erro(rel, `tag do GA4 ${gas} vezes (esperado 1)`);
  if (!html.includes("s.src='/fx9/?id='")) erro(rel, 'GA4 fora do Google tag gateway (esperado /fx9/ no próprio domínio)');
  if (!html.includes("window['ga-disable-'+id]=true")) erro(rel, 'GA4 sem ga-disable na recusa (a tag injetada pela Cloudflare enviaria mesmo assim)');
  if (/umami(?!\.disabled)/i.test(html)) erro(rel, 'resto do Umami no HTML (removido em 2026-11-11; só a marca antiga umami.disabled fica)');
  for (const [tag] of html.matchAll(/<a\b[^>]*>/g)) {
    const href = decode(tag.match(/\shref="([^"]*)"/)?.[1] ?? '');
    const esperado = EVENTOS.find(([re]) => re.test(href))?.[1];
    if (!esperado) continue;
    totalEventos++;
    const ev = tag.match(/\sdata-evento="([^"]*)"/)?.[1];
    const pos = tag.match(/\sdata-posicao="([^"]*)"/)?.[1];
    if (ev !== esperado) erro(rel, `link ${href.slice(0, 40)}… com data-evento="${ev ?? ''}" (esperado "${esperado}")`);
    if (!pos || !POSICAO.test(pos)) erro(rel, `link ${href.slice(0, 40)}… sem data-posicao válido`);
  }

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
for (const f of ['robots.txt', 'llms.txt', 'llms-full.txt', 'sitemap-index.xml', 'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'logo-iasmim-esteticista.webp', OG.arquivo]) {
  if (!existsSync(join(DIST, f))) erros.push(`falta dist/${f}`);
}

// Imagem OG: JPEG 1200×630, leve (WhatsApp)
if (existsSync(join(DIST, OG.arquivo))) {
  const b = readFileSync(join(DIST, OG.arquivo));
  if (b[0] !== 0xff || b[1] !== 0xd8) erros.push(`${OG.arquivo} não é JPEG`);
  if (b.length > OG.maxBytes) erros.push(`${OG.arquivo} com ${Math.round(b.length / 1024)} KB (máx. ${OG.maxBytes / 1024} KB, por causa do WhatsApp)`);
  let dims = null;
  for (let i = 2; i < b.length - 9; ) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) { dims = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; break; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  if (!dims || dims[0] !== OG.largura || dims[1] !== OG.altura) erros.push(`${OG.arquivo} com ${dims?.join('×')} (esperado ${OG.largura}×${OG.altura})`);
}

// Formatos de imagem: tudo em WebP/AVIF/SVG, menos as exceções documentadas
for (const f of arquivos) {
  if (/\.(png|jpe?g|gif|bmp|tiff?)$/i.test(f) && !RASTER_PERMITIDOS.has(relative(DIST, f)))
    erros.push(`imagem fora de WebP/AVIF: dist/${relative(DIST, f)}`);
}

// robots.txt libera os robôs de busca e de IA, sem bloquear nada
const robots = existsSync(join(DIST, 'robots.txt')) ? readFileSync(join(DIST, 'robots.txt'), 'utf8') : '';
for (const bot of ROBOS) {
  if (!new RegExp(`User-agent: ${bot}\\nAllow: /`).test(robots)) erros.push(`robots.txt não libera ${bot}`);
}
if (!/User-agent: \*\nAllow: \//.test(robots)) erros.push('robots.txt sem "User-agent: *" liberado');
if (/^Disallow:\s*\S/m.test(robots)) erros.push('robots.txt tem Disallow (use noindex na página em vez de bloquear)');
if (!robots.includes(`Sitemap: ${SITE}/sitemap-index.xml`)) erros.push('robots.txt sem Sitemap');

// Sitemap: todas as páginas indexáveis, nenhuma noindex, lastmod = dateModified da página
const smFiles = arquivos.filter((f) => /sitemap-\d+\.xml$/.test(f));
const sm = smFiles.map((f) => readFileSync(f, 'utf8')).join('');
const entradas = [...sm.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
  loc: m[1].match(/<loc>([^<]+)<\/loc>/)?.[1],
  lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
}));
const urlsSitemap = entradas.map((x) => x.loc);
for (const arq of paginas) {
  const rel = '/' + relative(DIST, arq);
  if (rel === '/404.html') continue;
  const url = urlDe(rel);
  if (noindex.has(url)) {
    if (urlsSitemap.includes(url)) erros.push(`sitemap inclui página noindex: ${url}`);
  } else if (!urlsSitemap.includes(url)) erros.push(`sitemap sem ${url}`);
}
for (const { loc, lastmod } of entradas) {
  if (!existe(loc.slice(SITE.length) || '/')) erros.push(`sitemap aponta para página inexistente: ${loc}`);
  if (!lastmod) erros.push(`sitemap sem lastmod em ${loc}`);
  else if (dataPagina.has(loc) && lastmod.slice(0, 10) !== dataPagina.get(loc))
    erros.push(`sitemap: lastmod ${lastmod.slice(0, 10)} de ${loc} diferente do dateModified ${dataPagina.get(loc)} (use o campo "atualizado")`);
}
if (/<changefreq>|<priority>/.test(sm)) erros.push('sitemap com changefreq/priority (o Google ignora; tire)');

// llms.txt (https://llmstxt.org): H1, resumo em citação, seções ## com listas de links; links válidos
for (const f of ['llms.txt', 'llms-full.txt']) {
  if (!existsSync(join(DIST, f))) continue;
  const t = readFileSync(join(DIST, f), 'utf8');
  if (!t.startsWith('# ')) erros.push(`${f} não começa com "# "`);
  if (!/^# .+\n\n> .+/.test(t)) erros.push(`${f}: falta o resumo em citação ("> …") logo depois do título`);
  for (const [, u] of t.matchAll(/\]\((https:\/\/iasmimesteticista\.com\.br[^)]*)\)/g)) {
    if (!existe(u.slice(SITE.length) || '/')) erros.push(`${f}: link quebrado ${u}`);
  }
  if (!t.includes(NAP.endereco)) erros.push(`${f} sem endereço completo`);
  if (!t.includes(NAP.telefone)) erros.push(`${f} sem telefone`);
  if (!t.includes(negocio.horario.texto)) erros.push(`${f} sem o horário de negocio.json`);
  const semCitacoes = t.split('\n').filter((l) => !l.startsWith('>')).join('\n');
  for (const re of PROIBIDAS) {
    const m = semCitacoes.match(re);
    if (m) erros.push(`${f}: promessa proibida: "${m[0]}"`);
  }
  for (const [, v] of semCitacoes.matchAll(/R\$\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g)) {
    if (!PRECOS.has(reaisParaNumero(v))) erros.push(`${f}: preço não publicável: R$ ${v}`);
  }
}
if (existsSync(join(DIST, 'llms.txt'))) {
  const t = readFileSync(join(DIST, 'llms.txt'), 'utf8');
  if (!/^## /m.test(t)) erros.push('llms.txt sem seções "## "');
  for (const l of t.split('\n').filter((l) => l.startsWith('- ['))) {
    if (!/^- \[[^\]]+\]\(https:\/\/[^)]+\)(: .+)?$/.test(l)) erros.push(`llms.txt: item fora do formato "- [nome](url): descrição": ${l.slice(0, 80)}`);
  }
  // toda página indexável (menos a inicial, que é o próprio arquivo) aparece no llms.txt
  for (const u of urlsSitemap) if (u !== `${SITE}/` && !t.includes(`](${u})`)) erros.push(`llms.txt sem link para ${u}`);
  for (const u of noindex) if (t.includes(`](${u})`)) erros.push(`llms.txt aponta para página noindex ${u}`);
}
if (existsSync(join(DIST, 'llms-full.txt'))) {
  const t = readFileSync(join(DIST, 'llms-full.txt'), 'utf8');
  for (const u of urlsSitemap) if (u !== `${SITE}/servicos/` && !t.includes(`URL: ${u}\n`)) erros.push(`llms-full.txt sem a página ${u}`);
}

// Versão .md de cada página do sitemap (src/pages/[...pagina].md.ts): existe, tem título e URL da página,
// a página aponta para ela (<link rel="alternate" type="text/markdown">) e o llms.txt cita
for (const u of urlsSitemap) {
  const path = new URL(u).pathname;
  const md = path === '/' ? '/index.md' : `${path.slice(0, -1)}.md`;
  const arq = join(DIST, md);
  if (!existsSync(arq)) { erros.push(`sem a versão Markdown de ${path} (${md})`); continue; }
  const t = readFileSync(arq, 'utf8');
  if (!t.startsWith('# ') || !t.includes(`URL: ${u}\n`)) erros.push(`${md}: sem "# título" ou sem "URL: ${u}"`);
  if (/<[a-z][^>]*>/i.test(t.replace(/`[^`]*`/g, ''))) erros.push(`${md}: tem HTML`);
  const html = readFileSync(join(DIST, path, 'index.html'), 'utf8');
  if (!html.includes(`<link rel="alternate" type="text/markdown" href="${md}">`)) erros.push(`${path}: sem <link rel="alternate"> para ${md}`);
  if (existsSync(join(DIST, 'llms.txt')) && !readFileSync(join(DIST, 'llms.txt'), 'utf8').includes(`${SITE}${md}`) && path !== '/') erros.push(`llms.txt sem ${md}`);
}

// Worker e public/_headers: www → domínio, noindex nos .txt para IAs, CSP e log de acessos
const worker = readFileSync(join(RAIZ, 'worker/index.ts'), 'utf8');
const headers = readFileSync(join(RAIZ, 'public/_headers'), 'utf8');
if (!/url\.hostname === `www\.\$\{DOMINIO\}`\) return redirecionar\(`https:\/\/\$\{DOMINIO\}/.test(worker))
  erros.push('worker/index.ts sem o redirecionamento 301 de www para o domínio');
if (!/^\/llms\*\.txt\n(?:  .*\n)*?  X-Robots-Tag: noindex$/m.test(headers)) erros.push('public/_headers sem X-Robots-Tag noindex nos llms*.txt');
if (!/^\/\*\.md\n(?:  .*\n)*?  X-Robots-Tag: noindex$/m.test(headers)) erros.push('public/_headers sem text/markdown + noindex nos .md');
// CSP sem domínio de fora em script-src e connect-src (além dos do Google)
const csp = headers.match(/^  Content-Security-Policy: (.*)$/m)?.[1] ?? '';
for (const d of ['script-src', 'connect-src']) {
  // 'self' + (unsafe-inline) + só os domínios do GA4/Signals (googletagmanager, google-analytics, analytics.google.com, google.com[.br], stats.g.doubleclick.net)
  const valor = csp.match(new RegExp(`${d} ([^;]*);`))?.[1] ?? '';
  const fora = valor.split(' ').filter((t) => t && !/^('self'|'unsafe-inline'|https:\/\/(www\.googletagmanager\.com|analytics\.google\.com|www\.google\.com(\.br)?|stats\.g\.doubleclick\.net|\*\.(google-analytics|googletagmanager)\.com))$/.test(t));
  if (!valor.includes("'self'") || fora.length) erros.push(`public/_headers: CSP ${d} só pode ter 'self' e os domínios do GA4 (fora: ${fora.join(' ') || 'sem self'})`);
}
// Log de acessos: grava depois da resposta e o Worker não roda nos arquivos do Astro
if (!worker.includes('ctx.waitUntil(gravar(')) erros.push('worker/index.ts sem ctx.waitUntil no log de acessos (atrasaria a resposta)');
const wrangler = readFileSync(join(RAIZ, 'wrangler.jsonc'), 'utf8');
if (!wrangler.includes('"!/_astro/*"')) erros.push('wrangler.jsonc: run_worker_first sem a exclusão "!/_astro/*"');

console.log(`Páginas HTML: ${paginas.length} (${noindex.size} noindex)`);
console.log(`Blocos JSON-LD válidos verificados: ${totalLd}`);
console.log(`Links internos verificados: ${totalLinks}`);
console.log(`URLs no sitemap: ${urlsSitemap.length}`);
console.log(`Links de contato com evento verificados: ${totalEventos}`);
console.log(`Preços publicáveis: ${[...PRECOS].sort((a, b) => a - b).join(', ')}`);
for (const a of avisos) console.log(`aviso: ${a}`);
if (erros.length) {
  console.error(`\n${erros.length} problema(s):`);
  for (const e of erros) console.error(` - ${e}`);
  process.exit(1);
}
console.log('\nTudo certo.');
