import { DuckDuckGoSearchProvider } from './duckduckgo-search.provider';
import { ConfigService } from '@nestjs/config';

describe('DuckDuckGoSearchProvider', () => {
  let provider: DuckDuckGoSearchProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new DuckDuckGoSearchProvider(new ConfigService());
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('deve retornar resultados parseados do HTML do DuckDuckGo', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        '<div class="result__body">' +
        '<a rel="nofollow" class="result__a" href="https://example.com">Título Exemplo</a>' +
        '<a class="result__snippet">Resumo de exemplo</a>' +
        '<a class="result__url" href="https://example.com">example.com</a>' +
        '</div>',
      headers: new Headers(),
    } as Response);

    const resultados = await provider.buscar('teste', 5);

    expect(resultados).toHaveLength(1);
    expect(resultados[0]).toEqual({
      titulo: 'Título Exemplo',
      url: 'https://example.com',
      resumo: 'Resumo de exemplo',
      fonte: 'example.com',
    });
  });

  it('deve retornar lista vazia quando o fetch falhar', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('network error'));

    const resultados = await provider.buscar('teste');

    expect(resultados).toEqual([]);
  });

  it('deve limitar resultados ao parâmetro limite', async () => {
    const html = Array.from(
      { length: 10 },
      (_, i) =>
        `<div class="result__body">` +
        `<a rel="nofollow" class="result__a" href="https://example${i}.com">Título ${i}</a>` +
        `<a class="result__snippet">Resumo ${i}</a>` +
        `</div>`,
    ).join('');

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => html,
      headers: new Headers(),
    } as Response);

    const resultados = await provider.buscar('teste', 3);

    expect(resultados).toHaveLength(3);
  });
  it.each([
    '/l/?uddg=https%3A%2F%2Fexample.org%2Fa%3Fq%3D100%2525&amp;rut=abc',
    '//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fa%3Fq%3D100%2525&rut=abc',
    'https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.org%2Fa%3Fq%3D100%2525',
  ])('extrai o destino sem dupla decodificação: %s', async (href) => {
    fetchSpy.mockResolvedValue({
      ok: true,
      text: async () =>
        `<div class="result__body"><a rel="nofollow" class="result__a" href="${href}">Guia</a></div>`,
      headers: new Headers(),
    });
    expect(await provider.buscar('teste')).toEqual([
      { titulo: 'Guia', url: 'https://example.org/a?q=100%25', resumo: '', fonte: 'example.org' },
    ]);
  });
  it('aceita atributos reordenados e decodifica entidades Unicode', async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      text: async () =>
        `<div class='extra result__body'><a href='//example.org/a' class='result__a extra'>Guia &#128512; &#x1F600; &amp; &quot;texto&quot;</a><a class='result__snippet'><b>Texto</b> &lt;exemplo&gt;</a></div>`,
      headers: new Headers(),
    });
    expect(await provider.buscar('teste')).toEqual([
      {
        titulo: 'Guia 😀 😀 & "texto"',
        url: 'https://example.org/a',
        resumo: 'Texto <exemplo>',
        fonte: 'example.org',
      },
    ]);
  });
  it('ignora link inválido sem descartar os demais resultados', async () => {
    const bloco = (url: string) =>
      `<div class="result__body"><a rel="nofollow" class="result__a" href="${url}">Guia</a></div>`;
    fetchSpy.mockResolvedValue({
      ok: true,
      text: async () =>
        bloco('javascript:alert(1)') + bloco('/l/?sem_destino=1') + bloco('https://example.org/a'),
      headers: new Headers(),
    });
    expect(await provider.buscar('teste', 1)).toEqual([
      expect.objectContaining({ url: 'https://example.org/a' }),
    ]);
  });
  it.each([403, 429])('degrada para lista vazia no HTTP %s', async (status) => {
    fetchSpy.mockResolvedValue({ ok: false, status, headers: new Headers() });
    expect(await provider.buscar('teste')).toEqual([]);
  });
});
