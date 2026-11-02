import negocio from '../data/negocio.json';
import { getCollection, type CollectionEntry } from 'astro:content';

export { negocio };
export const SITE = negocio.site;

export type Servico = CollectionEntry<'servicos'>;

/** URL absoluta a partir de um caminho ("/servicos/") */
export const abs = (path: string) => new URL(path, SITE).href;

/** Caminho da página de um serviço a partir do id do arquivo .md */
export const servicoPath = (id: string) => `/servicos/${id}/`;

/** Link do WhatsApp com mensagem pronta */
export const waLink = (mensagem = 'Olá, Iasmim! Quero agendar um horário.') =>
  `https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(mensagem)}`;

export const msgServico = (s: Servico) =>
  s.data.mensagemWhatsApp ?? `Olá, Iasmim! Quero agendar ${s.data.nome}.`;

export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${negocio.nome}, ${negocio.endereco.rua} - ${negocio.endereco.bairro}, ${negocio.endereco.cidade} - ${negocio.endereco.uf}`,
)}`;

export const mapsRotaLink = `https://www.google.com/maps/dir/?api=1&destination=${negocio.geo.lat},${negocio.geo.lng}`;

/** Todos os serviços em ordem; os peelings ficam agrupados */
export async function todosServicos() {
  const lista = await getCollection('servicos');
  return lista.sort((a, b) => a.data.ordem - b.data.ordem || a.data.nome.localeCompare(b.data.nome, 'pt-BR'));
}

/** "R$ 249,90", "R$ 480" */
export const reais = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** Preço do serviço em texto ("a partir de R$ 480 (…)") ou null quando não há preço publicado */
export const precoTexto = (s: Servico) => {
  const p = s.data.preco;
  if (!p) return null;
  return `${p.aPartirDe ? 'a partir de ' : ''}${reais(p.valor)}${p.detalhe ? ` (${p.detalhe})` : ''}`;
};

export const VALOR_SOB_CONSULTA = 'definido na avaliação; consulte pelo WhatsApp';

export const ehPeeling = (s: Servico) => s.id.startsWith('peeling/');

/** Serviços de primeiro nível (sem os peelings individuais) */
export async function servicosPrincipais() {
  return (await todosServicos()).filter((s) => !ehPeeling(s));
}

export async function peelings() {
  return (await todosServicos()).filter(ehPeeling);
}

export const dataISO = (d: Date) => d.toISOString().slice(0, 10);

export const dataBR = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });
