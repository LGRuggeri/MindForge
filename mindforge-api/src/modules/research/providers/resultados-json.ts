import { normalizarUrlFonte } from '../fontes-pesquisa';
import { WebSearchResultado } from '../search-provider.interface';

function objeto(valor: unknown): Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(item: Record<string, unknown>, ...chaves: string[]): string {
  for (const chave of chaves) {
    const valor = item[chave];
    if (typeof valor === 'string' && valor.trim()) return valor.trim();
  }
  return '';
}

/** Valida dados externos antes de aplicar o limite, preservando a ordem de relevância. */
export function extrairResultadosJson(json: unknown, limite: number): WebSearchResultado[] {
  const raiz = objeto(json);
  const candidatos =
    [raiz.organic, raiz.results, objeto(raiz.web).results].find(Array.isArray) ?? [];
  const resultados = new Map<string, WebSearchResultado>();
  for (const candidato of candidatos) {
    const item = objeto(candidato);
    const titulo = texto(item, 'titulo', 'title');
    const url = texto(item, 'url', 'link', 'href');
    const normalizada = normalizarUrlFonte(url);
    if (!titulo || !normalizada || resultados.has(normalizada)) continue;
    resultados.set(normalizada, {
      titulo,
      url,
      resumo: texto(item, 'resumo', 'snippet', 'content', 'description', 'descricao'),
      fonte: texto(item, 'fonte') || new URL(normalizada).hostname.replace(/^www\./, ''),
    });
  }
  return [...resultados.values()].slice(0, limite);
}
