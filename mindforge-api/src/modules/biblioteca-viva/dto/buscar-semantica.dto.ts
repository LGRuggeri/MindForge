import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class BuscarSemanticaDto {
  @IsString()
  @MinLength(3)
  consulta!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  limite?: number = 5;

  @IsUUID()
  @IsOptional()
  moduloId?: string;

  @IsBoolean()
  @IsOptional()
  async?: boolean;
}
