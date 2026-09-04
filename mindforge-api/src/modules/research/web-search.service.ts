import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchProvider, WebSearchResultado } from './search-provider.interface';
import { ApiSearchProvider } from './providers/api-search.provider';
import { DuckDuckGoSearchProvider } from './providers/duckduckgo-search.provider';
import { SerperSearchProvider } from './providers/serper-search.provider';

export { WebSearchResultado };

/**
 * Ponto único de entrada para busca web no Research Engine.
 * Seleciona o provider configurado por SEARCH_PROVIDER (duckduckgo, api ou serper)
 * e delega a busca. Mantém a mesma interface pública do serviço anterior.
 */
@Injectable()
export class WebSearchService implements SearchProvider {
  private readonly provider: SearchProvider;

  constructor(
    private readonly config: ConfigService,
    duckduckgo: DuckDuckGoSearchProvider,
    api: ApiSearchProvider,
    serper: SerperSearchProvider,
  ) {
    const providerName = this.config.get<string>('SEARCH_PROVIDER', 'duckduckgo');
    const providers: Record<string, SearchProvider> = {
      api,
      serper,
      duckduckgo,
    };
    this.provider = providers[providerName] ?? duckduckgo;
  }

  async buscar(consulta: string, limite?: number): Promise<WebSearchResultado[]> {
    return this.provider.buscar(consulta, limite);
  }
}
