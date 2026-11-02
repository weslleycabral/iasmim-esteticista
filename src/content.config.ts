import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Pergunta e resposta (vira FAQ visível na página e FAQPage no JSON-LD)
const faq = z.array(
  z.object({
    pergunta: z.string(),
    resposta: z.string(),
  }),
);

// Espaço para foto. Enquanto "src" estiver vazio, o site mostra um desenho neutro.
// Para trocar: coloque o arquivo em public/fotos/ e escreva o caminho, ex. "/fotos/limpeza-de-pele.webp".
const imagem = z
  .object({
    src: z.string().default(''),
    alt: z.string(),
  })
  .optional();

const seo = {
  // Título da aba e do Google: no máximo 60 caracteres, com o serviço e "Juazeiro do Norte"
  title: z.string().max(60),
  // Descrição do Google: no máximo 155 caracteres
  description: z.string().max(155),
  h1: z.string(),
  atualizado: z.coerce.date(),
};

const servicos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/servicos' }),
  schema: z.object({
    ...seo,
    nome: z.string(), // nome curto do serviço, ex. "Microagulhamento"
    resumo: z.string(), // 1 a 2 frases para os cartões e para o llms.txt
    tipo: z.enum(['servico', 'grupo']).default('servico'), // "grupo" = página que reúne outros (Peelings)
    categoria: z.string(), // ex. "Tratamento facial", "Peeling químico"
    outrosNomes: z.array(z.string()).default([]), // sinônimos que as pessoas buscam
    indicacoes: z.array(z.string()).default([]), // lista curta "para quem é indicado"
    ordem: z.number().default(100),
    mensagemWhatsApp: z.string().optional(), // se vazio, usa "Olá, Iasmim! Quero agendar <nome>."
    relacionados: z.array(z.string()).default([]), // ids de outros serviços, ex. "peeling/peeling-para-melasma"
    // Preço publicado. Sem este campo, o site mostra "sob consulta pelo WhatsApp".
    // Ex.: { valor: 249.9 } → "R$ 249,90"; { valor: 480, aPartirDe: true } → "a partir de R$ 480"
    preco: z
      .object({
        valor: z.number().positive(),
        aPartirDe: z.boolean().default(false), // true = preço mínimo, depende da avaliação
        detalhe: z.string().optional(), // o que o valor inclui, ex. "três áreas, com retorno incluso"
      })
      .optional(),
    imagem,
    faq: faq.default([]),
  }),
});

const paginas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/paginas' }),
  schema: z.object({
    ...seo,
    resumo: z.string().optional(),
    imagem,
    faq: faq.default([]),
  }),
});

export const collections = { servicos, paginas };
