// Log de acessos no servidor (METRICAS.md 1.1): um registro por acesso no Netlify Blobs, store "acessos",
// chave "AAAA-MM-DD/<timestamp>-<aleatório>". É a única fonte que enxerga robôs (não rodam JavaScript)
// e quem bloqueia o Umami. Exportação: npm run acessos (scripts/acessos.mjs).
// - A resposta sai sem esperar: a gravação roda depois, com context.waitUntil. Se a função falhar,
//   a Netlify serve a página normalmente (onError: 'bypass').
// - Registra páginas HTML, robots.txt, sitemap*.xml, llms*.txt, redirecionamentos e 404. Não roda em
//   /_astro/* (CSS, JS, fontes e imagens do Astro), ícones, imagens nem no proxy do Umami (/u/*).
// - "visitante" = hash de sal + dia + IP + User-Agent: muda todo dia e o IP não é guardado (LGPD).
//   O sal vem da variável de ambiente ACESSOS_SAL da Netlify (o repositório é público).
// - "equipe": cookie iasmim-equipe=1, ligado por ?nao-contar (ver Base.astro).
import type { Config, Context } from '@netlify/edge-functions';
import { getStore } from '@netlify/blobs';
import { classificar } from './robos.ts';

// Resposta que vale registrar: tudo que não for arquivo comum (HTML, texto, XML) e qualquer 3xx/4xx/5xx
const registrar = (res: Response) =>
  res.status >= 300 || /text\/html|text\/plain|xml/.test(res.headers.get('content-type') ?? '');

async function visitante(ip: string, ua: string, dia: string) {
  const sal = Netlify.env.get('ACESSOS_SAL');
  if (!sal || !ip) return '';
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${sal}|${dia}|${ip}|${ua}`));
  return [...new Uint8Array(hash).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function gravar(req: Request, res: Response, context: Context) {
  const agora = new Date();
  const dia = agora.toISOString().slice(0, 10);
  const url = new URL(req.url);
  const ua = req.headers.get('user-agent') ?? '';
  const geo = context.geo ?? {};
  const registro = {
    ts: agora.toISOString(),
    metodo: req.method,
    host: url.hostname,
    caminho: url.pathname,
    query: url.search, // completa: UTMs, gclid, fbclid, srsltid
    status: res.status,
    referer: req.headers.get('referer') ?? '',
    ua,
    idioma: req.headers.get('accept-language') ?? '',
    pais: geo.country?.code ?? '',
    estado: geo.subdivision?.code ?? '',
    cidade: geo.city ?? '',
    visitante: await visitante(context.ip, ua, dia),
    ...classificar(ua),
    ...(context.cookies.get('iasmim-equipe') === '1' ? { equipe: true } : {}),
  };
  const chave = `${dia}/${agora.getTime()}-${crypto.randomUUID().slice(0, 8)}`;
  await getStore('acessos').setJSON(chave, registro);
}

export default async (req: Request, context: Context) => {
  const res = await context.next();
  if (registrar(res)) context.waitUntil(gravar(req, res, context).catch((e) => console.error('acessos:', e)));
  return res;
};

export const config: Config = {
  path: '/*',
  excludedPath: ['/_astro/*', '/u/*', '/.netlify/*', '/favicon.*', '/apple-touch-icon.png', '/*.webp', '/*.avif', '/*.jpg', '/*.png', '/*.svg', '/*.woff2', '/*.css', '/*.js'],
  onError: 'bypass',
};
