// Gera /llms.txt e /llms-full.txt a partir dos .md (https://llmstxt.org)
import { trocarFotos } from './fotos-md';
import { getCollection, getEntry } from 'astro:content';
import { negocio, abs, servicoPath, todosServicos, ehPeeling, waLink, precoTexto, VALOR_SOB_CONSULTA, type Servico } from './site';
import { depoimentos, doServico, gerais, mesBR, type Depoimento } from './depoimentos';

const fatos = (servicos: Servico[]) => {
  const pos = negocio.formacao[1];
  const precos = servicos.filter((s) => s.data.preco).map((s) => `${s.data.nome} ${precoTexto(s)}`);
  return [
    `- Nome: ${negocio.nome}`,
    `- Profissional: ${negocio.profissional} — ${negocio.cargo}; ${pos.titulo} (${pos.instituicao}, ${pos.instituicaoCidade}/${pos.instituicaoUf}, ${pos.cargaHoraria}, concluída em ${pos.conclusao.slice(0, 4)})`,
    `- Endereço: ${negocio.endereco.linha}`,
    `- Coordenadas: ${negocio.geo.lat}, ${negocio.geo.lng} (Plus Code ${negocio.geo.plusCode})`,
    `- Telefone e WhatsApp: ${negocio.telefone} (${negocio.telefoneE164}) — ${waLink()}`,
    `- Instagram: ${negocio.instagram}`,
    `- Horário: ${negocio.horario.texto}`,
    `- Antecedência para agendar: ${negocio.antecedencia}`,
    `- Avaliação: ${negocio.avaliacao.texto}`,
    `- Pagamento: ${negocio.pagamento.texto}`,
    `- Público: ${negocio.publico}`,
    `- Como chegar: ${negocio.referencia}`,
    `- Atende: ${negocio.areaAtendida.map((c) => c.nome).join(', ')} e região do Cariri (CE)`,
    `- Avaliação no Google: ${negocio.avaliacoes.nota} com ${negocio.avaliacoes.total} avaliações — ${negocio.googleAvaliacoes}`,
    `- Preços: avaliação ${negocio.avaliacao.valor}, descontada do procedimento; ${precos.join('; ')}; os demais valores são definidos na avaliação`,
    `- Outros procedimentos (sem página no site): brow lamination e dermaplaning`,
    `- Produtos: revendedora autorizada Anna Pegova desde 2025 e única revendedora da linha completa em Juazeiro do Norte; vende também para quem não é cliente e envia pelos Correios para cidades vizinhas`,
  ].join('\n');
};

export async function llmsTxt() {
  const servicos = await todosServicos();
  const principais = servicos.filter((s) => !ehPeeling(s));
  const peelings = servicos.filter(ehPeeling);
  const linha = (nome: string, path: string, desc: string) => `- [${nome}](${abs(path)}): ${desc}`;
  const anna = await getEntry('paginas', 'anna-pegova');
  const linhaServico = (s: Servico) => {
    const preco = precoTexto(s);
    return linha(s.data.nome, servicoPath(s.id), preco ? `${s.data.resumo} Valor: ${preco}.` : s.data.resumo);
  };

  return `# ${negocio.nome}

> ${negocio.nome} é o espaço de estética facial da esteticista ${negocio.profissional} (${negocio.cargo}, pós-graduada em Harmonização Facial) no bairro Salesianos, em Juazeiro do Norte (CE). Oferece limpeza de pele, peelings, microagulhamento, botox, preenchimento labial, Herus HIFU e remoção de sinais e verrugas com jato de plasma e eletrocautério, atende também Crato e Barbalha, e é a única revendedora da linha Anna Pegova em Juazeiro do Norte.

${fatos(servicos)}

## Serviços

${principais.map(linhaServico).join('\n')}

## Peelings

${peelings.map(linhaServico).join('\n')}

## Produtos

${linha('Anna Pegova', '/produtos/anna-pegova/', anna?.data.resumo ?? 'Linha completa Anna Pegova.')}

## Sobre e contato

${linha('Sobre a Iasmim Mayara', '/sobre/', 'Formação, pós-graduação e forma de trabalho.')}
${linha('Depoimentos de clientes', '/depoimentos/', `${depoimentos.length} trechos reais de avaliações no Google, sem correções.`)}
${linha('Contato e como chegar', '/contato/', 'Endereço, mapa, horário e WhatsApp.')}
${linha('Perguntas frequentes', '/perguntas-frequentes/', 'Dúvidas sobre agendamento, valores, pagamento e tratamentos.')}

## Optional

- [Conteúdo completo do site em Markdown](${abs('/llms-full.txt')})
`;
}

const faqMd = (faq: { pergunta: string; resposta: string }[]) =>
  faq.length ? `\n### Perguntas frequentes\n\n${faq.map((f) => `**${f.pergunta}**\n${f.resposta}`).join('\n\n')}\n` : '';

// Rebaixa os títulos do .md em um nível para caber dentro da seção da página
const rebaixar = (md: string) => md.replace(/^(#{1,5}) /gm, '#$1 ');

// Fotos em HTML dentro do .md (ex.: antes e depois) viram imagens em Markdown, sem as tags de layout
const htmlParaMd = (md: string) =>
  md
    .replace(/<img [^>]*src="([^"]+)"[^>]*alt="([^"]+)"[^>]*\/?>/g, (_, src, alt) => `\n![${alt}](${abs(src)})\n`)
    .replace(/<span class="ad-rotulo">[^<]*<\/span>/g, '')
    .replace(/<figcaption>([^<]*)<\/figcaption>/g, '\n_$1_\n')
    .replace(/<\/?(div|figure|p)[^>]*>/g, '\n');

// Depoimentos copiados das avaliações do Google, agrupados pelo serviço citado
const citacao = (d: Depoimento) =>
  `> "${d.texto}"\n> — ${d.nome}, ${d.nota} estrelas, ${mesBR(d.mes)}, avaliação no Google${d.link ? ` (${d.link})` : ''}`;

const blocoDepoimentos = (servicos: { id: string; data: { nome: string } }[]) => {
  const grupos = servicos
    .map((s) => ({ titulo: `Depoimentos sobre ${s.data.nome.toLowerCase()} (${abs(servicoPath(s.id))})`, itens: doServico(s.id) }))
    .filter((g) => g.itens.length);
  const outros = gerais();
  if (outros.length) grupos.push({ titulo: 'Depoimentos sobre o atendimento e os resultados', itens: outros });
  return grupos.map((g) => `### ${g.titulo}\n\n${g.itens.map(citacao).join('\n\n')}`).join('\n\n') + '\n';
};

export async function llmsFullTxt() {
  const servicos = await todosServicos();
  const paginas = await getCollection('paginas');
  const pag = (id: string) => paginas.find((p) => p.id === id);
  const caminhos: Record<string, string> = {
    inicio: '/',
    sobre: '/sobre/',
    contato: '/contato/',
    'perguntas-frequentes': '/perguntas-frequentes/',
    'anna-pegova': '/produtos/anna-pegova/',
    depoimentos: '/depoimentos/',
  };

  const blocoPagina = (id: string) => {
    const p = pag(id);
    if (!p) return '';
    return `## ${p.data.h1}\n\nURL: ${abs(caminhos[id])}\n\n${p.data.resumo ? p.data.resumo + '\n\n' : ''}${rebaixar(p.body ?? '').trim()}\n${faqMd(p.data.faq)}`;
  };

  // fotos em HTML nos .md: /fotos/… → arquivo otimizado em /_astro/ (ver fotos-md.ts)
  const corpos = new Map(await Promise.all(servicos.map(async (s) => [s.id, await trocarFotos(s.body ?? '')] as const)));
  const blocoServico = (s: (typeof servicos)[number]) =>
    `## ${s.data.h1}\n\nURL: ${abs(servicoPath(s.id))}\n\n${s.data.resumo}\n\n- Indicado para: ${s.data.indicacoes.join('; ') || '—'}\n- Outros nomes: ${s.data.outrosNomes.join(', ') || '—'}\n- Onde fazer: ${negocio.nome}, ${negocio.endereco.linha}\n- Agendamento: WhatsApp ${negocio.telefone}\n- Valor: ${precoTexto(s) ?? VALOR_SOB_CONSULTA}\n- Avaliação: ${negocio.avaliacao.valor}, descontada do procedimento\n\n${htmlParaMd(rebaixar(corpos.get(s.id) ?? '')).trim()}\n${faqMd(s.data.faq)}`;

  return `# ${negocio.nome} — conteúdo completo

> Todo o conteúdo do site ${abs('/')} em Markdown, para leitura por assistentes de IA.

${fatos(servicos)}

${blocoPagina('inicio')}

${servicos.map(blocoServico).join('\n\n')}

${blocoPagina('anna-pegova')}

${blocoPagina('sobre')}

${blocoPagina('depoimentos')}
${blocoDepoimentos(servicos)}

${blocoPagina('contato')}

${blocoPagina('perguntas-frequentes')}
`.replace(/\n{3,}/g, '\n\n');
}
