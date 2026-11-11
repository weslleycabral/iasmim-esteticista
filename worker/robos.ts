// Lista de robôs do log de acessos (METRICAS.md 1.1; usada por worker/index.ts). Único lugar a editar quando surgir um robô novo.
// Cada nome é procurado como trecho do User-Agent, sem diferenciar maiúsculas. A ordem importa: a
// primeira classe que bater vence (por isso "Applebot-Extended" vem antes de "Applebot").
// Google-Extended não aparece como User-Agent: o Google coleta para o Gemini com o próprio Googlebot.

export type Classe = 'ia-busca' | 'ia-treino' | 'buscador' | 'preview' | 'monitor' | 'outro-robo' | 'pessoa';

export const ROBOS: [Classe, string[]][] = [
  // acesso em tempo real porque alguém fez uma pergunta à IA (o sinal mais valioso)
  ['ia-busca', ['ChatGPT-User', 'OAI-SearchBot', 'Claude-User', 'Claude-SearchBot', 'Perplexity-User', 'PerplexityBot', 'DuckAssistBot', 'MistralAI-User', 'Meta-ExternalFetcher']],
  // coleta para treinar modelos
  ['ia-treino', ['GPTBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Applebot-Extended', 'Meta-ExternalAgent', 'Bytespider', 'Amazonbot', 'cohere-ai', 'Diffbot', 'YouBot']],
  // Googlebot também alimenta o Gemini e o Modo IA; Bingbot, o Copilot e parte do ChatGPT
  ['buscador', ['Googlebot', 'Google-InspectionTool', 'GoogleOther', 'bingbot', 'Applebot', 'YandexBot', 'DuckDuckBot', 'Baiduspider']],
  // prévia de link compartilhado (mostra quando alguém mandou o site para outra pessoa)
  ['preview', ['WhatsApp', 'facebookexternalhit', 'Twitterbot', 'TelegramBot', 'Slackbot', 'LinkedInBot', 'Discordbot']],
  ['monitor', ['Netlify', 'UptimeRobot', 'Chrome-Lighthouse', 'Lighthouse', 'PageSpeed', 'Pingdom', 'StatusCake']],
];

// Qualquer outro robô: nome com bot/crawler/spider, ferramentas de linha de comando e navegadores sem tela
const GENERICO = /[\w.-]*(?:bot|crawler|spider)[\w.-]*|\b(?:curl|wget|python[\w.-]*|headless\w*|go-http-client|okhttp|node-fetch|axios|java|libwww-perl|scrapy)\b/i;

// Varredura atrás de falhas (WordPress, PHP, .env): o mesmo padrão do relatório (plugin acessos, VARREDURA)
export const VARREDURA = /wp-|wordpress|xmlrpc|\.php|\.env|\.git|\/admin|\/cgi-bin|\.aspx?$|\.sql|\.bak|\/vendor\/|\/\.well-known\/(?!security)/i;

// User-Agent de navegador falsificado com erro de digitação (scanners copiam uns dos outros)
const FALSO = /Mozlila|Moblie|Bulid\/|Mozila\/|Mozzila/;

// Redes de datacenter (request.cf.asOrganization): navegador "de verdade" vindo daqui é robô.
// Fora de propósito: Cloudflare, Akamai e Fastly, que também levam gente de verdade (iCloud Private Relay, WARP).
const DATACENTER = /amazon|aws|google cloud|google llc|microsoft|azure|digitalocean|ovh|hetzner|linode|oracle|alibaba|tencent|huawei cloud|vultr|choopa|contabo|leaseweb|m247|scaleway|hostinger|datacamp|zenlayer|psychz|hostroyale|kamatera|ionos|godaddy|servers\.com|colocrossing|clouvider|netcup|serverion|hostpapa|locaweb|uol diveo|magalu cloud/i;

/** Classe e nome do robô a partir do User-Agent, do caminho pedido e da rede de origem ("pessoa" e nome vazio
 *  quando não é robô). Caminho e rede são opcionais: sem eles, só o User-Agent conta (registros antigos). */
export function classificar(ua: string, caminho = '', rede = ''): { classe: Classe; robo: string } {
  const minusculo = ua.toLowerCase();
  for (const [classe, nomes] of ROBOS) {
    const robo = nomes.find((n) => minusculo.includes(n.toLowerCase()));
    if (robo) return { classe, robo };
  }
  if (!ua.trim()) return { classe: 'outro-robo', robo: '(sem User-Agent)' };
  const m = ua.match(GENERICO);
  if (m) return { classe: 'outro-robo', robo: m[0] };
  if (FALSO.test(ua)) return { classe: 'outro-robo', robo: '(navegador falso)' };
  if (VARREDURA.test(caminho)) return { classe: 'outro-robo', robo: '(varredura)' };
  if (rede && DATACENTER.test(rede)) return { classe: 'outro-robo', robo: `(datacenter: ${rede})` };
  return { classe: 'pessoa', robo: '' };
}
