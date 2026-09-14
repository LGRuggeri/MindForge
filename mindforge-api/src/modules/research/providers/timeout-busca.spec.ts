import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiSearchProvider } from './api-search.provider';
import { SerperSearchProvider } from './serper-search.provider';
import { DuckDuckGoSearchProvider } from './duckduckgo-search.provider';

describe.each([ApiSearchProvider, SerperSearchProvider, DuckDuckGoSearchProvider])(
  '%s — cancelamento da busca',
  (Provider) => {
    afterEach(() => jest.restoreAllMocks());
    it.each([undefined, 2500])(
      'cancela transporte pendente e oculta detalhes (timeout=%s)',
      async (tempo) => {
        const controller = new AbortController();
        const timeout = jest.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
        const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(
          (_url, opcoes) =>
            new Promise((_resolve, reject) => {
              opcoes?.signal?.addEventListener(
                'abort',
                () => reject(new Error('SEGREDO no transporte')),
                { once: true },
              );
            }),
        );
        const config = new ConfigService({
          SEARCH_API_URL: 'https://busca.local',
          SEARCH_TIMEOUT_MS: tempo,
        });
        const resultado = new Provider(config).buscar('consulta privada');
        const verificacao =
          Provider === DuckDuckGoSearchProvider
            ? expect(resultado).resolves.toEqual([])
            : expect(resultado).rejects.not.toThrow('SEGREDO');
        controller.abort();
        await verificacao;
        expect(timeout).toHaveBeenCalledWith(tempo ?? 10000);
        expect(fetchSpy.mock.calls[0][1]?.signal).toBe(controller.signal);
        expect(JSON.stringify(warn.mock.calls)).not.toMatch(/SEGREDO|consulta privada/);
      },
    );
  },
);
