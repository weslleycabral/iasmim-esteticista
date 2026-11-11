// Refaz a classe e o robô de registros já gravados com a regra atual de worker/robos.ts (depois de mexer na lista).
// Uso: npm run reclassificar -- [--d1] [arquivos .jsonl...]
//   --d1: atualiza o D1 remoto "iasmim-acessos" (só as linhas que mudam).
//   arquivos: reescreve cada JSONL no lugar (ex.: os do plugin acessos e de dados/acessos).
// Registros antigos sem "rede" ficam só com User-Agent e caminho.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { classificar } from '../worker/robos.ts';

const args = process.argv.slice(2);
const novo = (r) => classificar(r.ua ?? '', r.caminho ?? '', r.rede ?? '');
const mudou = (r, n) => r.classe !== n.classe || (r.robo ?? '') !== n.robo;

for (const arq of args.filter((a) => !a.startsWith('--'))) {
  const regs = readFileSync(arq, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  let n = 0;
  for (const r of regs) {
    const c = novo(r);
    if (mudou(r, c)) { Object.assign(r, c); n++; }
  }
  writeFileSync(arq, regs.map((r) => JSON.stringify(r)).join('\n') + (regs.length ? '\n' : ''));
  console.log(`${arq}: ${n} de ${regs.length} reclassificado(s)`);
}

if (args.includes('--d1')) {
  const wrangler = new URL('../node_modules/.bin/wrangler', import.meta.url).pathname;
  const cwd = new URL('../', import.meta.url).pathname;
  const d1 = (...a) => execFileSync(wrangler, ['d1', 'execute', 'iasmim-acessos', '--remote', ...a], { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] });
  const regs = JSON.parse(d1('--json', '--command', 'SELECT chave, ua, caminho, rede, classe, robo FROM acessos'))[0].results;
  const sql = [];
  const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
  for (const r of regs) {
    const c = novo(r);
    if (mudou(r, c)) sql.push(`UPDATE acessos SET classe = ${q(c.classe)}, robo = ${q(c.robo)} WHERE chave = ${q(r.chave)};`);
  }
  if (sql.length) {
    const arq = join(mkdtempSync(join(tmpdir(), 'reclassificar-')), 'update.sql');
    writeFileSync(arq, sql.join('\n'));
    d1('--yes', '--file', arq);
  }
  console.log(`D1: ${sql.length} de ${regs.length} reclassificado(s)`);
}
