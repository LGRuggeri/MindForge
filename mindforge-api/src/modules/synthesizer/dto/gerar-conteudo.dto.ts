import { IsOptional, IsString, IsUUID } from 'class-validator';

export class GerarConteudoDto {
  @IsUUID()
  moduloId!: string;

  @IsString()
  topico!: string;

  @IsString()
  @IsOptional()
  nivelAlvo?: string;

  @IsString()
  @IsOptional()
  instrucoesExtras?: string;
}
