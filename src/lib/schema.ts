// Dados estruturados (JSON-LD, schema.org). Tudo sai de src/data/negocio.json e dos .md.
// Um único @graph por página (montado no Base.astro), com @id estáveis que ligam os nós:
//   WebSite #site ← publisher → BeautySalon #negocio ← founder/employee → Person #iasmim
//   WebPage #webpage → about/mainEntity (negócio, pessoa, serviço…), breadcrumb, primaryImageOfPage
//   Service <url>#servico → provider #negocio; FAQPage <url>#faq; BreadcrumbList <url>#breadcrumb
// Regras do projeto: sem AggregateRating/Review (avaliações da própria empresa); preço (Offer) só onde
// há preço publicado no .md; FAQ e migalhas com o MESMO texto que aparece na página (o check-dist confere).
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';
import { negocio, SITE, abs, servicoPath, type Servico } from './site';
import fotoIasmim from '../assets/fotos/iasmim-estudio-6871.webp';

export const ID = {
  negocio: `${SITE}/#negocio`,
  pessoa: `${SITE}/#iasmim`,
  site: `${SITE}/#site`,
  faceo: `${SITE}/#faceo`,
  catalogo: `${SITE}/#catalogo`,
  logo: `${SITE}/#logo`,
  fotoIasmim: `${SITE}/#foto-iasmim`,
  annaPegova: `${SITE}/produtos/anna-pegova/#marca`,
  revendaAnnaPegova: `${SITE}/produtos/anna-pegova/#revenda`,
};

/** Logo quadrado (512×512) em public/: mesmo desenho do favicon */
export const LOGO = '/logo-iasmim-esteticista.webp';

const cidades = negocio.areaAtendida.map((c) => ({
  '@type': 'City',
  name: c.nome,
  containedInPlace: { '@type': 'State', name: 'Ceará' },
  sameAs: c.wikipedia,
}));

export const areaServed = cidades;

/** Foto otimizada (WebP, até 1200 px) como ImageObject com URL absoluta */
export async function fotoLd(src: ImageMetadata, alt: string, id: string) {
  const largura = Math.min(1200, src.width);
  const o = await getImage({ src, format: 'webp', width: largura });
  return {
    '@type': 'ImageObject',
    '@id': id,
    contentUrl: abs(o.src),
    url: abs(o.src),
    encodingFormat: 'image/webp',
    width: largura,
    height: Math.round((largura * src.height) / src.width),
    caption: alt,
    copyrightHolder: { '@id': ID.negocio },
  };
}

/** Nós de imagem comuns a todas as páginas: logo e foto da Iasmim (usados pelo negócio e pela pessoa) */
export async function imagensBase() {
  return [
    {
      '@type': 'ImageObject',
      '@id': ID.logo,
      contentUrl: abs(LOGO),
      url: abs(LOGO),
      encodingFormat: 'image/webp',
      width: 512,
      height: 512,
      caption: `Logo da ${negocio.nome}`,
    },
    await fotoLd(fotoIasmim, `${negocio.profissional}, esteticista da ${negocio.nome}, em Juazeiro do Norte (CE)`, ID.fotoIasmim),
  ];
}

export function website() {
  return {
    '@type': 'WebSite',
    '@id': ID.site,
    url: `${SITE}/`,
    name: negocio.nome,
    alternateName: new URL(SITE).hostname,
    description: `Site da ${negocio.nome}, espaço de estética facial da esteticista ${negocio.profissional} em ${negocio.endereco.cidade} (${negocio.endereco.uf}).`,
    inLanguage: 'pt-BR',
    publisher: { '@id': ID.negocio },
    about: { '@id': ID.negocio },
  };
}

export function pessoa() {
  const pos = negocio.formacao[1];
  return {
    '@type': 'Person',
    '@id': ID.pessoa,
    name: negocio.profissional,
    jobTitle: 'Esteticista e cosmetóloga',
    description: `${negocio.profissional} é ${negocio.cargo.toLowerCase()} com pós-graduação em Harmonização Facial e atende na ${negocio.nome}, em Juazeiro do Norte (CE).`,
    url: abs('/sobre/'),
    image: { '@id': ID.fotoIasmim },
    sameAs: [negocio.youtube],
    worksFor: { '@id': ID.negocio },
    workLocation: { '@id': ID.negocio },
    knowsLanguage: 'pt-BR',
    alumniOf: {
      '@type': 'CollegeOrUniversity',
      '@id': ID.faceo,
      name: pos.instituicao,
      url: pos.instituicaoUrl,
      address: {
        '@type': 'PostalAddress',
        addressLocality: pos.instituicaoCidade,
        addressRegion: pos.instituicaoUf,
        addressCountry: 'BR',
      },
    },
    hasCredential: [
      {
        '@type': 'EducationalOccupationalCredential',
        name: negocio.formacao[0].titulo,
        credentialCategory: negocio.formacao[0].categoria,
      },
      {
        '@type': 'EducationalOccupationalCredential',
        name: pos.titulo,
        credentialCategory: pos.categoria,
        educationalLevel: 'Especialização',
        about: 'Harmonização Facial',
        recognizedBy: { '@id': ID.faceo },
        dateCreated: pos.emissao,
      },
    ],
    knowsAbout: [
      'Estética facial',
      'Cosmetologia',
      'Harmonização facial',
      'Limpeza de pele',
      'Peeling químico',
      'Melasma',
      'Acne',
      'Microagulhamento',
      'Toxina botulínica',
      'Preenchimento labial',
      'Ultrassom microfocado (HIFU)',
      'Eletrocauterização estética',
      'Jato de plasma',
    ],
  };
}

export function negocioLd(servicos: Servico[]) {
  return {
    // Tipo mais específico do schema.org para estética (subtipo de HealthAndBeautyBusiness); a categoria
    // principal no Google é "Esteticista" (gcid:beautician), sem equivalente mais específico no schema.org.
    '@type': 'BeautySalon',
    '@id': ID.negocio,
    name: negocio.nome,
    description: `${negocio.nome} é o espaço de estética facial de ${negocio.profissional}, ${negocio.cargo.toLowerCase()} com pós-graduação em Harmonização Facial, no bairro Salesianos, em Juazeiro do Norte (CE). Atende Juazeiro do Norte, Crato e Barbalha com limpeza de pele, peelings, microagulhamento, botox, preenchimento labial, Herus HIFU e remoção de sinais e verrugas com jato de plasma e eletrocautério, e revende a linha Anna Pegova.`,
    url: `${SITE}/`,
    logo: { '@id': ID.logo },
    image: [{ '@id': ID.fotoIasmim }],
    telephone: negocio.telefoneE164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${negocio.endereco.rua} - ${negocio.endereco.bairro}`,
      addressLocality: negocio.endereco.cidade,
      addressRegion: negocio.endereco.uf,
      postalCode: negocio.endereco.cep,
      addressCountry: negocio.endereco.pais,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: negocio.geo.lat,
      longitude: negocio.geo.lng,
    },
    // Perfil no Google Maps (CID do Perfil da Empresa): liga o site à ficha do Google
    hasMap: negocio.googleMaps,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: negocio.horario.dias,
        opens: negocio.horario.abre,
        closes: negocio.horario.fecha,
      },
    ],
    priceRange: '$$',
    paymentAccepted: negocio.pagamento.formas.join(', '),
    currenciesAccepted: 'BRL',
    sameAs: [negocio.instagram, negocio.facebook, negocio.googleMaps],
    areaServed,
    founder: { '@id': ID.pessoa },
    employee: { '@id': ID.pessoa },
    knowsLanguage: 'pt-BR',
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      '@id': ID.catalogo,
      name: `Serviços da ${negocio.nome}`,
      itemListElement: [
        ...servicos.map((s) => ({
          '@type': 'Offer',
          ...precoLd(s),
          itemOffered: {
            '@type': 'Service',
            '@id': `${abs(servicoPath(s.id))}#servico`,
            name: s.data.nome,
            url: abs(servicoPath(s.id)),
          },
        })),
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            '@id': ID.revendaAnnaPegova,
            name: 'Revenda Anna Pegova',
            url: abs('/produtos/anna-pegova/'),
          },
        },
      ],
    },
  };
}

/**
 * Preço do serviço para o Offer: valor fixo → price + priceCurrency;
 * "a partir de" → priceSpecification com minPrice. Sem preço publicado → nada.
 */
export function precoLd(s: Servico) {
  const p = s.data.preco;
  if (!p) return {};
  const valor = p.valor.toFixed(2);
  return p.aPartirDe
    ? {
        priceSpecification: { '@type': 'PriceSpecification', minPrice: valor, priceCurrency: 'BRL' },
        description: p.detalhe,
      }
    : { price: valor, priceCurrency: 'BRL', description: p.detalhe };
}

export function servicoLd(s: Servico) {
  const url = abs(servicoPath(s.id));
  return {
    '@type': 'Service',
    '@id': `${url}#servico`,
    name: s.data.nome,
    alternateName: s.data.outrosNomes.length ? s.data.outrosNomes : undefined,
    serviceType: s.data.categoria,
    description: s.data.resumo,
    url,
    provider: { '@id': ID.negocio },
    areaServed,
    offers: s.data.preco
      ? { '@type': 'Offer', ...precoLd(s), url, offeredBy: { '@id': ID.negocio } }
      : undefined,
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: url,
      servicePhone: { '@type': 'ContactPoint', telephone: negocio.telefoneE164, contactType: 'agendamento' },
      serviceLocation: { '@id': ID.negocio },
    },
  };
}

/** Página /produtos/anna-pegova/: a marca e a revenda (Service, sem Product: não há preço publicado,
 *  e Product sem offers/review é inválido para o Google). */
export function annaPegovaLd(descricao: string) {
  const url = abs('/produtos/anna-pegova/');
  return [
    { '@type': 'Brand', '@id': ID.annaPegova, name: 'Anna Pegova', url: 'https://www.annapegova.com.br/' },
    {
      '@type': 'Service',
      '@id': ID.revendaAnnaPegova,
      name: 'Revenda Anna Pegova',
      alternateName: ['Produtos Anna Pegova', 'Anna Pegova em Juazeiro do Norte', 'Linha completa Anna Pegova'],
      serviceType: 'Revenda de cosméticos para cuidados com a pele',
      category: 'Cosméticos para cuidados com a pele',
      description: descricao,
      url,
      brand: { '@id': ID.annaPegova },
      provider: { '@id': ID.negocio },
      areaServed,
      availableChannel: {
        '@type': 'ServiceChannel',
        serviceUrl: url,
        servicePhone: { '@type': 'ContactPoint', telephone: negocio.telefoneE164, contactType: 'vendas' },
        serviceLocation: { '@id': ID.negocio },
      },
    },
  ];
}

export function faqLd(url: string, faq: { pergunta: string; resposta: string }[]) {
  if (!faq.length) return null;
  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.pergunta,
      acceptedAnswer: { '@type': 'Answer', text: f.resposta },
    })),
  };
}

export type Migalha = { nome: string; path: string };

export function breadcrumbLd(url: string, migalhas: Migalha[]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: migalhas.map((m, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: m.nome,
      item: abs(m.path),
    })),
  };
}

export function webpageLd(opts: {
  url: string;
  titulo: string;
  descricao: string;
  atualizado?: Date;
  sobre?: string; // @id da entidade principal da página
  tipo?: string;
  temBreadcrumb?: boolean;
  imagem?: string; // @id do ImageObject principal da página
}) {
  return {
    '@type': opts.tipo ?? 'WebPage',
    '@id': `${opts.url}#webpage`,
    url: opts.url,
    name: opts.titulo,
    description: opts.descricao,
    inLanguage: 'pt-BR',
    isPartOf: { '@id': ID.site },
    about: opts.sobre ? { '@id': opts.sobre } : undefined,
    mainEntity: opts.sobre ? { '@id': opts.sobre } : undefined,
    breadcrumb: opts.temBreadcrumb ? { '@id': `${opts.url}#breadcrumb` } : undefined,
    primaryImageOfPage: opts.imagem ? { '@id': opts.imagem } : undefined,
    dateModified: opts.atualizado ? opts.atualizado.toISOString().slice(0, 10) : undefined,
  };
}
