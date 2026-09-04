import { DuckDuckGoSearchProvider } from './duckduckgo-search.provider';

describe('DuckDuckGoSearchProvider', () => {
  let provider: DuckDuckGoSearchProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = new DuckDuckGoSearchProvider();
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
});
