import { z } from 'zod';

// Não aplicar trim ao resultado: espaços e quebras podem fazer parte do código.
const textoNaoVazio = z.string().refine((valor) => valor.trim().length > 0);

export const respostaTutorSchema = z.object({
  resposta: textoNaoVazio,
  citacoes: z.array(z.string()),
  proximosPassos: z.array(z.string()),
  // Idioma inválido é opcional e segue o fallback de TTS já existente.
  idioma: z.string().catch('').optional(),
});

export const conteudoGeradoSchema = z.object({
  titulo: textoNaoVazio,
  corpoMarkdown: textoNaoVazio,
  resumo: z.string(),
  palavrasChave: z.array(textoNaoVazio),
  // Entradas inválidas mantêm a posição para não trocar [[imagem:N]] de seção.
  ilustracoes: z
    .array(z.object({ prompt: z.string() }).catch({ prompt: '' }))
    .catch([])
    .optional(),
});

export const avaliacaoReviewerSchema = z.object({
  nota: z.number().min(1).max(5),
  pontosFortes: z.array(z.string()),
  pontosFracos: z.array(z.string()),
  sugestoes: z.array(z.string()),
  criterios: z
    .object({
      profundidade: z.number().min(1).max(5),
      cobertura: z.number().min(1).max(5),
      fundamentacao: z.number().min(1).max(5),
      aplicacao: z.number().min(1).max(5),
    })
    .optional(),
  topicosPendentes: z.array(z.string()).optional(),
});

export const comentarioQuestaoSchema = z.object({
  explicacao: textoNaoVazio,
  alternativas: z
    .array(z.object({ alternativa: textoNaoVazio, explicacao: textoNaoVazio }))
    .max(8)
    .optional(),
  fontes: z.array(z.string().url()).max(8).optional(),
  topicoRevisao: textoNaoVazio.optional(),
});

export const exercicioGeradoSchema = z.object({
  enunciado: textoNaoVazio,
  gabarito: z
    .string()
    .nullish()
    .transform((valor) => valor ?? undefined),
  criterios: z
    .array(textoNaoVazio)
    .nullish()
    .transform((valor) => valor ?? undefined),
  dica: z.string().optional(),
  comentario: comentarioQuestaoSchema.nullish().transform((valor) => valor ?? undefined),
});
