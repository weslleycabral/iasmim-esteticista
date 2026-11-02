// Baixa o log de acessos do Netlify Blobs (store "acessos", gravado pela Edge Function
// netlify/edge-functions/acessos/) para um JSONL por mês, um registro por linha, em ordem de data.
// Uso: npm run acessos [-- AAAA-MM]   (padrão: mês atual, em UTC). Regrava o arquivo do mês inteiro.
// Destino: ~/www/iasmim/dados/acessos/AAAA-MM.jsonl (fora do repositório; mude com ACESSOS_DIR).
// Acesso: NETLIFY_AUTH_TOKEN ou o token da CLI da Netlify (~/.config/netlify/config.json, "netlify login").
// O token nunca é gravado em arquivo do repositório.
import { getStore } from '@netlify/blobs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const mes = process.argv[2] ?? new Date().toISOString().slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(mes)) {
  console.error(`Mês inválido: "${mes}" (use AAAA-MM)`);
  process.exit(1);
}
const destino = process.env.ACESSOS_DIR ?? new URL('../../dados/acessos/', import.meta.url).pathname;

function token() {
  if (process.env.NETLIFY_AUTH_TOKEN) return process.env.NETLIFY_AUTH_TOKEN;
  const arq = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'netlify/config.json');
  if (!existsSync(arq)) return null;
  const cfg = JSON.parse(readFileSync(arq, 'utf8'));
  return cfg.users?.[cfg.userId]?.auth?.token ?? null;
}
const siteID = process.env.NETLIFY_SITE_ID ?? JSON.parse(readFileSync(new URL('../.netlify/state.json', import.meta.url), 'utf8')).siteId;
const tk = token();
if (!tk) {
  console.error('Sem token da Netlify: rode "npx netlify-cli login" ou defina NETLIFY_AUTH_TOKEN.');
  process.exit(1);
}

const store = getStore({ name: 'acessos', siteID, token: tk });
const chaves = [];
for await (const pag of store.list({ prefix: `${mes}-`, paginate: true })) chaves.push(...pag.blobs.map((b) => b.key));

// baixa de 20 em 20
const registros = [];
for (let i = 0; i < chaves.length; i += 20) {
  const lote = await Promise.all(chaves.slice(i, i + 20).map((k) => store.get(k, { type: 'json' })));
  registros.push(...lote.filter(Boolean));
}
registros.sort((a, b) => a.ts.localeCompare(b.ts));

mkdirSync(destino, { recursive: true });
const arquivo = join(destino, `${mes}.jsonl`);
writeFileSync(arquivo, registros.map((r) => JSON.stringify(r)).join('\n') + (registros.length ? '\n' : ''));

// resumo por classe
const porClasse = {};
for (const r of registros) porClasse[r.classe] = (porClasse[r.classe] ?? 0) + 1;
console.log(`${registros.length} acesso(s) em ${mes} → ${arquivo}`);
for (const [c, n] of Object.entries(porClasse).sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`);
