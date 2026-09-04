import { IsObject, IsOptional, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RespostaAvaliacaoDto {
  @IsUUID()
  exercicioId!: string;

  @IsUUID()
  tentativaId!: string;
}

export class SubmeterAvaliacaoDto {
  @IsUUID()
  avaliacaoId!: string;

  @IsUUID()
  @IsOptional()
  perfilId?: string;

  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => RespostaAvaliacaoDto)
  respostas!: RespostaAvaliacaoDto[];
}
