// Link curto e reutilizável do WhatsApp: /whatsapp?msg=<mensagem>&ref=<origem>
// Serve onde o destino não aceita ?text= (ex.: campo de chat do Perfil da Empresa no Google) e em qualquer
// link novo (posts, diretórios, QR code) sem criar rota nova. O acesso entra no log como /whatsapp?...
// (a função "acessos" roda antes e registra o 302). 302 de propósito: não ficar em cache.
// - msg: texto da mensagem. Sem ele, usa a mensagem padrão.
// - ref: origem, vira o sufixo "(ref. <origem>)" que o site já usa nas mensagens. Ex.: ref=perfil · google-gmn
import type { Config } from '@netlify/edge-functions';

const WHATSAPP = '5588999890590';
const MSG_PADRAO = 'Olá, Iasmim! Quero agendar um horário.';
const limpar = (v: string | null, max: number) => (v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export default (req: Request) => {
  const q = new URL(req.url).searchParams;
  const ref = limpar(q.get('ref'), 60);
  const texto = `${limpar(q.get('msg'), 300) || MSG_PADRAO}${ref ? ` (ref. ${ref})` : ''}`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`,
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
};

export const config: Config = { path: '/whatsapp' };
