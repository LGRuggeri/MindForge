import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export enum TipoAvaliacao {
  DIAGNOSTICA = 'diagnostica',
  FORMATIVA = 'formativa',
  SOMATIVA = 'somativa',
  SIMULADO = 'simulado',
}

export class CriarAvaliacaoDto {
  @IsUUID()
  @IsOptional()
  moduloId?: string;

  @IsUUID()
  @IsOptional()
  trilhaId?: string;

  @IsString()
  @MinLength(3)
  titulo!: string;

  @IsEnum(TipoAvaliacao)
  tipo!: TipoAvaliacao;

  @IsUUID('4', { each: true })
  @IsOptional()
  exerciciosIds?: string[];
}
