import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CriarObjetivoDto {
  @IsUUID()
  perfilId!: string;

  @IsString()
  titulo!: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsEnum(['iniciante', 'intermediario', 'avancado'])
  @IsOptional()
  nivelDesejado?: 'iniciante' | 'intermediario' | 'avancado';

  @IsDateString()
  @IsOptional()
  prazoEstimado?: string;
}
