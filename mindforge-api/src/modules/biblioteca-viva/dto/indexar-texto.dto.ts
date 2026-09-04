import { IsBoolean, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class IndexarTextoDto {
  @IsString()
  @MinLength(1)
  texto!: string;

  @IsUUID()
  @IsOptional()
  conteudoId?: string;

  @IsUUID()
  @IsOptional()
  fonteId?: string;

  @IsBoolean()
  @IsOptional()
  async?: boolean;
}
