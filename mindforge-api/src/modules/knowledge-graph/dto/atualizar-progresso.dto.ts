import { IsUUID, IsIn, IsString, IsOptional } from 'class-validator';

const niveis = ['nao_iniciado', 'aprendendo', 'praticando', 'dominado'] as const;

export class AtualizarProgressoDto {
  @IsUUID()
  competenciaId!: string;

  @IsUUID()
  perfilId!: string;

  @IsIn(niveis)
  nivel!: (typeof niveis)[number];

  @IsString()
  @IsOptional()
  evidencia?: string;
}
