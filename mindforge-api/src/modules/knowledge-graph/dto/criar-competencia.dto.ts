import { IsString, IsOptional } from 'class-validator';

export class CriarCompetenciaDto {
  @IsString()
  nome!: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsString()
  @IsOptional()
  categoria?: string;
}
