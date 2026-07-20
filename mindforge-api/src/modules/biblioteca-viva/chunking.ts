/**
 * Chunking alinhado a docs/09-rag-biblioteca-viva.md:
 * ~500–800 tokens por chunk, overlap ~50–100 tokens.
 * Aproximação: 1 token ≈ 4 caracteres (português/inglês misto).
 */
const TARGET_CHARS = 2400; // ~600 tokens
const OVERLAP_CHARS = 300; // ~75 tokens
const MIN_CHUNK_CHARS = 80;

export function chunkTexto(texto: string): string[] {
  const limpo = texto.replace(/\r\n/g, '\n').trim();
  if (!limpo) return [];

  if (limpo.length <= TARGET_CHARS) {
    return [limpo];
  }

  const paragrafos = limpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let buffer = '';

  const flush = () => {
    const t = buffer.trim();
    if (t.length >= MIN_CHUNK_CHARS) {
      chunks.push(t);
    } else if (t && chunks.length > 0) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n\n${t}`.trim();
    } else if (t) {
      chunks.push(t);
    }
    buffer = '';
  };

  for (const paragrafo of paragrafos) {
    if (paragrafo.length > TARGET_CHARS) {
      if (buffer) flush();
      chunks.push(...chunkPorTamanho(paragrafo));
      continue;
    }

    const candidato = buffer ? `${buffer}\n\n${paragrafo}` : paragrafo;
    if (candidato.length <= TARGET_CHARS) {
      buffer = candidato;
    } else {
      flush();
      buffer = paragrafo;
    }
  }

  if (buffer) flush();

  return aplicarOverlap(chunks);
}

function chunkPorTamanho(texto: string): string[] {
  const partes: string[] = [];
  let inicio = 0;

  while (inicio < texto.length) {
    let fim = Math.min(inicio + TARGET_CHARS, texto.length);

    if (fim < texto.length) {
      const janela = texto.slice(inicio, fim);
      const quebra =
        Math.max(janela.lastIndexOf('\n'), janela.lastIndexOf('. '), janela.lastIndexOf(' ')) ||
        janela.length;
      fim = inicio + quebra;
      if (fim <= inicio) {
        fim = Math.min(inicio + TARGET_CHARS, texto.length);
      }
    }

    const fatia = texto.slice(inicio, fim).trim();
    if (fatia) partes.push(fatia);

    if (fim >= texto.length) break;
    inicio = Math.max(fim - OVERLAP_CHARS, inicio + 1);
  }

  return partes;
}

function aplicarOverlap(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;

  const comOverlap: string[] = [chunks[0]];
  for (let i = 1; i < chunks.length; i++) {
    const anterior = chunks[i - 1];
    const cauda = anterior.slice(Math.max(0, anterior.length - OVERLAP_CHARS)).trim();
    const atual = chunks[i];
    if (cauda && !atual.startsWith(cauda.slice(0, Math.min(40, cauda.length)))) {
      comOverlap.push(`${cauda}\n\n${atual}`.trim());
    } else {
      comOverlap.push(atual);
    }
  }
  return comOverlap;
}
