import { IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CriarProjetoDto {
  @IsUUID()
  perfilId!: string;

  @IsUUID()
  @IsOptional()
  moduloId?: string;

  @IsUUID()
  @IsOptional()
  objetivoId?: string;

  @IsString()
  @MinLength(3)
  titulo!: string;

  @IsString()
  @MinLength(10)
  descricao!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  criterios?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dicas?: string[];
}
