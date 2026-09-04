import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class PesquisarDto {
  @IsUUID()
  moduloId!: string;

  @IsString()
  @IsOptional()
  topico?: string;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  limite?: number;

  @IsBoolean()
  @IsOptional()
  webSearch?: boolean;

  @IsBoolean()
  @IsOptional()
  async?: boolean;
}
