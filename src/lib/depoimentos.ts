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
  link?: string;
}

export const depoimentos: Depoimento[] = dados.depoimentos;

for (const d of depoimentos) {
  if (!/^\d{4}-\d{2}$/.test(d.mes)) throw new Error(`Depoimento de ${d.nome}: "mes" deve ser AAAA-MM`);
  if (d.nota < 1 || d.nota > 5) throw new Error(`Depoimento de ${d.nome}: "nota" deve ser de 1 a 5`);
}

export const destaques = () => depoimentos.filter((d) => d.destaque);
export const doServico = (id: string) => depoimentos.filter((d) => d.servico === id);
export const gerais = () => depoimentos.filter((d) => !d.servico);

/** "2025-05" → "maio de 2025" */
export const mesBR = (mes: string) =>
  new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
