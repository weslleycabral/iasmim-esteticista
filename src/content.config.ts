import { defineCollection, type SchemaContext } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Pergunta e resposta (vira FAQ visível na página e FAQPage no JSON-LD)
const faq = z.array(
  z.object({
    pergunta: z.string(),
    resposta: z.string(),
  }),
);

// Foto otimizada pelo Astro (AVIF + WebP). O caminho é relativo ao .md, ex. "../../assets/fotos/limpeza.webp".
// "src" vazio ("") ou ausente = ainda sem foto: a página resolve com tipografia, sem desenho no lugar.
const foto = ({ image }: SchemaContext) =>
  z.object({
    src: z.preprocess((v) => (v === '' ? undefined : v), image().optional()),
    alt: z.string(),
  });

// Caso real em fotos (ex. melasma): pares antes/depois com legenda. "depois" é opcional (ex. foto sob luz UV).
// O site mostra sempre a nota "Foto publicada com autorização da paciente. Resultados variam de pessoa para pessoa."
const casos = (ctx: SchemaContext) =>
  z
    .array(
      z.object({
        antes: z.object({ src: ctx.image(), alt: z.string(), rotulo: z.string().default('Antes') }),
        depois: z.object({ src: ctx.image(), alt: z.string(), rotulo: z.string().default('Depois') }).optional(),
        legenda: z.string().optional(),
      }),
    )
    .default([]);

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
  schema: (ctx) =>
    z.object({
      ...seo,
      nome: z.string(), // nome curto do serviço, ex. "Microagulhamento"
      resumo: z.string(), // 1 a 2 frases para os cartões e para o llms.txt
      tipo: z.enum(['servico', 'grupo']).default('servico'), // "grupo" = página que reúne outros (Peelings)
      categoria: z.string(), // ex. "Tratamento facial", "Peeling químico"
      outrosNomes: z.array(z.string()).default([]), // sinônimos que as pessoas buscam
      indicacoes: z.array(z.string()).default([]), // lista curta "para quem é indicado"
      duracao: z.string().optional(), // ficha técnica, só quando o texto diz, ex. "1h a 1h30"
      sessoes: z.string().optional(), // ficha técnica, só quando o texto diz, ex. "A cada 15 dias, se precisar de mais de uma"
      ordem: z.number().default(100),
      mensagemWhatsApp: z.string().optional(), // se vazio, usa "Olá, Iasmim! Quero agendar <nome>."
      relacionados: z.array(z.string()).default([]), // ids de outros serviços, ex. "peeling/peeling-para-melasma"
      // Preço publicado. Sem este campo, o site mostra "valor definido na avaliação".
      // Ex.: { valor: 249.9 } → "R$ 249,90"; { valor: 480, aPartirDe: true } → "a partir de R$ 480"
      preco: z
        .object({
          valor: z.number().positive(),
          aPartirDe: z.boolean().default(false), // true = preço mínimo, depende da avaliação
          detalhe: z.string().optional(), // o que o valor inclui, ex. "três áreas, com retorno incluso"
        })
        .optional(),
      imagem: foto(ctx).optional(),
      casos: casos(ctx),
      casosNota: z.string().optional(), // observação extra sobre as fotos (ex. condições de luz)
      faq: faq.default([]),
    }),
});

const paginas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/paginas' }),
  schema: (ctx) =>
    z.object({
      ...seo,
      resumo: z.string().optional(),
      imagem: foto(ctx).optional(),
      faq: faq.default([]),
    }),
});

export const collections = { servicos, paginas };
