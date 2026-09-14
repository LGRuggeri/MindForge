import { z } from 'zod';

const pesquisaSchema = z.object({
  moduloId: z.string().uuid(),
  resultadosWeb: z.number().int().min(0),
  fontes: z.array(
    z.object({
      id: z.string().uuid(),
      origem: z.enum(['busca_web', 'sugestao_ia', 'legado']),
    }),
  ),
});

/** Lista explícita de campos públicos; não repassa entrada, prompts nem erros do pg-boss. */
export function resultadoPublico(nome: string, valor: unknown) {
  if (nome !== 'research.pesquisar') return null;
  const resultado = pesquisaSchema.safeParse(valor);
  return resultado.success ? resultado.data : null;
}
