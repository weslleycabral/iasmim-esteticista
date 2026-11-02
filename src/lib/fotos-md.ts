// Fotos citadas em HTML dentro dos .md (ex.: antes e depois em peeling-para-melasma.md) com
// src="/fotos/<arquivo>". Os arquivos ficam em src/assets/fotos/ (não há mais public/fotos/):
// troca cada "/fotos/<arquivo>" pela versão otimizada (WebP, até 900 px) gerada pelo Astro.
// Provisório: o template novo de serviço deve mostrar essas fotos com <Foto> e este arquivo some.
import { getImage } from 'astro:assets';
import type { ImageMetadata } from 'astro';

const fotos = import.meta.glob<{ default: ImageMetadata }>('../assets/fotos/*.{webp,jpg,jpeg,png}', { eager: true });

export async function trocarFotos(texto: string) {
  const caminhos = [...new Set(texto.match(/\/fotos\/[\w.-]+\.(?:webp|jpe?g|png)/g) ?? [])];
  for (const c of caminhos) {
    const mod = fotos[`../assets/fotos/${c.slice('/fotos/'.length)}`];
    if (!mod) throw new Error(`Foto ${c} não existe em src/assets/fotos/`);
    const img = await getImage({ src: mod.default, format: 'webp', width: Math.min(900, mod.default.width) });
    texto = texto.replaceAll(c, img.src);
  }
  return texto;
}
