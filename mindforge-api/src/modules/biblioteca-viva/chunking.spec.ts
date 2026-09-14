import { chunkTexto } from './chunking';

describe('Chunking de material de estudo', () => {
  it.each(['', '  \n\r\n  '])('não indexa texto vazio %j', (texto) =>
    expect(chunkTexto(texto)).toEqual([]),
  );
  it('normaliza CRLF e preserva Markdown/indentação em texto curto', () => {
    expect(chunkTexto('  # Título\r\n\r\n```py\r\n    print("Olá")\r\n```  ')).toEqual([
      '# Título\n\n```py\n    print("Olá")\n```',
    ]);
  });
  it('mantém texto no limite em um único chunk', () =>
    expect(chunkTexto('a'.repeat(2400))).toEqual(['a'.repeat(2400)]));
  it('evita centenas de chunks por um separador isolado no começo', () => {
    const chunks = chunkTexto('a'.repeat(100) + ' ' + 'b'.repeat(9000));
    expect(chunks.length).toBeLessThanOrEqual(10);
    expect(chunks.join('')).toContain('b'.repeat(2000));
  });
  it.each([
    'a'.repeat(10000),
    Array.from({ length: 60 }, (_, i) => `Parágrafo ${i}: ` + 'conceito '.repeat(30)).join('\n\n'),
    '# Código\n\n' + '    print("Olá 👩🏽‍💻 世界")\n'.repeat(350),
    'x'.repeat(2399) + '😀'.repeat(3000),
  ])('preserva todo o texto e limita os chunks (%#)', (texto) => {
    const chunks = chunkTexto(texto);
    let reconstruido = chunks[0];
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].length).toBeLessThanOrEqual(2400);
      // Remove apenas a área compartilhada para reconstruir o texto original.
      const overlap = [300, 301].find(
        (tamanho) =>
          reconstruido.endsWith(chunks[i].slice(0, tamanho)) &&
          texto.startsWith(reconstruido + chunks[i].slice(tamanho)),
      );
      expect(overlap).toBeDefined();
      reconstruido += chunks[i].slice(overlap);
    }
    expect(reconstruido).toBe(texto.trim());
    for (const chunk of chunks) {
      expect(chunk).not.toMatch(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/);
    }
  });
});
