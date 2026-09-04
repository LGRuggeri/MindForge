import { ConfigService } from '@nestjs/config';
import { ApiSearchProvider } from './api-search.provider';

const criarConfigService = (vals: Record<string, string | undefined>) =>
  ({
    get: jest.fn((key: string) => vals[key]),
  }) as unknown as ConfigService;

describe('ApiSearchProvider', () => {
  let provider: ApiSearchProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('deve extrair resultados do formato Serper (organic)', async () => {
    const config = criarConfigService({
      SEARCH_API_URL: 'https://api.serper.dev/search',
      SEARCH_API_KEY: 'serper-key',
    });
    provider = new ApiSearchProvider(config);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        organic: [
          { title: 'Serper Result', link: 'https://serper.com', snippet: 'Snippet serper' },
        ],
      }),
    } as Response);

    const resultados = await provider.buscar('teste', 5);

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.serper.dev/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer serper-key' }),
      }),
    );
    expect(resultados[0]).toEqual({
      titulo: 'Serper Result',
      url: 'https://serper.com',
      resumo: 'Snippet serper',
      fonte: 'serper.com',
    });
  });

  it('deve extrair resultados do formato Tavily (results)', async () => {
    const config = criarConfigService({
      SEARCH_API_URL: 'https://api.tavily.com/search',
      SEARCH_API_KEY: 'tavily-key',
    });
    provider = new ApiSearchProvider(config);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ title: 'Tavily Result', url: 'https://tavily.com', content: 'Content tavily' }],
      }),
    } as Response);

    const resultados = await provider.buscar('teste', 5);

    expect(resultados[0]).toEqual({
      titulo: 'Tavily Result',
      url: 'https://tavily.com',
      resumo: 'Content tavily',
      fonte: 'tavily.com',
    });
  });

  it('deve lançar erro quando SEARCH_API_URL não está configurada', async () => {
    const config = criarConfigService({});
    provider = new ApiSearchProvider(config);

    await expect(provider.buscar('teste')).rejects.toThrow('SEARCH_API_URL não configurada');
  });

  it('deve lançar erro quando a API retorna falha', async () => {
    const config = criarConfigService({
      SEARCH_API_URL: 'https://api.example.com/search',
      SEARCH_API_KEY: 'key',
    });
    provider = new ApiSearchProvider(config);

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(provider.buscar('teste')).rejects.toThrow('API de search respondeu 500');
  });
});
