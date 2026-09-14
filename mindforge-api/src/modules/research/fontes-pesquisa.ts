import { z } from 'zod';
import { validarRespostaIa } from '../../common/ia/json-ia';
import { WebSearchResultado } from './search-provider.interface';

const texto = z.string().trim().min(1);
const resultadoSchema = z.object({
  estrategia: z.string().trim().optional(),
  fontes: z
    .array(
      z.object({
        tipo: z.enum(['documentacao_oficial', 'livro', 'artigo', 'video', 'outro']).catch('outro'),
        titulo: texto,
        resumo: texto,
        url: z.string().nullish(),
        autor: z.string().trim().nullish(),
        confiabilidadeScore: z.number().nullish(),
      }),
    )
    .min(1),
});

/** Comparação conservadora: query e caminho são preservados; fragmento não identifica outra página. */
export function normalizarUrlFonte(valor: string | null | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function validarResultadosWeb(resultados: WebSearchResultado[]): WebSearchResultado[] {
  const unicos = new Map<string, WebSearchResultado>();
  for (const resultado of resultados) {
    const url = normalizarUrlFonte(resultado.url);
    if (url && !unicos.has(url)) unicos.set(url, { ...resultado, url });
  }
  return [...unicos.values()];
}

export function interpretarFontes(raw: string, resultados: WebSearchResultado[], limite: number) {
  const resultado = validarRespostaIa(raw, resultadoSchema, 'Researcher');
  const urlsEncontradas = new Set(resultados.map((r) => r.url));
  const unicas = new Set<string>();
  const fontes = resultado.fontes
    .map((fonte) => {
      const candidata = normalizarUrlFonte(fonte.url);
      const url = candidata && urlsEncontradas.has(candidata) ? candidata : null;
      return {
        ...fonte,
        url,
        autor: fonte.autor || null,
        origem: url ? ('busca_web' as const) : ('sugestao_ia' as const),
        // Estimativa do modelo, sem equivalência com validação factual.
        confiabilidadeScore:
          fonte.confiabilidadeScore == null
            ? null
            : Math.min(1, Math.max(0, Math.round(fonte.confiabilidadeScore * 100) / 100)),
      };
    })
    .filter((fonte) => {
      const chave = fonte.url ?? `sugestao:${fonte.titulo.toLocaleLowerCase('pt-BR')}`;
      if (unicas.has(chave)) return false;
      unicas.add(chave);
      return true;
    })
    .slice(0, limite);
  return { estrategia: resultado.estrategia || 'Fontes curadas por relevância ao módulo', fontes };
}
