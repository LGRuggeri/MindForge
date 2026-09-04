import { Injectable, Logger } from '@nestjs/common';
import { SearchProvider, WebSearchResultado } from '../search-provider.interface';

interface Cookie {
  nome: string;
  valor: string;
}

/**
 * Busca web real via DuckDuckGo HTML (html.duckduckgo.com).
 * Não requer API key, mas depende do formato HTML deles — pode quebrar
 * se o layout mudar. Por isso é envolvido em try/catch e fallback para
 * lista vazia.
 */
@Injectable()
export class DuckDuckGoSearchProvider implements SearchProvider {
  private readonly logger = new Logger(DuckDuckGoSearchProvider.name);
  private readonly baseUrl = 'https://html.duckduckgo.com/html/';

  async buscar(consulta: string, limite = 8): Promise<WebSearchResultado[]> {
    const cookies: Cookie[] = [];

    try {
      const html = await this.fazerBusca(consulta, cookies);
      const resultados = this.parsearHtml(html);
      this.logger.log(`Web search: ${resultados.length} resultados para "${consulta}"`);
      return resultados.slice(0, limite);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.warn(`Web search falhou para "${consulta}": ${mensagem}`);
      return [];
    }
  }

  private async fazerBusca(consulta: string, cookies: Cookie[]): Promise<string> {
    const body = new URLSearchParams({ q: consulta, kl: 'us-en' });
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent(),
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Origin: 'https://html.duckduckgo.com',
        Referer: 'https://html.duckduckgo.com/',
        Cookie: this.montarCookieHeader(cookies),
      },
      body: body.toString(),
    });

    this.coletarCookies(response, cookies);

    if (!response.ok) {
      throw new Error(`DuckDuckGo respondeu ${response.status}`);
    }

    return response.text();
  }

  private parsearHtml(html: string): WebSearchResultado[] {
    const resultados: WebSearchResultado[] = [];
    // Cada resultado está dentro de <div class="result__body">...</div>
    const blocos = html.split('<div class="result__body">').slice(1);

    for (const bloco of blocos) {
      const tituloMatch = bloco.match(
        /<a rel="nofollow" class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/s,
      );
      const snippetMatch = bloco.match(/<a class="result__snippet"[^>]*>(.*?)<\/a>/s);
      const exibirUrlMatch = bloco.match(/<a class="result__url"[^>]*href="([^"]+)"/);

      if (tituloMatch) {
        const titulo = this.limparHtml(tituloMatch[2]);
        const url = this.limparUrl(tituloMatch[1]);
        const exibirUrl = exibirUrlMatch ? this.limparUrl(exibirUrlMatch[1]) : url;
        const resumo = snippetMatch ? this.limparHtml(snippetMatch[1]) : '';

        resultados.push({
          titulo,
          url,
          resumo,
          fonte: this.extrairDominio(exibirUrl),
        });
      }
    }

    return resultados;
  }

  private limparHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, (m) => String.fromCharCode(Number(m.slice(2, -1))))
      .trim();
  }

  private limparUrl(url: string): string {
    // DuckDuckGo ocasionalmente usa links de redirecionamento
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/l/?')) {
      const u = new URLSearchParams(url).get('uddg');
      if (u) return decodeURIComponent(u);
    }
    return url;
  }

  private extrairDominio(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return 'desconhecido';
    }
  }

  private userAgent(): string {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  private montarCookieHeader(cookies: Cookie[]): string {
    return cookies.map((c) => `${c.nome}=${c.valor}`).join('; ');
  }

  private coletarCookies(response: Response, cookies: Cookie[]): void {
    const setCookie =
      response.headers.getSetCookie?.() ?? response.headers.get('set-cookie')?.split(', ') ?? [];
    for (const raw of setCookie) {
      const [nomeValor] = raw.split(';');
      const [nome, ...resto] = nomeValor.trim().split('=');
      if (nome && resto.length > 0) {
        cookies.push({ nome: nome.trim(), valor: resto.join('=').trim() });
      }
    }
  }
}
