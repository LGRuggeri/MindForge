import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { normalizarUrlFonte } from '../fontes-pesquisa';
import { SearchProvider, WebSearchResultado } from '../search-provider.interface';

/** O HTML pode mudar; falhas degradam para curadoria por IA no Research. */
@Injectable()
export class DuckDuckGoSearchProvider implements SearchProvider {
  private readonly logger = new Logger(DuckDuckGoSearchProvider.name);
  private readonly baseUrl = 'https://html.duckduckgo.com/html/';

  constructor(private readonly config: ConfigService) {}

  async buscar(consulta: string, limite = 8): Promise<WebSearchResultado[]> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Origin: 'https://html.duckduckgo.com',
          Referer: 'https://html.duckduckgo.com/',
        },
        body: new URLSearchParams({ q: consulta, kl: 'us-en' }).toString(),
        signal: AbortSignal.timeout(this.config.get<number>('SEARCH_TIMEOUT_MS', 10000)),
      });
      if (!response.ok) throw new Error('Resposta HTTP sem sucesso');
      const resultados = this.parsearHtml(await response.text()).slice(0, limite);
      this.logger.log('Web search: ' + resultados.length + ' resultados');
      return resultados;
    } catch {
      this.logger.warn('Busca DuckDuckGo indisponível');
      return [];
    }
  }

  private parsearHtml(html: string): WebSearchResultado[] {
    const resultados = new Map<string, WebSearchResultado>();
    const blocos = html
      .split(/<div\b[^>]*\bclass=["'][^"']*\bresult__body\b[^"']*["'][^>]*>/i)
      .slice(1);
    for (const bloco of blocos) {
      const tituloMatch = bloco.match(
        /<a\b(?=[^>]*\bclass=["'][^"']*\bresult__a\b[^"']*["'])[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!tituloMatch) continue;
      const titulo = this.limparHtml(tituloMatch[2]);
      const url = this.limparUrl(tituloMatch[1]);
      const normalizada = normalizarUrlFonte(url);
      if (!titulo || !url || !normalizada || resultados.has(normalizada)) continue;
      const snippetMatch = bloco.match(
        /<a\b[^>]*\bclass=["'][^"']*\bresult__snippet\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
      );
      resultados.set(normalizada, {
        titulo,
        url,
        resumo: snippetMatch ? this.limparHtml(snippetMatch[1]) : '',
        fonte: new URL(normalizada).hostname.replace(/^www\./, ''),
      });
    }
    return [...resultados.values()];
  }

  private decodificarEntidades(texto: string): string {
    const entidades: Record<string, string> = {
      quot: '"',
      amp: '&',
      lt: '<',
      gt: '>',
      apos: "'",
      nbsp: ' ',
    };
    // Uma passagem evita decodificar novamente entidades contidas no destino.
    return texto.replace(
      /&(quot|amp|lt|gt|apos|nbsp|#\d+|#x[\da-f]+);/gi,
      (_, entidade: string) => {
        const chave = entidade.toLowerCase();
        if (!chave.startsWith('#')) return entidades[chave];
        const codigo = chave.startsWith('#x')
          ? parseInt(chave.slice(2), 16)
          : Number(chave.slice(1));
        return codigo <= 0x10ffff ? String.fromCodePoint(codigo) : '\uFFFD';
      },
    );
  }

  private limparHtml(html: string): string {
    return this.decodificarEntidades(html.replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
  }

  private limparUrl(valor: string): string | null {
    const link = this.decodificarEntidades(valor).trim();
    try {
      const url = new URL(link, 'https://duckduckgo.com');
      if (
        ['duckduckgo.com', 'www.duckduckgo.com', 'html.duckduckgo.com'].includes(url.hostname) &&
        url.pathname === '/l/'
      ) {
        // URLSearchParams já decodifica o parâmetro uma vez.
        const destino = url.searchParams.get('uddg');
        return normalizarUrlFonte(destino) ? destino : null;
      }
      const destino = link.startsWith('//') ? 'https:' + link : link;
      return normalizarUrlFonte(destino) ? destino : null;
    } catch {
      return null;
    }
  }
}
