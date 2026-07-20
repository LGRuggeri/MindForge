import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class TirarDuvidaDto {
  @IsUUID()
  perfilId!: string;

  @IsUUID()
  moduloId!: string;

  @IsString()
  @MinLength(3)
  pergunta!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  limiteChunks?: number = 5;
}
