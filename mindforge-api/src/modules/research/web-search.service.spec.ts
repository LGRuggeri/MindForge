import { ConfigService } from '@nestjs/config';
import { WebSearchService } from './web-search.service';
import { ApiSearchProvider } from './providers/api-search.provider';
import { DuckDuckGoSearchProvider } from './providers/duckduckgo-search.provider';
import { SerperSearchProvider } from './providers/serper-search.provider';

const criarConfigService = (provider: string) =>
  ({
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'SEARCH_PROVIDER') return provider;
      return defaultValue;
    }),
  }) as unknown as ConfigService;

describe('WebSearchService', () => {
  let duckduckgo: DuckDuckGoSearchProvider;
  let api: ApiSearchProvider;
  let serper: SerperSearchProvider;

  beforeEach(() => {
    duckduckgo = { buscar: jest.fn() } as unknown as DuckDuckGoSearchProvider;
    api = { buscar: jest.fn() } as unknown as ApiSearchProvider;
    serper = { buscar: jest.fn() } as unknown as SerperSearchProvider;
  });

  it('deve usar DuckDuckGo por padrão', async () => {
    const config = criarConfigService('duckduckgo');
    const service = new WebSearchService(config, duckduckgo, api, serper);

    (duckduckgo.buscar as jest.Mock).mockResolvedValueOnce([
      { titulo: 'Duck', url: 'https://d.com', resumo: '', fonte: 'd.com' },
    ]);

    const resultados = await service.buscar('teste', 5);

    expect(duckduckgo.buscar).toHaveBeenCalledWith('teste', 5);
    expect(api.buscar).not.toHaveBeenCalled();
    expect(serper.buscar).not.toHaveBeenCalled();
    expect(resultados).toHaveLength(1);
  });

  it('deve usar provider API quando configurado', async () => {
    const config = criarConfigService('api');
    const service = new WebSearchService(config, duckduckgo, api, serper);

    (api.buscar as jest.Mock).mockResolvedValueOnce([
      { titulo: 'API', url: 'https://api.com', resumo: '', fonte: 'api.com' },
    ]);

    const resultados = await service.buscar('teste', 3);

    expect(api.buscar).toHaveBeenCalledWith('teste', 3);
    expect(duckduckgo.buscar).not.toHaveBeenCalled();
    expect(serper.buscar).not.toHaveBeenCalled();
    expect(resultados).toHaveLength(1);
  });

  it('deve usar provider Serper quando configurado', async () => {
    const config = criarConfigService('serper');
    const service = new WebSearchService(config, duckduckgo, api, serper);

    (serper.buscar as jest.Mock).mockResolvedValueOnce([
      { titulo: 'Serper', url: 'https://serper.com', resumo: '', fonte: 'serper.com' },
    ]);

    const resultados = await service.buscar('teste', 3);

    expect(serper.buscar).toHaveBeenCalledWith('teste', 3);
    expect(duckduckgo.buscar).not.toHaveBeenCalled();
    expect(api.buscar).not.toHaveBeenCalled();
    expect(resultados).toHaveLength(1);
  });
});
