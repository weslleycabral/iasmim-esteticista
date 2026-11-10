-- Log de acessos (METRICAS.md 1.1), gravado por worker/index.ts. Um registro por acesso, os mesmos campos
-- do JSONL exportado por scripts/acessos.mjs. chave = "AAAA-MM-DD/<timestamp>-<aleatório>" (ordena por data).
CREATE TABLE acessos (
  chave TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  metodo TEXT NOT NULL,
  host TEXT NOT NULL,
  caminho TEXT NOT NULL,
  query TEXT NOT NULL,
  status INTEGER NOT NULL,
  referer TEXT NOT NULL,
  ua TEXT NOT NULL,
  idioma TEXT NOT NULL,
  pais TEXT NOT NULL,
  estado TEXT NOT NULL,
  cidade TEXT NOT NULL,
  visitante TEXT NOT NULL,
  classe TEXT NOT NULL,
  robo TEXT NOT NULL,
  equipe INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;
