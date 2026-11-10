// Baixa o log de acessos do D1 "iasmim-acessos" (tabela "acessos", gravada por worker/index.ts) para um JSONL
// por mês, um registro por linha, em ordem de data. Mesmo formato do log da época da Netlify.
// Uso: npm run acessos [-- AAAA-MM] [-- --local]   (padrão: mês atual, em UTC; --local lê o D1 do wrangler dev).
// Junta com o que já está no arquivo (por "chave"): o mês da troca tem registros da Netlify e do D1.
// --tudo descarta o arquivo e fica só com o D1.
// Destino: $ACESSOS_DIR/AAAA-MM.jsonl (o plugin acessos passa a pasta dele; sem ela, ../../dados/acessos).
// Acesso: login do wrangler ("npx wrangler login") ou CLOUDFLARE_API_TOKEN. Nenhum token vai para o repositório.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const local = args.includes('--local');
const tudo = args.includes('--tudo');
const mes = args.find((a) => !a.startsWith('--')) ?? new Date().toISOString().slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(mes)) {
  console.error(`Mês inválido: "${mes}" (use AAAA-MM)`);
  process.exit(1);
}
const destino = process.env.ACESSOS_DIR ?? new URL('../../dados/acessos/', import.meta.url).pathname;

// chave começa com o dia (AAAA-MM-DD/...): o intervalo [AAAA-MM-, AAAA-MM.) pega o mês inteiro
const sql = `SELECT * FROM acessos WHERE chave >= '${mes}-' AND chave < '${mes}.' ORDER BY ts`;
const wrangler = new URL('../node_modules/.bin/wrangler', import.meta.url).pathname;
let saida;
try {
  saida = execFileSync(wrangler, ['d1', 'execute', 'iasmim-acessos', local ? '--local' : '--remote', '--json', '--command', sql], {
    cwd: new URL('../', import.meta.url).pathname,
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
} catch {
  console.error('Falhou a consulta ao D1: rode "npx wrangler login" ou defina CLOUDFLARE_API_TOKEN.');
  process.exit(1);
}
const doD1 = JSON.parse(saida)[0].results.map(({ chave, equipe, ...r }) => ({ ...r, ...(equipe ? { equipe: true } : {}), chave }));

const arquivo = join(destino, `${mes}.jsonl`);
const registros = !tudo && existsSync(arquivo)
  ? readFileSync(arquivo, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  : [];
const conhecidas = new Set(registros.map((r) => r.chave));
const novos = doD1.filter((r) => !conhecidas.has(r.chave));
registros.push(...novos);
registros.sort((a, b) => a.ts.localeCompare(b.ts));

mkdirSync(destino, { recursive: true });
// regrava mesmo sem novidade: o plugin usa a data do arquivo para parar de baixar meses fechados
writeFileSync(arquivo, registros.map((r) => JSON.stringify(r)).join('\n') + (registros.length ? '\n' : ''));

// resumo por classe
const porClasse = {};
for (const r of registros) porClasse[r.classe] = (porClasse[r.classe] ?? 0) + 1;
console.log(`${registros.length} acesso(s) em ${mes} (${novos.length} novo(s)) → ${arquivo}`);
for (const [c, n] of Object.entries(porClasse).sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n}`);
