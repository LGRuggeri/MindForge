import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class SubmeterTentativaDto {
  @IsUUID()
  exercicioId!: string;

  @IsString()
  @MinLength(1)
  respostaUsuario!: string;

  @IsUUID()
  @IsOptional()
  perfilId?: string;

  @IsBoolean()
  @IsOptional()
  async?: boolean;
}
