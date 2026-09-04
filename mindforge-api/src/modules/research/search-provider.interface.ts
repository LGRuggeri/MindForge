export interface WebSearchResultado {
  titulo: string;
  url: string;
  resumo: string;
  fonte: string;
}

export interface SearchProvider {
  buscar(consulta: string, limite?: number): Promise<WebSearchResultado[]>;
}
