// Worker do site: serve dist/ (static assets) e faz o que um arquivo estático não faz.
// Só roda nos caminhos de "run_worker_first" (wrangler.jsonc); CSS, JS, fontes e imagens saem direto do CDN.
// - www → sem www e http → https (301), no domínio oficial.
// - /whatsapp: link curto do WhatsApp (abaixo).
// - Log de acessos (METRICAS.md 1.1): um registro por acesso no D1 "iasmim-acessos", tabela "acessos"
//   (migrations/). É a única fonte que enxerga robôs (não rodam JavaScript) e quem bloqueia o GA4.
//   Exportação: npm run acessos (scripts/acessos.mjs).
//   - A resposta sai sem esperar: a gravação roda depois, com ctx.waitUntil. Se o log falhar, a página sai igual.
//   - Registra páginas HTML, robots.txt, sitemap*.xml, llms*.txt, redirecionamentos e 404.
//   - "visitante" = hash de sal + dia + IP + User-Agent: muda todo dia e o IP não é guardado (LGPD).
//     O sal vem do secret ACESSOS_SAL (wrangler secret put ACESSOS_SAL; o repositório é público).
//   - "equipe": cookie iasmim-equipe=1, ligado por ?nao-contar (ver Base.astro).
// Env (ASSETS, ACESSOS, ACESSOS_SAL) vem de worker-configuration.d.ts: npm run types depois de mexer no wrangler.jsonc
import { classificar } from './robos.ts';

const DOMINIO = 'iasmimesteticista.com.br';
// O public/_headers só vale para os arquivos de dist/; nas respostas criadas aqui, o HSTS entra à mão
const HSTS = { 'Strict-Transport-Security': 'max-age=31536000' };

// Link curto e reutilizável do WhatsApp: /whatsapp?msg=<mensagem>&ref=<origem>
// Serve onde o destino não aceita ?text= (ex.: campo de chat do Perfil da Empresa no Google) e em qualquer
// link novo (posts, diretórios, QR code) sem criar rota nova. O acesso entra no log como /whatsapp?...
// 302 de propósito: não ficar em cache.
// - msg: texto da mensagem. Sem ele, usa a mensagem padrão.
// - ref: origem, vira o sufixo "(ref. <origem>)" que o site já usa nas mensagens. Ex.: ref=perfil · google-gmn
const WHATSAPP = '5588999890590';
const MSG_PADRAO = 'Olá, Iasmim! Quero agendar um horário.';
const limpar = (v: string | null, max: number) => (v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function whatsapp(url: URL) {
  const ref = limpar(url.searchParams.get('ref'), 60);
  const texto = `${limpar(url.searchParams.get('msg'), 300) || MSG_PADRAO}${ref ? ` (ref. ${ref})` : ''}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      ...HSTS,
    },
  });
}

const redirecionar = (destino: string) => new Response(null, { status: 301, headers: { Location: destino, ...HSTS } });

async function responder(req: Request, env: Env) {
  const url = new URL(req.url);
  if (url.hostname === `www.${DOMINIO}`) return redirecionar(`https://${DOMINIO}${url.pathname}${url.search}`);
  if (url.hostname === DOMINIO && url.protocol === 'http:') return redirecionar(`https://${DOMINIO}${url.pathname}${url.search}`);
  if (url.pathname === '/whatsapp' || url.pathname === '/whatsapp/') return whatsapp(url);
  const res = await env.ASSETS.fetch(req);
  // /sobre → /sobre/ e /sobre/index.html → /sobre/: os static assets respondem 307; 301 diz ao Google que o
  // endereço com barra é o definitivo
  const destino = res.headers.get('location');
  if (res.status === 307 && destino) return redirecionar(destino);
  // No ar, o HTML sai como "text/html" sem charset (o wrangler dev manda com): o charset no cabeçalho
  // garante UTF-8 antes de o navegador chegar no <meta charset>
  if (res.headers.get('content-type') === 'text/html') {
    const comCharset = new Response(res.body, res);
    comCharset.headers.set('content-type', 'text/html; charset=utf-8');
    return comCharset;
  }
  return res;
}

// Resposta que vale registrar: tudo que não for arquivo comum (HTML, texto, XML) e qualquer 3xx/4xx/5xx
const registrar = (res: Response) =>
  res.status >= 300 || /text\/html|text\/plain|xml/.test(res.headers.get('content-type') ?? '');

async function visitante(sal: string | undefined, ip: string, ua: string, dia: string) {
  if (!sal || !ip) return '';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sal}|${dia}|${ip}|${ua}`));
  return [...new Uint8Array(hash).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function gravar(req: Request, res: Response, env: Env) {
  const agora = new Date();
  const dia = agora.toISOString().slice(0, 10);
  const url = new URL(req.url);
  const ua = req.headers.get('user-agent') ?? '';
  const { classe, robo } = classificar(ua);
  const cf = req.cf ?? {};
  const chave = `${dia}/${agora.getTime()}-${crypto.randomUUID().slice(0, 8)}`;
  await env.ACESSOS.prepare(
    `INSERT INTO acessos (chave, ts, metodo, host, caminho, query, status, referer, ua, idioma, pais, estado, cidade, visitante, classe, robo, equipe)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      chave,
      agora.toISOString(),
      req.method,
      url.hostname,
      url.pathname,
      url.search, // completa: UTMs, gclid, fbclid, srsltid
      res.status,
      req.headers.get('referer') ?? '',
      ua,
      req.headers.get('accept-language') ?? '',
      String(cf.country ?? ''),
      String(cf.regionCode ?? ''),
      String(cf.city ?? ''),
      await visitante(env.ACESSOS_SAL, req.headers.get('cf-connecting-ip') ?? '', ua, dia),
      classe,
      robo,
      /(?:^|;\s*)iasmim-equipe=1(?:;|$)/.test(req.headers.get('cookie') ?? '') ? 1 : 0,
    )
    .run();
}

export default {
  async fetch(req, env, ctx) {
    // Se o Worker falhar, a página sai direto dos arquivos (como o onError: 'bypass' da Netlify)
    const res = await responder(req, env).catch((e) => {
      console.error('responder:', e);
      return env.ASSETS.fetch(req);
    });
    if (registrar(res)) ctx.waitUntil(gravar(req, res, env).catch((e) => console.error('acessos:', e)));
    return res;
  },
} satisfies ExportedHandler<Env>;
