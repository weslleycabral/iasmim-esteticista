// Gera /llms.txt, /llms-full.txt e a versão .md de cada página (/servicos/botox.md) a partir dos .md (https://llmstxt.org).
// Cada página vira um documento com # no título; o llms-full.txt junta os documentos com os títulos rebaixados.
import { getImage } from 'astro:assets';
import { getCollection, getEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { negocio, abs, servicoPath, todosServicos, ehPeeling, waLink, precoTexto, VALOR_SOB_CONSULTA, dataISO, type Servico } from './site';
import { depoimentos, doServico, gerais, mesBR, type Depoimento } from './depoimentos';

// Revisão mais recente entre todas as páginas (frontmatter "atualizado")
async function ultimaRevisao() {
  const todas = [...(await getCollection('servicos')), ...(await getCollection('paginas'))];
  return dataISO(new Date(Math.max(...todas.map((p) => p.data.atualizado.getTime()))));
}

const fatos = (servicos: Servico[]) => {
  const pos = negocio.formacao[1];
  const precos = servicos.filter((s) => s.data.preco).map((s) => `${s.data.nome} ${precoTexto(s)}`);
  return [
    `- Nome: ${negocio.nome}`,
    `- Profissional: ${negocio.profissional} — ${negocio.cargo}; ${pos.titulo} (${pos.instituicao}, ${pos.instituicaoCidade}/${pos.instituicaoUf}, ${pos.cargaHoraria}, ${pos.conclusao ? `concluída em ${pos.conclusao.slice(0, 4)}` : 'em andamento'})`,
    `- Endereço: ${negocio.endereco.linha}`,
    `- Coordenadas: ${negocio.geo.lat}, ${negocio.geo.lng} (Plus Code ${negocio.geo.plusCode})`,
    `- Telefone e WhatsApp: ${negocio.telefone} (${negocio.telefoneE164}) — ${waLink()}`,
    `- Instagram: ${negocio.instagram} · Facebook: ${negocio.facebook} · YouTube (Iasmim Mayara): ${negocio.youtube}`,
    `- Perfil no Google Maps: ${negocio.googleMaps}`,
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
  // Cada item leva também a versão .md da página (mais leve de ler que o HTML)
  const linha = (nome: string, path: string, desc: string) => `- [${nome}](${abs(path)}): ${desc} Markdown: ${abs(mdPath(path))}`;
  const anna = await getEntry('paginas', 'anna-pegova');
  // Sinônimos (outrosNomes) ajudam a casar a pergunta da pessoa ("toxina botulínica", "jato de plasma") com a página
  const linhaServico = (s: Servico) => {
    const preco = precoTexto(s);
    const tambem = s.data.outrosNomes.slice(0, 4);
    return linha(
      s.data.nome,
      servicoPath(s.id),
      `${s.data.resumo}${tambem.length ? ` Também chamado: ${tambem.join(', ')}.` : ''} Valor: ${preco ?? VALOR_SOB_CONSULTA}.`,
    );
  };

  return `# ${negocio.nome}

> ${negocio.nome} é o espaço de estética facial da esteticista ${negocio.profissional} (${negocio.cargo}, pós-graduada em Harmonização Facial) no bairro Salesianos, em Juazeiro do Norte (CE). Oferece limpeza de pele, peelings, microagulhamento, botox, preenchimento labial, Herus HIFU e remoção de sinais e verrugas com jato de plasma e eletrocautério, atende também Crato e Barbalha, e é a única revendedora da linha Anna Pegova em Juazeiro do Norte.

${fatos(servicos)}
- Última revisão do site: ${await ultimaRevisao()}

## Serviços

${linha('Todos os serviços', '/servicos/', `Índice dos ${principais.length} serviços e ${peelings.length} peelings, com o que cada um trata e o valor.`)}
${principais.map(linhaServico).join('\n')}

## Peelings

${peelings.map(linhaServico).join('\n')}

## Produtos

${linha('Anna Pegova', '/produtos/anna-pegova/', anna?.data.resumo ?? 'Linha completa Anna Pegova.')}

## Sobre e contato

${linha('Sobre a Iasmim Mayara', '/sobre/', 'Formação, pós-graduação e forma de trabalho.')}
${linha('Depoimentos de clientes', '/depoimentos/', `${depoimentos.length} trechos reais de avaliações no Google, sem correções.`)}
${linha('Contato e como chegar', '/contato/', 'Endereço, mapa, horário e WhatsApp.')}
${linha('Perguntas frequentes', '/perguntas-frequentes/', 'Mais de 100 respostas: como agendar, valores, formas de pagamento, onde fica, qual tratamento escolher e dúvidas de cada serviço (limpeza de pele, peelings, microagulhamento, botox, preenchimento labial, Herus HIFU, sinais e verrugas, Anna Pegova).')}

## Optional

- [Conteúdo completo do site em Markdown](${abs('/llms-full.txt')})
`;
}

const faqMd = (faq: { pergunta: string; resposta: string }[], titulo = 'Perguntas frequentes') =>
  faq.length ? `\n## ${titulo}\n\n${faq.map((f) => `**${f.pergunta}**\n${f.resposta}`).join('\n\n')}\n` : '';

// Rebaixa os títulos do .md em um nível para caber dentro da seção da página
const rebaixar = (md: string) => md.replace(/^(#{1,5}) /gm, '#$1 ');

// Caso real em fotos (frontmatter "casos", ex. melasma): vira imagens em Markdown, em WebP de até 900 px
const NOTA_FOTOS = 'Foto publicada com autorização da paciente. Resultados variam de pessoa para pessoa.';
async function casosMd(s: Servico) {
  if (!s.data.casos.length) return '';
  const img = async (f: { src: ImageMetadata; alt: string; rotulo: string }) => {
    const o = await getImage({ src: f.src, format: 'webp', width: Math.min(900, f.src.width) });
    return `![${f.rotulo}: ${f.alt}](${abs(o.src)})`;
  };
  const blocos = await Promise.all(
    s.data.casos.map(async (c) => [await img(c.antes), c.depois ? await img(c.depois) : null, c.legenda ? `_${c.legenda}_` : null].filter(Boolean).join('\n\n')),
  );
  return `\n## Fotos do caso\n\n${blocos.join('\n\n')}\n\n${NOTA_FOTOS}${s.data.casosNota ? ` ${s.data.casosNota}` : ''}\n`;
}

// Depoimentos copiados das avaliações do Google, agrupados pelo serviço citado
const citacao = (d: Depoimento) =>
  `> "${d.texto}"\n> — ${d.nome}, ${d.nota} estrelas, ${mesBR(d.mes)}, avaliação no Google${d.link ? ` (${d.link})` : ''}`;

const blocoDepoimentos = (servicos: { id: string; data: { nome: string } }[]) => {
  const grupos = servicos
    .map((s) => ({ titulo: `Depoimentos sobre ${s.data.nome.toLowerCase()} (${abs(servicoPath(s.id))})`, itens: doServico(s.id) }))
    .filter((g) => g.itens.length);
  const outros = gerais();
  if (outros.length) grupos.push({ titulo: 'Depoimentos sobre o atendimento e os resultados', itens: outros });
  return grupos.map((g) => `## ${g.titulo}\n\n${g.itens.map(citacao).join('\n\n')}`).join('\n\n') + '\n';
};

// Endereço da versão .md de uma página: "/" → "/index.md", "/servicos/botox/" → "/servicos/botox.md"
export const mdPath = (path: string) => (path === '/' ? '/index.md' : `${path.replace(/\/$/, '')}.md`);

const CAMINHOS: Record<string, string> = {
  inicio: '/',
  sobre: '/sobre/',
  contato: '/contato/',
  'perguntas-frequentes': '/perguntas-frequentes/',
  'anna-pegova': '/produtos/anna-pegova/',
  depoimentos: '/depoimentos/',
};

const cabecalho = (h1: string, path: string, atualizado: Date) =>
  `# ${h1}\n\nURL: ${abs(path)}\nAtualizado em: ${dataISO(atualizado)}\n\n`;

async function docPagina(id: string) {
  const p = await getEntry('paginas', id);
  if (!p) throw new Error(`Falta src/content/paginas/${id}.md`);
  return `${cabecalho(p.data.h1, CAMINHOS[id], p.data.atualizado)}${p.data.resumo ? p.data.resumo + '\n\n' : ''}${(p.body ?? '').trim()}\n${faqMd(p.data.faq)}`;
}

async function docServico(s: Servico) {
  return `${cabecalho(s.data.h1, servicoPath(s.id), s.data.atualizado)}${s.data.resumo}\n\n- Indicado para: ${s.data.indicacoes.join('; ') || '—'}\n- Outros nomes: ${s.data.outrosNomes.join(', ') || '—'}\n- Onde fazer: ${negocio.nome}, ${negocio.endereco.linha}\n- Agendamento: WhatsApp ${negocio.telefone}\n- Valor: ${precoTexto(s) ?? VALOR_SOB_CONSULTA}\n${s.data.duracao ? `- Duração da sessão: ${s.data.duracao}\n` : ''}${s.data.sessoes ? `- Sessões: ${s.data.sessoes}\n` : ''}- Avaliação: ${negocio.avaliacao.valor}, descontada do procedimento\n\n${(s.body ?? '').trim()}\n${await casosMd(s)}${faqMd(s.data.faq)}`;
}

const rodapeMd = (path: string) =>
  `\n---\n\nVersão em Markdown de ${abs(path)}. Agendamento pelo WhatsApp ${negocio.telefone} (${waLink()}). Todo o site: ${abs('/llms-full.txt')}\n`;

/** Versão .md de cada página indexável (as do sitemap), para assistentes de IA. Página = { path, md } */
export async function paginasMd() {
  const servicos = await todosServicos();
  const docs: { path: string; md: string }[] = [];
  const add = (path: string, md: string) => docs.push({ path, md: (md + rodapeMd(path)).replace(/\n{3,}/g, '\n\n') });

  add('/', `${await docPagina('inicio')}\n## Dados do negócio\n\n${fatos(servicos)}\n`);
  for (const s of servicos) {
    const deps = doServico(s.id);
    add(servicoPath(s.id), `${await docServico(s)}${deps.length ? `\n## Depoimentos de clientes\n\n${deps.map(citacao).join('\n\n')}\n` : ''}`);
  }
  const principais = servicos.filter((s) => !ehPeeling(s));
  const item = (s: Servico) => `- [${s.data.nome}](${abs(mdPath(servicoPath(s.id)))}): ${s.data.resumo} Valor: ${precoTexto(s) ?? VALOR_SOB_CONSULTA}.`;
  add(
    '/servicos/',
    `${cabecalho('Serviços de estética facial em Juazeiro do Norte', '/servicos/', new Date(Math.max(...servicos.map((s) => s.data.atualizado.getTime()))))}Todos os serviços de ${negocio.nome}, com o que cada um trata e o valor. Avaliação: ${negocio.avaliacao.valor}, descontada do procedimento. Horário: ${negocio.horario.texto}.\n\n## Serviços\n\n${principais.map(item).join('\n')}\n\n## Peelings\n\n${servicos.filter(ehPeeling).map(item).join('\n')}\n`,
  );
  add('/produtos/anna-pegova/', await docPagina('anna-pegova'));
  add('/sobre/', await docPagina('sobre'));
  add('/depoimentos/', `${await docPagina('depoimentos')}\n${blocoDepoimentos(servicos)}`);
  add('/contato/', await docPagina('contato'));
  // A página de perguntas reúne as de todas as páginas e serviços (a primeira ocorrência vale)
  const vistas = new Set((await getEntry('paginas', 'perguntas-frequentes'))?.data.faq.map((f) => f.pergunta));
  const novas = (faq: { pergunta: string; resposta: string }[]) => faq.filter((f) => !vistas.has(f.pergunta) && vistas.add(f.pergunta));
  let mais = '';
  for (const id of ['contato', 'sobre', 'anna-pegova']) {
    const p = await getEntry('paginas', id);
    if (p) mais += faqMd(novas(p.data.faq), `Perguntas sobre ${p.data.h1.charAt(0).toLowerCase()}${p.data.h1.slice(1)}`);
  }
  for (const s of servicos) mais += faqMd(novas(s.data.faq), `Perguntas sobre ${s.data.nome.toLowerCase()}`);
  add('/perguntas-frequentes/', `${await docPagina('perguntas-frequentes')}${mais}`);
  return docs;
}

export async function llmsFullTxt() {
  const servicos = await todosServicos();
  const docs = await Promise.all(servicos.map(docServico));

  return `# ${negocio.nome} — conteúdo completo

> Todo o conteúdo do site ${abs('/')} em Markdown, para leitura por assistentes de IA. Última revisão: ${await ultimaRevisao()}.

${fatos(servicos)}

${rebaixar(await docPagina('inicio'))}

${docs.map(rebaixar).join('\n\n')}

${rebaixar(await docPagina('anna-pegova'))}

${rebaixar(await docPagina('sobre'))}

${rebaixar(await docPagina('depoimentos'))}
${rebaixar(blocoDepoimentos(servicos))}

${rebaixar(await docPagina('contato'))}

${rebaixar(await docPagina('perguntas-frequentes'))}
`.replace(/\n{3,}/g, '\n\n');
}
