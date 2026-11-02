// Depoimentos de clientes (trechos das avaliações do Google). Os dados ficam em src/data/depoimentos.json.
// Sem Review/AggregateRating no JSON-LD: o Google não aceita avaliações da própria empresa marcadas no site.
import dados from '../data/depoimentos.json';

export interface Depoimento {
  nome: string;
  nota: number;
  mes: string; // AAAA-MM
  texto: string;
  servico: string | null; // id do .md do serviço, ex. "limpeza-de-pele"
  destaque: boolean;
  capa?: boolean; // uma das 3 citações grandes da home
  trecho?: string; // parte literal do texto, para a citação da home
  link?: string;
}

export const depoimentos: Depoimento[] = dados.depoimentos;

for (const d of depoimentos) {
  if (!/^\d{4}-\d{2}$/.test(d.mes)) throw new Error(`Depoimento de ${d.nome}: "mes" deve ser AAAA-MM`);
  if (d.nota < 1 || d.nota > 5) throw new Error(`Depoimento de ${d.nome}: "nota" deve ser de 1 a 5`);
  if (d.trecho && !d.texto.includes(d.trecho))
    throw new Error(`Depoimento de ${d.nome}: "trecho" precisa ser cópia exata de uma parte do "texto"`);
}

export const doServico = (id: string) => depoimentos.filter((d) => d.servico === id);
export const gerais = () => depoimentos.filter((d) => !d.servico);

/** "2025-05" → "maio de 2025" */
export const mesBR = (mes: string) =>
  new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** As citações da home (capa: true), da mais recente para a mais antiga */
export const capa = () => depoimentos.filter((d) => d.capa).sort((a, b) => b.mes.localeCompare(a.mes));

/** Texto da citação: o trecho (com … onde houve corte) ou o texto inteiro */
export const citacao = (d: Depoimento) => {
  if (!d.trecho) return d.texto;
  const i = d.texto.indexOf(d.trecho);
  const antes = i > 0 ? '… ' : '';
  const depois = i + d.trecho.length < d.texto.length ? ' …' : '';
  return `${antes}${d.trecho}${depois}`;
};

/** "2026-10" → "out. 2026" */
export const mesCurto = (mes: string) => {
  const m = new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' });
  return `${m.endsWith('.') ? m : m + '.'} ${mes.slice(0, 4)}`;
};
