// Dados estruturados (JSON-LD, schema.org). Tudo sai de src/data/negocio.json e dos .md.
import { negocio, SITE, abs, servicoPath, type Servico } from './site';

export const ID = {
  negocio: `${SITE}/#negocio`,
  pessoa: `${SITE}/#iasmim`,
  site: `${SITE}/#site`,
  faceo: `${SITE}/#faceo`,
  catalogo: `${SITE}/#catalogo`,
  annaPegova: `${SITE}/produtos/anna-pegova/#marca`,
};

const cidades = negocio.areaAtendida.map((c) => ({
  '@type': 'City',
  name: c.nome,
  containedInPlace: { '@type': 'State', name: 'Ceará' },
  sameAs: c.wikipedia,
}));

export const areaServed = cidades;

export function website() {
  return {
    '@type': 'WebSite',
    '@id': ID.site,
    url: `${SITE}/`,
    name: negocio.nome,
    inLanguage: 'pt-BR',
    publisher: { '@id': ID.negocio },
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
    worksFor: { '@id': ID.negocio },
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
      'Microagulhamento',
      'Toxina botulínica',
      'Ultrassom microfocado (HIFU)',
      'Preenchimento labial',
      'Eletrocauterização estética',
      'Jato de plasma',
    ],
  };
}

export function negocioLd(servicos: Servico[]) {
  return {
    '@type': 'BeautySalon',
    '@id': ID.negocio,
    name: negocio.nome,
    description: `${negocio.nome} é o espaço de estética facial de ${negocio.profissional}, ${negocio.cargo.toLowerCase()} com pós-graduação em Harmonização Facial, no bairro Salesianos, em Juazeiro do Norte (CE). Atende Juazeiro do Norte, Crato e Barbalha com limpeza de pele, peelings, microagulhamento, botox, preenchimento labial, Herus HIFU e remoção de sinais e verrugas com jato de plasma e eletrocautério, e revende a linha Anna Pegova.`,
    url: `${SITE}/`,
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
    hasMap: `https://www.google.com/maps/search/?api=1&query=${negocio.geo.lat},${negocio.geo.lng}`,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: negocio.horario.dias,
        opens: negocio.horario.abre,
        closes: negocio.horario.fecha,
      },
    ],
    paymentAccepted: negocio.pagamento.formas.join(', '),
    currenciesAccepted: 'BRL',
    sameAs: [negocio.instagram, negocio.facebook],
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
            '@type': 'Product',
            '@id': `${abs('/produtos/anna-pegova/')}#produtos`,
            name: 'Linha completa Anna Pegova',
            url: abs('/produtos/anna-pegova/'),
            brand: { '@type': 'Brand', '@id': ID.annaPegova, name: 'Anna Pegova' },
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
    dateModified: opts.atualizado ? opts.atualizado.toISOString().slice(0, 10) : undefined,
  };
}
