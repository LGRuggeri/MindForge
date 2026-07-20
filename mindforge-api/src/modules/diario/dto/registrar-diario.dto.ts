import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RegistrarDiarioDto {
  @IsUUID()
  perfilId!: string;

  @IsDateString()
  @IsOptional()
  data?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  tempoInvestidoMin?: number;

  @IsString()
  @IsOptional()
  dificuldades?: string;

  @IsString()
  @IsOptional()
  conquistas?: string;

  @IsUUID('all', { each: true })
  @IsOptional()
  moduloIds?: string[];
}
