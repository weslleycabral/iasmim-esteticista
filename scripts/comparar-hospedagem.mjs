// Compara dois endereços do site (ex.: produção e wrangler dev): status, Location e cabeçalhos relevantes.
// Uso: node scripts/comparar-hospedagem.mjs <base-a> <base-b> <arquivo-em-_astro>
import { createHash } from 'node:crypto';
const [PROD, LOCAL, ASTRO] = process.argv.slice(2);
const casos = [
  '/', '/sobre', '/sobre/', '/sobre/?utm_source=x', '/servicos/', '/contato',
  '/servicos/remocao-de-sinais-e-verrugas-jato-de-plasma', '/servicos/remocao-de-sinais-e-verrugas-jato-de-plasma/', '/servicos/remocao-de-sinais-e-verrugas-jato-de-plasma/x',
  '/nao-existe/', '/nao-existe', '/robots.txt', '/llms.txt', '/llms-full.txt', '/sitemap-index.xml', '/sitemap-0.xml',
  '/bio/', '/bio', '/privacidade/', '/whatsapp?msg=Oi%20tudo%20bem&ref=teste', '/whatsapp', '/whatsapp/',
  `/_astro/${ASTRO}`, '/favicon.svg', '/favicon.ico', '/apple-touch-icon.png', '/og-iasmim-esteticista.jpg', '/logo-iasmim-esteticista.webp',
  '/u/s.js', '/index.html', '/sobre/index.html',
];
const H = ['content-type', 'cache-control', 'x-robots-tag', 'strict-transport-security', 'content-security-policy', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'x-content-type-options'];
const norm = (v, base) => v?.replace(base, '').replace(/^https:\/\/iasmimesteticista\.com\.br/, '');
async function pega(base, p) {
  const r = await fetch(base + p, { redirect: 'manual', headers: { cookie: 'iasmim-equipe=1', 'user-agent': 'comparar-migracao/1 curl' } });
  const corpo = Buffer.from(await r.arrayBuffer());
  const h = Object.fromEntries(H.map((k) => [k, r.headers.get(k)?.replace(/([;,])\s*/g, '$1 ').toLowerCase() ?? null]));
  return { status: r.status, location: norm(r.headers.get('location'), base), h, hash: createHash('sha1').update(corpo).digest('hex').slice(0, 8) };
}
let dif = 0;
for (const p of casos) {
  const [a, b] = await Promise.all([pega(PROD, p), pega(LOCAL, p)]);
  const d = [];
  if (a.status !== b.status) d.push(`status ${a.status} → ${b.status}`);
  if (a.location !== b.location) d.push(`location ${a.location} → ${b.location}`);
  for (const k of H) if (a.h[k] !== b.h[k]) d.push(`${k}: ${a.h[k]} → ${b.h[k]}`);
  const corpo = a.hash === b.hash ? 'corpo igual' : 'corpo difere';
  if (d.length) dif++;
  console.log(`${d.length ? '✗' : '✓'} ${p}  [${a.status}${a.location ? ' → ' + a.location : ''}] ${corpo}`);
  for (const x of d) console.log(`    ${x}`);
}
console.log(`\n${casos.length} casos, ${dif} com diferença`);
