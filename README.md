# Site da Iasmim Esteticista

Site estático em [Astro](https://astro.build) para https://iasmimesteticista.com.br, hospedado na Netlify.

## Comandos

```bash
npm install          # uma vez
npm run dev          # abre em http://localhost:4321 e atualiza enquanto você edita
npm run build        # gera o site em dist/
npm run check:dist   # confere dist/: H1, título, descrição, canonical, JSON-LD, links, NAP, sitemap, llms.txt
npm run verify       # build + conferência
```

Precisa de Node 22.23.4 ou mais novo (a Netlify usa Node 24; ver `netlify.toml`).

## Onde fica cada coisa

| O quê | Onde |
| --- | --- |
| Nome, endereço, telefone, horário, Instagram, formação | `src/data/negocio.json` (vale para o site inteiro, inclusive o rodapé e o JSON-LD) |
| Serviços | `src/content/servicos/*.md` |
| Peelings | `src/content/servicos/peeling/*.md` (`peeling.md` é a página que reúne todos) |
| Início, Sobre, Contato, Perguntas frequentes, Depoimentos, Anna Pegova | `src/content/paginas/*.md` |
| Depoimentos de clientes (trechos das avaliações do Google) | `src/data/depoimentos.json` (instruções no topo do arquivo); link das avaliações em `googleAvaliacoes`, no `negocio.json` |
| Fotos | `public/fotos/` |
| robots.txt | `public/robots.txt` |

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
- `preco`: opcional. `valor` (número, ex. `249.9`), `aPartirDe: true` para "a partir de" e `detalhe` (o que o valor inclui). Aparece no resumo da página, no llms-full.txt e no JSON-LD (Offer). Sem ele, o site mostra "sob consulta pelo WhatsApp".
- `mensagemWhatsApp`: opcional; se vazio, o botão manda "Olá, Iasmim! Quero agendar <nome>."
- `faq`: perguntas e respostas (aparecem na página e no Google).
- `atualizado`: data da última revisão (AAAA-MM-DD).

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

1. Salve a foto em `public/fotos/` em `.webp` ou `.jpg`, com uns 1200 px de largura e menos de 200 KB
   (ex.: `public/fotos/limpeza-de-pele.webp`).
2. No .md do serviço, preencha o campo `src` dentro de `imagem`:

   ```yaml
   imagem:
     src: /fotos/limpeza-de-pele.webp
     alt: Limpeza de pele sendo realizada na Iasmim Esteticista, em Juazeiro do Norte
   ```

3. Confira se o `alt` descreve o que aparece na foto.

Enquanto `src` estiver vazio, o site mostra um desenho neutro no lugar.
A imagem de compartilhamento (WhatsApp, Facebook) é `public/og-iasmim-esteticista.png` (1200×630); troque o arquivo mantendo o nome.

## Publicar

A Netlify roda `npm run build && node scripts/check-dist.mjs` e publica `dist/`. Se a conferência falhar, a publicação não acontece.

### Primeira vez (uma só)

1. `npx -y netlify-cli@27 login` (abre o navegador para entrar na conta Netlify).
2. `npx -y netlify-cli@27 sites:create --name iasmimesteticista` (cria o site vazio e liga esta pasta a ele; fica gravado em `.netlify/`).
3. `npm run deploy:preview`: publica numa URL de rascunho para conferir.
4. `npm run deploy`: publica em produção.

### Domínio iasmimesteticista.com.br (Registro.br)

1. Na Netlify: *Domain management → Add a domain* → `iasmimesteticista.com.br` (ela adiciona o `www` junto e redireciona para o domínio sem www).
2. No Registro.br, em *DNS → Editar zona* (DNS do Registro.br):
   - `A` em `iasmimesteticista.com.br` → `75.2.60.5`
   - `CNAME` em `www` → `iasmimesteticista.netlify.app`
3. Esperar o DNS propagar (minutos a algumas horas); a Netlify emite o HTTPS (Let's Encrypt) sozinha.
4. Depois: cadastrar o domínio no Google Search Console e enviar `https://iasmimesteticista.com.br/sitemap-index.xml`.

Se o nome `iasmimesteticista` já estiver em uso na Netlify, use outro e troque no `CNAME`.
