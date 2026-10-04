import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export type ModoEstudo = 'resumo' | 'completo' | 'concurso';

export class GerarConteudoDto {
  @IsUUID()
  moduloId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  topico!: string;

  @IsIn(['resumo', 'completo', 'concurso'])
  @IsOptional()
  modoEstudo?: ModoEstudo;

  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(300, { each: true })
  @IsOptional()
  topicosObrigatorios?: string[];

  @IsString()
  @IsOptional()
  nivelAlvo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  instrucoesExtras?: string;

  @IsBoolean()
  @IsOptional()
  atualizarFontes?: boolean;

  @IsBoolean()
  @IsOptional()
  async?: boolean;
}
