import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export enum TipoExercicio {
  QUESTAO_OBJETIVA = 'questao_objetiva',
  DISSERTATIVA = 'dissertativa',
  CODIGO = 'codigo',
  PROJETO = 'projeto',
}

export enum DificuldadeExercicio {
  FACIL = 'facil',
  MEDIO = 'medio',
  DIFICIL = 'dificil',
}

export class CriarExercicioDto {
  @IsUUID()
  moduloId!: string;

  @IsEnum(TipoExercicio)
  tipo!: TipoExercicio;

  @IsString()
  @MinLength(3)
  enunciado!: string;

  @IsString()
  @IsOptional()
  gabarito?: string;

  @IsEnum(DificuldadeExercicio)
  @IsOptional()
  dificuldade?: DificuldadeExercicio = DificuldadeExercicio.MEDIO;
}
