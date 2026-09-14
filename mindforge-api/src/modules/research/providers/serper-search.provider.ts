import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchProvider, WebSearchResultado } from '../search-provider.interface';
import { extrairResultadosJson } from './resultados-json';

@Injectable()
export class SerperSearchProvider implements SearchProvider {
  private readonly logger = new Logger(SerperSearchProvider.name);

  constructor(private readonly config: ConfigService) {}

  async buscar(consulta: string, limite = 8): Promise<WebSearchResultado[]> {
    const url = this.config.get<string>('SEARCH_API_URL');
    const apiKey = this.config.get<string>('SEARCH_API_KEY');
    if (!url) throw new Error('SEARCH_API_URL não configurada');

    let status: number | undefined;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
        },
        body: JSON.stringify({ q: consulta, num: limite }),
        signal: AbortSignal.timeout(this.config.get<number>('SEARCH_TIMEOUT_MS', 10000)),
      });
      if (!response.ok) {
        status = response.status;
        throw new Error('Resposta HTTP sem sucesso');
      }
      const resultados = extrairResultadosJson(await response.json(), limite);
      this.logger.log(`Serper: ${resultados.length} resultados`);
      return resultados;
    } catch {
      // Erros do transporte podem conter URL, credenciais ou a consulta.
      const mensagem = status ? `Serper respondeu ${status}` : 'Falha na busca via Serper';
      this.logger.warn(mensagem);
      throw new Error(mensagem);
    }
  }
}
