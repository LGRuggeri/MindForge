import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchProvider, WebSearchResultado } from '../search-provider.interface';

interface SerperResultado {
  title?: string;
  link?: string;
  snippet?: string;
}

/**
 * Provider de busca web via Serper (https://serper.dev).
 * O Serper espera o header `X-API-KEY` com a chave da API.
 */
@Injectable()
export class SerperSearchProvider implements SearchProvider {
  private readonly logger = new Logger(SerperSearchProvider.name);

  constructor(private readonly config: ConfigService) {}

  async buscar(consulta: string, limite = 8): Promise<WebSearchResultado[]> {
    const url = this.config.get<string>('SEARCH_API_URL');
    const apiKey = this.config.get<string>('SEARCH_API_KEY');

    if (!url) {
      throw new Error('SEARCH_API_URL não configurada');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
        },
        body: JSON.stringify({ q: consulta, num: limite }),
      });

      if (!response.ok) {
        throw new Error(`Serper respondeu ${response.status}`);
      }

      const json = (await response.json()) as Record<string, unknown>;
      const resultados = this.extrairResultados(json);
      this.logger.log(`Serper search: ${resultados.length} resultados para "${consulta}"`);
      return resultados.slice(0, limite);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.warn(`Serper search falhou para "${consulta}": ${mensagem}`);
      throw erro;
    }
  }

  private extrairResultados(json: Record<string, unknown>): WebSearchResultado[] {
    const candidatos: unknown[] =
      this.arrayDe(json, 'organic') ??
      this.arrayDe(json, 'results') ??
      this.arrayDe(this.objetoDe(json, 'web'), 'results') ??
      [];

    return candidatos
      .filter((item): item is SerperResultado => typeof item === 'object' && item !== null)
      .map((item) => {
        const titulo = String(item.title ?? '').trim();
        const url = String(item.link ?? '').trim();
        const resumo = String(item.snippet ?? '').trim();
        return { titulo, url, resumo, fonte: this.extrairDominio(url) };
      })
      .filter((r) => r.titulo && r.url);
  }

  private objetoDe(
    json: Record<string, unknown> | null,
    chave: string,
  ): Record<string, unknown> | null {
    if (!json) return null;
    const valor = json[chave];
    return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
      ? (valor as Record<string, unknown>)
      : null;
  }

  private arrayDe(json: Record<string, unknown> | null, chave: string): unknown[] | null {
    if (!json) return null;
    const valor = json[chave];
    return Array.isArray(valor) ? valor : null;
  }

  private extrairDominio(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'desconhecido';
    }
  }
}
