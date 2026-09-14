/** Aproximação de 600 tokens por chunk e 75 tokens de contexto compartilhado. */
const TARGET_CHARS = 2400;
const OVERLAP_CHARS = 300;

// Índices de strings JS são unidades UTF-16; nunca cortar um par substituto.
function ajustarCorte(texto: string, indice: number): number {
  const atual = texto.charCodeAt(indice);
  const anterior = texto.charCodeAt(indice - 1);
  return atual >= 0xdc00 && atual <= 0xdfff && anterior >= 0xd800 && anterior <= 0xdbff
    ? indice - 1
    : indice;
}

export function chunkTexto(texto: string): string[] {
  const limpo = texto.replace(/\r\n/g, '\n').trim();
  if (!limpo) return [];
  if (limpo.length <= TARGET_CHARS) return [limpo];

  const chunks: string[] = [];
  let inicio = 0;
  while (inicio < limpo.length) {
    let fim = Math.min(inicio + TARGET_CHARS, limpo.length);
    if (fim < limpo.length) {
      const janela = limpo.slice(inicio, fim);
      // Fronteiras próximas do início não podem anular o avanço após o overlap.
      for (const separador of ['\n\n', '\n', '. ', ' ']) {
        const posicao = janela.lastIndexOf(separador);
        if (posicao >= TARGET_CHARS / 2) {
          fim = inicio + posicao + separador.length;
          break;
        }
      }
      fim = ajustarCorte(limpo, fim);
    }
    // Preserva indentação e espaços internos, inclusive em exemplos de código.
    chunks.push(limpo.slice(inicio, fim));
    if (fim === limpo.length) break;
    inicio = ajustarCorte(limpo, fim - OVERLAP_CHARS);
  }
  return chunks;
}
