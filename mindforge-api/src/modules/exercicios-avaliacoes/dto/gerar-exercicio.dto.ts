import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { DificuldadeExercicio, TipoExercicio } from './criar-exercicio.dto';

export class GerarExercicioDto {
  @IsUUID()
  moduloId!: string;

  @IsEnum(TipoExercicio)
  tipo!: TipoExercicio;

  @IsEnum(DificuldadeExercicio)
  @IsOptional()
  dificuldade?: DificuldadeExercicio = DificuldadeExercicio.MEDIO;

  @IsString()
  @IsOptional()
  @MinLength(3)
  instrucoesExtras?: string;

  @IsBoolean()
  @IsOptional()
  async?: boolean;
}
