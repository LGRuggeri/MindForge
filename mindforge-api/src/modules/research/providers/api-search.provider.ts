import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SearchProvider, WebSearchResultado } from '../search-provider.interface';

interface ResultadoBruto {
  titulo?: string;
  title?: string;
  url?: string;
  link?: string;
  href?: string;
  resumo?: string;
  snippet?: string;
  content?: string;
  description?: string;
  descricao?: string;
  fonte?: string;
}

/**
 * Provider de busca web via API genérica (Serper, Tavily, Brave, etc).
 * Envia { q: consulta } para SEARCH_API_URL com header de autorização
 * e extrai resultados de formatos JSON comuns.
 */
@Injectable()
export class ApiSearchProvider implements SearchProvider {
  private readonly logger = new Logger(ApiSearchProvider.name);

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
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ q: consulta, num: limite }),
      });

      if (!response.ok) {
        throw new Error(`API de search respondeu ${response.status}`);
      }

      const json = (await response.json()) as Record<string, unknown>;
      const resultados = this.extrairResultados(json);
      this.logger.log(`API search: ${resultados.length} resultados para "${consulta}"`);
      return resultados.slice(0, limite);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.warn(`API search falhou para "${consulta}": ${mensagem}`);
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
      .filter((item): item is ResultadoBruto => typeof item === 'object' && item !== null)
      .map((item) => {
        const titulo = String(item.titulo ?? item.title ?? '').trim();
        const url = String(item.url ?? item.link ?? item.href ?? '').trim();
        const resumo = String(
          item.resumo ?? item.snippet ?? item.content ?? item.description ?? item.descricao ?? '',
        ).trim();
        const fonte = item.fonte ?? this.extrairDominio(url);
        return { titulo, url, resumo, fonte };
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
