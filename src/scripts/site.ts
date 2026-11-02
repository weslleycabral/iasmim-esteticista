// Script único do site (carregado uma vez pelo Base.astro; o Astro empacota como módulo).
// Portado da lógica V9 do canvas (design/paginas-3c/*.dc.html):
//  1. reveals .rv/.mk por IntersectionObserver (classe .in, uma vez só)
//  2. rolagem com inércia só para roda de mouse; âncoras (#secao) rolam suave
//  3. odômetro do número da edição (Edicao.astro), guardado em localStorage "iasmim-edicao"
//  4. menu <details> do celular fecha ao escolher um link

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

/* 4. menu do celular: fecha ao tocar num link */
function menu() {
  document.querySelectorAll<HTMLDetailsElement>('details.menu').forEach((d) => {
    d.addEventListener('click', (e) => {
      if ((e.target as Element).closest('a')) d.removeAttribute('open');
    });
  });
}

reveals();
odometro();
menu();
window.addEventListener('wheel', roda, { passive: false });
window.addEventListener('scroll', aoRolar, { passive: true });
document.addEventListener('click', ancora);
