import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

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

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  exerciciosIds?: string[];

  @IsInt()
  @Min(1)
  @IsOptional()
  quantidade?: number;
}
