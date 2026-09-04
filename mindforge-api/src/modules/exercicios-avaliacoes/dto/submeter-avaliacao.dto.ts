import { IsArray, IsUUID, ValidateNested } from 'class-validator';
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
  perfilId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RespostaAvaliacaoDto)
  respostas!: RespostaAvaliacaoDto[];
}
