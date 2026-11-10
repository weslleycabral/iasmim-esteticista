# Site da Iasmim Esteticista

Site estático em [Astro](https://astro.build) para https://iasmimesteticista.com.br, hospedado na Cloudflare (Workers com static assets).

## Comandos

```bash
npm install          # uma vez
npm run dev          # abre em http://localhost:4321 e atualiza enquanto você edita
npm run build        # gera o site em dist/
npm run check:dist   # confere dist/: H1, título, descrição, canonical, OG, JSON-LD (FAQ e migalha iguais às visíveis),
                     # links, NAP, preços, promessas proibidas, imagens, sitemap, robots.txt, llms.txt
npm run verify       # build + conferência
npm run dev:worker   # serve dist/ pelo Worker em http://localhost:8787 (redirecionamentos, cabeçalhos, /whatsapp, log no D1 local)
```

Precisa de Node 22.23.4 ou mais novo.

## Onde fica cada coisa

| O quê | Onde |
| --- | --- |
| Nome, endereço, telefone, horário, Instagram, formação | `src/data/negocio.json` (vale para o site inteiro, inclusive o rodapé e o JSON-LD) |
| Serviços | `src/content/servicos/*.md` |
| Peelings | `src/content/servicos/peeling/*.md` (`peeling.md` é a página que reúne todos) |
| Início, Sobre, Contato, Perguntas frequentes, Depoimentos, Anna Pegova | `src/content/paginas/*.md` |
| Depoimentos de clientes (trechos das avaliações do Google) | `src/data/depoimentos.json` (instruções no topo do arquivo); link das avaliações em `googleAvaliacoes`, no `negocio.json` |
| Fotos | `src/assets/fotos/` (o site gera AVIF e WebP em vários tamanhos) |
| robots.txt (libera buscadores e robôs de IA) | `public/robots.txt` |
| Ícones, logo e imagem de compartilhamento | `public/` (ver "Ícones e imagem de compartilhamento") |
| Dados estruturados (JSON-LD) | `src/lib/schema.ts` (montado no `<head>` por `src/layouts/Base.astro`) |
| `/llms.txt` e `/llms-full.txt` | `src/lib/llms.ts` (gerados dos .md e do `negocio.json`) |
| Cabeçalhos (CSP, cache, noindex) | `public/_headers` |
| Redirecionamentos entre caminhos | `public/_redirects` |
| www → domínio, http → https, `/whatsapp`, proxy do Umami, log de acessos | `worker/index.ts` (config em `wrangler.jsonc`) |

O nome do arquivo vira o endereço: `src/content/servicos/botox.md` → `/servicos/botox/`.
`/llms.txt`, `/llms-full.txt` e o sitemap são gerados sozinhos a partir dos .md.

## Como editar um serviço

Abra o .md. A parte entre os `---` do topo são os dados; o resto é o texto da página.

- `title`: título que aparece no Google (até 60 caracteres, com o serviço e "Juazeiro do Norte").
- `description`: texto do Google (até 155 caracteres). Se passar do limite, o build avisa e para.
- `h1`, `nome`, `resumo`: título da página, nome curto e resumo (usado nos cartões e no llms.txt).
- `outrosNomes`: outros nomes que as pessoas buscam.
- `indicacoes`: lista curta "indicado para".
- `relacionados`: outros serviços para indicar no fim da página (use o caminho do arquivo sem `.md`, ex. `peeling/peeling-para-melasma`).
- `preco`: opcional. `valor` (número, ex. `249.9`), `aPartirDe: true` para "a partir de" e `detalhe` (o que o valor inclui). Aparece na ficha da página, no llms-full.txt e no JSON-LD (Offer). Sem ele, o site mostra "definido na avaliação" (a avaliação custa R$ 100, descontada do procedimento).
- `duracao` e `sessoes`: opcionais, só quando o texto diz (ex. `duracao: 1h a 1h30`). Entram na ficha técnica.
- `mensagemWhatsApp`: opcional; se vazio, o botão manda "Olá, Iasmim! Quero agendar <nome>."
- `faq`: perguntas e respostas (aparecem na página e no Google).
- `atualizado`: data da última revisão (AAAA-MM-DD). **Mude sempre que mexer no texto**: ela aparece na página ("Atualizado em…" ou "Página revisada em…" no rodapé), no JSON-LD (`dateModified`), no `lastmod` do sitemap e no llms.txt. Não use a data do dia sem ter mudado nada: o Google deixa de confiar no `lastmod`.

No texto, use títulos `##` em forma de pergunta e comece cada seção respondendo direto.
Valores que contenham `: ` precisam de aspas: `description: "Texto: com dois-pontos"`.

Para **criar** um serviço, copie um .md parecido, mude o nome do arquivo e os dados.
Para **apagar**, remova o arquivo e tire o nome dele de `relacionados` nos outros .md.

## Como editar os depoimentos

Cada depoimento em `src/data/depoimentos.json` aparece em `/depoimentos/`; com `"destaque": true`, também na página inicial (use de 6 a 8);
com `"servico"` preenchido (ex. `"limpeza-de-pele"`), também na página desse serviço (até 6).
Copie o texto da avaliação exatamente como foi escrito; só pode cortar trechos, marcando com "…".
Não marque avaliações com Review/AggregateRating no JSON-LD: o Google não aceita avaliações da própria empresa no site.

## Como colocar fotos

1. Salve a foto em `src/assets/fotos/` em `.webp` ou `.jpg`, com uns 1200 px de largura (retrato 3:4 fica melhor no topo do serviço; o site gera as versões menores sozinho).
2. No .md do serviço, preencha o campo `src` dentro de `imagem` com o caminho **relativo ao .md**:

   ```yaml
   # em src/content/servicos/limpeza-de-pele.md
   imagem:
     src: ../../assets/fotos/limpeza-de-pele.webp
     alt: Limpeza de pele sendo realizada na Iasmim Esteticista, em Juazeiro do Norte
   ```

   Nos peelings (uma pasta abaixo) o caminho tem um `../` a mais: `../../../assets/fotos/...`. Se o arquivo não existir, o build avisa e para.

3. Confira se o `alt` descreve o que aparece na foto.

Enquanto `src` estiver vazio (`""`), a página abre com a placa tipográfica (número e nome da matéria), sem desenho no lugar da foto.

### Fotos de um caso (antes e depois)

No .md do serviço, o campo `casos` é uma lista de pares. `depois` é opcional (ex. foto sob luz UV) e `rotulo` muda a etiqueta ("Antes"/"Depois" por padrão):

```yaml
casos:
  - antes:
      src: ../../../assets/fotos/peeling-melasma-antes-1.webp
      alt: Paciente com melasma antes do tratamento…
    depois:
      src: ../../../assets/fotos/peeling-melasma-depois-1.webp
      alt: A mesma paciente depois de mais de um ano…
    legenda: "Rosto de perfil para um lado: antes e depois de mais de um ano de acompanhamento."
casosNota: As fotos de antes foram feitas com a paciente deitada e as de depois, sentada.
```

A página mostra as fotos na seção "Resultado", sempre com a nota "Foto publicada com autorização da paciente. Resultados variam de pessoa para pessoa." (mais o `casosNota`, se houver). Só publique com o termo de uso de imagem assinado. Não escreva `<img>` dentro do texto do .md.

## Ícones e imagem de compartilhamento

Todas as fotos do site saem em AVIF/WebP. As exceções, de propósito, ficam em `public/`:

| Arquivo | Para quê | Por que não WebP |
| --- | --- | --- |
| `og-iasmim-esteticista.jpg` (1200×630, < 300 KB) | prévia do link no WhatsApp, Facebook, Instagram, LinkedIn e X | WhatsApp, Meta e LinkedIn não documentam WebP em `og:image`; o WhatsApp é o canal principal |
| `apple-touch-icon.png` (180×180) | ícone na tela inicial do iPhone | o iOS só aceita PNG |
| `favicon.ico` (16/32/48) e `favicon.svg` | aba do navegador e resultado do Google | — |
| `logo-iasmim-esteticista.webp` (512×512) | `logo` no JSON-LD | já é WebP |

A imagem de compartilhamento é gerada a partir de `../design/og/og.html` (foto + textos): edite o HTML e rode `node gerar.mjs` dentro de `../design/og/`. Depois de trocar, o WhatsApp pode levar dias para mostrar a nova (ele guarda a prévia em cache); o [Sharing Debugger](https://developers.facebook.com/tools/debug/) força a atualização na Meta.

## Decisões de SEO (não desfazer sem motivo)

- `/bio/` (links do Instagram) tem `noindex`, fica fora do sitemap e do llms.txt: repete a página inicial e a navegação, com pouco texto próprio. As outras páginas continuam ligadas a ela normalmente.
- Migalha visível = `BreadcrumbList` no JSON-LD. Página sem migalha visível (inicial, depoimentos, perguntas frequentes, bio) não tem `BreadcrumbList`.
- Sem `AggregateRating`/`Review` e sem `Product` (sem preço publicado, o Google considera inválido): a Anna Pegova é um `Service` "Revenda Anna Pegova" com `brand`.
- Sem versões `.md` de cada página: o Google diz que não precisa de arquivos especiais para IA; o `/llms.txt` e o `/llms-full.txt` cobrem os assistentes que leem esse formato. Os dois `.txt` têm `X-Robots-Tag: noindex` (não aparecem na busca, mas os robôs de IA leem).
- O número de avaliações (`avaliacoes.total`) aparece no HTML como texto puro (o odômetro desenha os algarismos só com CSS). Ao atualizar o total, procure também "229" nos .md (alguns textos citam o número).
- Pergunta nova em `perguntas-frequentes.md` só aparece na página `/perguntas-frequentes/` depois de entrar na lista `temas` de `src/pages/perguntas-frequentes.astro` (o check-dist confere que o FAQ visível e o JSON-LD batem).

## Publicar

`npm run deploy` roda o build e a conferência (`npm run verify`) e, se passarem, publica com `wrangler deploy`. Se a conferência falhar, a publicação não acontece. `npm run deploy:preview` sobe uma versão sem trocar a que está no ar e devolve uma URL de prévia.

### Primeira vez (uma só)

1. `npx wrangler login` (abre o navegador para entrar na conta Cloudflare).
2. `npx wrangler d1 create iasmim-acessos --location enam` e trocar o `database_id` em `wrangler.jsonc` pelo id que ele devolver. (O D1 não tem região na América do Sul; `enam` = leste da América do Norte, a mais perto.)
3. `npx wrangler d1 migrations apply iasmim-acessos --remote` (cria a tabela do log de acessos).
4. `npx wrangler secret put ACESSOS_SAL` (o sal do hash de visitante; usar o mesmo valor que estava na Netlify para o hash do dia da troca bater).
5. `npm run deploy`: publica em `iasmimesteticista.<conta>.workers.dev` para conferir.

### Domínio iasmimesteticista.com.br (Registro.br)

1. Na Cloudflare: *Add a domain* → `iasmimesteticista.com.br`, plano Free. Ela importa os registros DNS atuais: conferir se vieram os TXT (verificação do Search Console etc.) e os MX, se houver e-mail no domínio.
2. No Registro.br, trocar os servidores DNS pelos dois que a Cloudflare indicar. Esperar a Cloudflare marcar o domínio como ativo (minutos a algumas horas).
3. No DNS da Cloudflare, apagar os dois registros importados da Netlify (`A` → `75.2.60.5` e `CNAME www` → `iasmimesteticista.netlify.app`). Em `wrangler.jsonc`, tirar o comentário de `routes` (domínio e www) e `npm run deploy`: a Cloudflare cria os registros do Worker e emite o HTTPS sozinha. Entre apagar e publicar o site fica fora do ar, então fazer os dois em seguida.
4. Na Cloudflare: *SSL/TLS → Edge Certificates → Always Use HTTPS* ligado.
5. Conferir `http://www.iasmimesteticista.com.br/sobre` → `https://iasmimesteticista.com.br/sobre/` (301) e o log (`npm run acessos`).
6. Depois de uns dias no ar: `"workers_dev": false` em `wrangler.jsonc` (tira o endereço `*.workers.dev`, que duplica o site) e apagar o site na Netlify, depois de baixar o log de lá pela última vez.
7. Search Console e Bing Webmaster Tools continuam valendo (a verificação é por DNS ou por arquivo, não pela hospedagem).
