import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

export function selecionarIndices(total: number, indices?: number[]): number[] {
  if (indices === undefined) return Array.from({ length: total }, (_, i) => i + 1);
  if (
    !indices.length ||
    new Set(indices).size !== indices.length ||
    indices.some((i) => !Number.isInteger(i) || i < 1 || i > total)
  ) {
    throw new BadRequestException('Selecione módulos válidos, sem repetições, dentro da grade.');
  }
  return [...indices].sort((a, b) => a - b);
}

const programaSchema = z.object({
  codigo: z.string(),
  nome: z.string(),
  tipo: z.enum(['certificacao', 'assunto', 'concurso']).optional(),
  modoEstudoPadrao: z.enum(['completo', 'concurso']).optional(),
  fonteOficial: z.string().optional(),
  modulos: z.array(
    z.object({
      titulo: z.string(),
      objetivoAprendizagem: z.string(),
      topicosObrigatorios: z.array(z.string()).optional(),
    }),
  ),
});
const metadataSchema = z.object({
  programa: programaSchema.optional(),
  certificacao: programaSchema.optional(),
  modulosIndices: z.array(z.number().int().positive()).optional(),
});

/** Resolve pelo retrato persistido, sem reclassificar trilhas históricas pelo catálogo atual. */
export function resolverEscopoModulo(modulo: { ordem?: number; trilha?: { metadata?: unknown } }) {
  const parsed = metadataSchema.safeParse(modulo.trilha?.metadata);
  if (!parsed.success || !modulo.ordem) return undefined;
  const programa = parsed.data.programa ?? parsed.data.certificacao;
  if (!programa) return undefined;
  const indice = parsed.data.modulosIndices?.[modulo.ordem - 1] ?? modulo.ordem;
  const item = programa.modulos[indice - 1];
  if (!item) return undefined;
  return {
    programaCodigo: programa.codigo,
    programaNome: programa.nome,
    modoEstudoPadrao: programa.modoEstudoPadrao ?? 'completo',
    topicosObrigatorios: item.topicosObrigatorios?.length
      ? item.topicosObrigatorios
      : [item.objetivoAprendizagem],
    fonteOficial: programa.fonteOficial,
  };
}
