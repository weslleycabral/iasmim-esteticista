// Script único do site (carregado uma vez pelo Base.astro; o Astro empacota como módulo).
// Portado da lógica V9 do canvas (design/paginas-3c/*.dc.html):
//  1. reveals .rv/.mk por IntersectionObserver (classe .in, uma vez só)
//  2. rolagem com inércia só para roda de mouse; âncoras (#secao) rolam suave
//  3. odômetro do número da edição (Edicao.astro), guardado em localStorage "iasmim-edicao"
//  4. menu <details> do celular fecha ao escolher um link, ao tocar fora e com Esc
//  5. métricas (METRICAS.md 1.3, 1.4 e 1.6): eventos do GA4, origem da visita no WhatsApp e Web Vitals

import { whatsapp, endereco } from '../data/negocio.json';

const mm = (q: string) => (window.matchMedia ? window.matchMedia(q) : ({ matches: false } as MediaQueryList));
const reduz = mm('(prefers-reduced-motion: reduce)');
const fino = mm('(hover: hover) and (pointer: fine)');
const root = document.documentElement;
(window as unknown as { iasmimPronto: boolean }).iasmimPronto = true;
root.classList.add('js'); // já posto no <head>; garante caso o inline falhe

/* 1. reveals */
function reveals() {
  const els = document.querySelectorAll<HTMLElement>('.rv:not(.in), .mk:not(.in)');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver(
    (ents) => {
      let k = 0;
      for (const en of ents) {
        if (!(en.isIntersecting || en.boundingClientRect.top < 0)) continue;
        const el = en.target as HTMLElement;
        // escalonamento leve entre itens que entram juntos (se o CSS não definiu atraso próprio)
        if (k > 0 && k < 6 && getComputedStyle(el).animationDelay === '0s') el.style.animationDelay = `${k * 90}ms`;
        k += 1;
        el.classList.add('in');
        io.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -15% 0px', threshold: 0 },
  );
  els.forEach((el) => io.observe(el));

  // Foto lazy dentro de um .mk: enquanto a máscara (clip-path) esconde tudo, o Chromium não começa a
  // baixar a imagem, e ela só chega depois que a máscara já abriu (caixa vazia). Quando o bloco
  // chega perto da tela, as fotos dele passam a eager e carregam antes da revelação.
  const comFoto = [...els].filter((el) => el.querySelector('img[loading="lazy"]'));
  if (!comFoto.length) return;
  const perto = new IntersectionObserver(
    (ents) => {
      for (const en of ents) {
        if (!en.isIntersecting) continue;
        en.target.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
        perto.unobserve(en.target);
      }
    },
    { rootMargin: '1000px 0px' },
  );
  comFoto.forEach((el) => perto.observe(el));
}

/* 2. rolagem com inércia (lerp 0,1) só para roda de mouse em desktop */
const sc = { on: false, cur: 0, tgt: 0, raf: 0 };
const topo = () => window.scrollY || root.scrollTop || 0;
const maxTopo = () => Math.max(0, root.scrollHeight - window.innerHeight);
const ir = (v: number) => window.scrollTo({ top: v, behavior: 'instant' as ScrollBehavior });

function passo() {
  sc.raf = requestAnimationFrame(() => {
    sc.cur += (sc.tgt - sc.cur) * 0.1;
    if (Math.abs(sc.tgt - sc.cur) < 0.5) {
      sc.cur = sc.tgt;
      ir(sc.cur);
      sc.on = false;
      return;
    }
    ir(sc.cur);
    passo();
  });
}
function parar() {
  if (sc.on) {
    cancelAnimationFrame(sc.raf);
    sc.on = false;
  }
}

function roda(e: WheelEvent) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;
  if (reduz.matches || !fino.matches) return;
  const ae = document.activeElement as HTMLElement | null;
  if (ae && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable)) return;
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 40;
  else if (e.deltaMode === 2) dy *= window.innerHeight;
  else if (Math.abs(dy) < 40 || dy !== Math.round(dy)) return; // trackpad: fica nativo
  if (Math.abs(e.deltaX) > Math.abs(dy)) return;
  // dentro de algo que rola por conta própria: deixa o navegador cuidar
  let t = e.target as HTMLElement | null;
  while (t && t !== document.body && t.nodeType === 1) {
    if (t.scrollHeight > t.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(t).overflowY)) return;
    t = t.parentElement;
  }
  const max = maxTopo();
  if (max <= 0) return;
  e.preventDefault();
  if (!sc.on) sc.cur = sc.tgt = topo();
  sc.tgt = Math.min(max, Math.max(0, sc.tgt + dy));
  if (!sc.on) {
    sc.on = true;
    passo();
  }
}

// se outra coisa rolou a página (teclado, barra, âncora), solta a inércia
function aoRolar() {
  if (sc.on && Math.abs(topo() - sc.cur) > 2) parar();
}

// âncoras na mesma página: rolagem suave e foco no destino (para teclado e leitor de tela)
function ancora(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const a = (e.target as Element | null)?.closest?.('a[href*="#"]') as HTMLAnchorElement | null;
  if (!a) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
  const id = decodeURIComponent(url.hash.slice(1));
  const alvo = id ? document.getElementById(id) : null;
  if (!alvo) return;
  e.preventDefault();
  parar();
  a.closest('details[open]')?.removeAttribute('open');
  alvo.scrollIntoView({ behavior: reduz.matches ? 'auto' : 'smooth', block: 'start' });
  if (!alvo.matches('a, button, input, select, textarea, summary, [tabindex]')) alvo.setAttribute('tabindex', '-1');
  alvo.focus({ preventScroll: true });
  try {
    history.pushState(null, '', `#${id}`);
  } catch {}
}

/* 3. odômetro: o build grava o total de avaliações (negocio.json); o navegador lembra o último
   número visto e, se o atual for maior, gira os algarismos que mudaram. Nunca diminui. */
const CHAVE = 'iasmim-edicao';
function ler(): number | null {
  try {
    const s = localStorage.getItem(CHAVE);
    if (s === null) return null;
    const n = parseInt(s, 10);
    return n >= 0 ? n : null;
  } catch {
    return null;
  }
}
function gravar(v: number) {
  try {
    const s = localStorage.getItem(CHAVE);
    const n = s === null ? -1 : parseInt(s, 10);
    if (!(n >= v)) localStorage.setItem(CHAVE, String(v));
  } catch {}
}

// posiciona cada faixa no algarismo (sem animar) e garante células suficientes
function posicionar(odo: HTMLElement, alvos: number[], comTransicao: boolean, duracoes?: string[]) {
  const faixas = odo.querySelectorAll<HTMLElement>('.odo-s');
  faixas.forEach((s, i) => {
    const pos = alvos[i];
    while (s.children.length < pos + 1) {
      const c = document.createElement('span');
      c.className = 'odo-c';
      c.textContent = String(s.children.length % 10);
      s.appendChild(c);
    }
    s.style.transitionDuration = comTransicao ? (duracoes?.[i] ?? '1.2s') : '0s';
    s.style.transform = `translateY(-${pos * 100}%)`;
  });
}

function odometro() {
  const odos = [...document.querySelectorAll<HTMLElement>('[data-odo]')];
  if (!odos.length) return;
  const atual = parseInt(odos[0].dataset.odo ?? '', 10);
  if (!(atual >= 0)) return;
  const visto = ler();
  if (visto === null || visto === atual) {
    gravar(atual);
    return;
  }
  const a = String(visto);
  const b = String(atual);
  if (a.length !== b.length) {
    // mudou o número de algarismos (ex. 999 → 1000): mostra o atual sem animar
    gravar(Math.max(visto, atual));
    return;
  }
  if (visto > atual) {
    // nunca diminui: mostra o maior já visto
    for (const odo of odos) {
      odo.querySelector('.odo-n')!.textContent = a;
      posicionar(odo, a.split('').map(Number), false);
    }
    return;
  }
  // atual > visto: começa no visto e gira até o atual
  const n = b.length;
  const fim: number[] = [];
  const dur: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = n - 1 - i; // 0 = algarismo da direita
    const voltas = a[i] === b[i] ? 0 : p === 0 ? 2 : p === 1 ? 1 : 0;
    fim.push(Number(a[i]) + ((Number(b[i]) - Number(a[i]) + 10) % 10) + 10 * voltas);
    dur.push(p === 0 ? '1.4s' : p === 1 ? '1.2s' : '1s');
  }
  for (const odo of odos) posicionar(odo, a.split('').map(Number), false);
  if (reduz.matches) {
    for (const odo of odos) posicionar(odo, b.split('').map(Number), false);
    gravar(atual);
    return;
  }
  void root.offsetHeight; // aplica a posição inicial antes de animar
  setTimeout(() => {
    for (const odo of odos) posicionar(odo, fim, true, dur);
    setTimeout(() => gravar(atual), 1500);
  }, 600);
}

/* 4. menu do celular: fecha ao tocar num link, ao tocar fora dele e com Esc (o foco volta ao "Menu") */
function menu() {
  document.querySelectorAll<HTMLDetailsElement>('details.menu').forEach((d) => {
    d.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a')) d.removeAttribute('open');
    });
    document.addEventListener('click', (e) => {
      if (d.open && !d.contains(e.target as Node)) d.removeAttribute('open');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !d.open) return;
      d.removeAttribute('open');
      d.querySelector('summary')?.focus();
    });
  });
}

/* 5. métricas. Os eventos vão para o GA4 (gtag, no <head> do Base.astro), que só existe em
   iasmimesteticista.com.br e some com ?nao-contar ou a recusa em /privacidade/. Os links marcam o evento no HTML:
   data-evento="whatsapp|ligar|rota|instagram|google-perfil|copia" e data-posicao="topo|hero|fim|…"
   (o scripts/check-dist.mjs confere); data-servico vem do link ou do <body>. Um único listener de
   clique, delegado, cuida de todos; os outros eventos vêm de rolagem, tempo, cópia e <details>. */
type Dados = Record<string, string | number>;
const pagina = location.pathname;

function evento(nome: string, dados: Dados = {}) {
  const limpos = Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== '')) as Dados;
  // o gtag do <head> põe na fila (dataLayer) o que chegar antes de o script do Google carregar
  (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.('event', nome, limpos);
}

// Origem da visita (primeiro toque): UTM ou referência normalizada, guardada na sessão inteira.
// Vai no sufixo da mensagem do WhatsApp para a Iasmim saber de onde a cliente veio sem perguntar.
const ORIGENS: [RegExp, string][] = [
  [/(^|\.)(chatgpt\.com|chat\.openai\.com|openai\.com)$/, 'chatgpt'],
  [/^(gemini|bard)\.google\./, 'gemini'],
  [/(^|\.)perplexity\.ai$/, 'perplexity'],
  [/^copilot\.microsoft\.com$/, 'copilot'],
  [/(^|\.)claude\.ai$/, 'claude'],
  [/^maps\.google\.|^maps\.app\.goo\.gl$/, 'maps'],
  [/(^|\.)google\.[a-z.]+$|googlequicksearchbox/, 'google'],
  [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)facebook\.com$|^fb\.me$/, 'facebook'],
  [/(^|\.)duckduckgo\.com$/, 'duckduckgo'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
];
const curto = (s: string) => s.toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
function normalizar(fonte: string, caminho = '') {
  const host = fonte.toLowerCase().replace(/^android-app:\/\//, '').replace(/^www\./, '');
  if (/^google\./.test(host) && caminho.startsWith('/maps')) return 'maps';
  return ORIGENS.find(([re]) => re.test(host))?.[1] ?? curto(host);
}
function calcularOrigem() {
  const q = new URLSearchParams(location.search);
  const fonte = q.get('utm_source');
  if (fonte) {
    const meio = curto(q.get('utm_medium') ?? '');
    return normalizar(fonte) + (meio ? `-${meio}` : ''); // "google-gmn", "instagram-bio"
  }
  if (q.has('gclid')) return 'google-ads';
  try {
    const ref = new URL(document.referrer);
    if (ref.hostname !== location.hostname) return normalizar(ref.hostname, ref.pathname);
  } catch {}
  return q.has('fbclid') ? 'meta' : 'direto';
}
const CHAVE_ORIGEM = 'iasmim-origem';
const origem = (() => {
  try {
    const salva = sessionStorage.getItem(CHAVE_ORIGEM);
    if (salva) return salva;
    const o = calcularOrigem();
    sessionStorage.setItem(CHAVE_ORIGEM, o);
    return o;
  } catch {
    return calcularOrigem();
  }
})();

// "(ref. limpeza · google)" no fim da mensagem pronta (troca o sufixo anterior, se houver). Sem JS, a
// mensagem sai como está no HTML. Sem serviço na página, vale o nome da página ("inicio", "contato").
function comRef(a: HTMLAnchorElement, servico: string) {
  const url = new URL(a.href);
  const texto = (url.searchParams.get('text') ?? '').replace(/\s*\(ref\. [^)]*\)$/, '');
  const nome = document.body.dataset.pagina ?? (pagina.split('/').filter(Boolean).at(-1) || 'inicio');
  const ref = `(ref. ${servico || nome} · ${origem})`;
  a.href = `${url.origin}${url.pathname}?text=${encodeURIComponent(`${texto} ${ref}`.trim())}`;
}

// posição de um link sem data-posicao: a do bloco que o contém ou a região da página
const posicaoDe = (el: Element) =>
  el.closest<HTMLElement>('[data-posicao]')?.dataset.posicao ??
  (el.closest('.menu') ? 'menu' : el.closest('header') ? 'topo' : el.closest('footer') ? 'rodape' : el.closest('[aria-label="Você está em"]') ? 'migalha' : 'corpo');

// escolhas do montador de pedido (página Anna Pegova): botões aria-pressed de cada grupo
function escolhas(pedido: HTMLElement): Dados {
  const de = (g: string) => pedido.querySelector<HTMLElement>(`[data-grupo="${g}"] [aria-pressed="true"]`)?.dataset.valor ?? 'nenhuma';
  return { pele: de('pele'), objetivo: de('meta') };
}

let fotoTocada = false;
function aoClicar(e: MouseEvent) {
  const alvo = e.target as Element | null;
  if (!alvo?.closest) return;
  if (!fotoTocada && alvo.closest('[data-foto-caso]')) {
    fotoTocada = true;
    evento('foto-caso', { pagina, acao: 'toque' });
  }
  const el = alvo.closest<HTMLElement>('[data-evento], a[href]');
  if (!el) return;
  const tipo = el.dataset.evento;
  if (tipo === 'copia') return evento('copia', { pagina, tipo: el.dataset.tipo ?? 'outro' });
  if (tipo) {
    const dados: Dados = { pagina, posicao: el.dataset.posicao ?? posicaoDe(el) };
    if (tipo === 'whatsapp' && el instanceof HTMLAnchorElement) {
      dados.servico = el.dataset.servico ?? document.body.dataset.servico ?? '';
      dados.origem = origem;
      comRef(el, String(dados.servico));
      const pedido = el.closest<HTMLElement>('[data-pedido]');
      if (pedido) evento(`pedido-${pedido.dataset.pedido}`, escolhas(pedido));
    }
    return evento(tipo, dados);
  }
  const url = new URL((el as HTMLAnchorElement).href, location.href);
  if (!/^https?:$/.test(url.protocol)) return;
  if (url.origin !== location.origin) evento('externo', { url: url.origin + url.pathname });
  else if (url.pathname !== pagina) evento('link-interno', { de: pagina, para: url.pathname, posicao: posicaoDe(el) });
}

// <details>: pergunta do FAQ aberta e menu do celular aberto (toggle não borbulha: captura)
function aoAbrir(e: Event) {
  const d = e.target;
  if (!(d instanceof HTMLDetailsElement) || !d.open) return;
  if (d.classList.contains('menu')) evento('menu', { pagina });
  else if (d.closest('.faq')) evento('faq', { pagina, pergunta: (d.querySelector('summary')?.textContent ?? '').trim().slice(0, 150) });
}

// texto copiado à mão: só o tipo, nunca o texto
const digitosTel = whatsapp.slice(-9);
function aoCopiar() {
  const t = String(window.getSelection() ?? '');
  const tipo = t.replace(/\D/g, '').includes(digitosTel) ? 'telefone' : t.includes(endereco.cep) || t.includes(endereco.rua.split(',')[0]) ? 'endereco' : 'outro';
  evento('copia', { pagina, tipo });
}

// leitura: 25, 50, 75 e 90% da página vistos (uma vez cada, só depois de rolar)
const MARCOS = [25, 50, 75, 90];
let lidos = 0;
let medindo = false;
function aoLer() {
  if (medindo || lidos >= MARCOS.length) return;
  medindo = true;
  requestAnimationFrame(() => {
    medindo = false;
    const pct = ((topo() + window.innerHeight) / root.scrollHeight) * 100;
    while (lidos < MARCOS.length && pct >= MARCOS[lidos]) evento('leitura', { pagina, pct: MARCOS[lidos++] });
  });
}

// tempo com a aba visível: 30 s, 60 s e 180 s
function tempoAtivo() {
  let s = 0;
  const relogio = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    s += 1;
    if (s === 30 || s === 60 || s === 180) evento('tempo-ativo', { pagina, s });
    if (s >= 180) clearInterval(relogio);
  }, 1000);
}

// fotos do caso (antes e depois): metade do bloco na tela uma vez
function fotosVistas() {
  const blocos = document.querySelectorAll('[data-foto-caso]');
  if (!blocos.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (ents) => {
      if (!ents.some((en) => en.isIntersecting)) return;
      io.disconnect();
      evento('foto-caso', { pagina, acao: 'viu' });
    },
    { threshold: 0.5 },
  );
  blocos.forEach((b) => io.observe(b));
}

// Web Vitals de visitas reais (biblioteca web-vitals, carregada depois da página): um evento por métrica
function vitais() {
  const dispositivo = mm('(max-width: 759.98px)').matches ? 'celular' : 'computador';
  import('web-vitals')
    .then(({ onLCP, onINP, onCLS, onFCP, onTTFB }) => {
      const enviar = (m: { name: string; value: number; rating: string }) =>
        evento('web-vitals', { pagina, metrica: m.name, valor: m.name === 'CLS' ? Math.round(m.value * 1000) / 1000 : Math.round(m.value), nota: m.rating, dispositivo });
      [onLCP, onINP, onCLS, onFCP, onTTFB].forEach((on) => on(enviar));
    })
    .catch(() => {});
}

function metricas() {
  if (document.body.dataset.pagina === '404') evento('404', { url: pagina + location.search, referencia: document.referrer });
  document.addEventListener('click', aoClicar);
  document.addEventListener('toggle', aoAbrir, true);
  document.addEventListener('copy', aoCopiar);
  window.addEventListener('scroll', aoLer, { passive: true });
  tempoAtivo();
  fotosVistas();
  const depois = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1));
  if (document.readyState === 'complete') depois(vitais);
  else window.addEventListener('load', () => depois(vitais));
}

reveals();
odometro();
menu();
metricas();
window.addEventListener('wheel', roda, { passive: false });
window.addEventListener('scroll', aoRolar, { passive: true });
document.addEventListener('click', ancora);
