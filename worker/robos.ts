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

/** Classe e nome do robô a partir do User-Agent ("pessoa" e nome vazio quando não é robô) */
export function classificar(ua: string): { classe: Classe; robo: string } {
  const minusculo = ua.toLowerCase();
  for (const [classe, nomes] of ROBOS) {
    const robo = nomes.find((n) => minusculo.includes(n.toLowerCase()));
    if (robo) return { classe, robo };
  }
  if (!ua.trim()) return { classe: 'outro-robo', robo: '(sem User-Agent)' };
  const m = ua.match(GENERICO);
  return m ? { classe: 'outro-robo', robo: m[0] } : { classe: 'pessoa', robo: '' };
}
