import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SubmeterTentativaDto {
  @IsUUID()
  @IsOptional()
  exercicioId?: string;

  @IsUUID()
  @IsOptional()
  avaliacaoId?: string;

  @IsString()
  @MinLength(1)
  respostaUsuario!: string;

  @IsUUID()
  perfilId!: string;

  @IsBoolean()
  @IsOptional()
  async?: boolean;
}
