import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class AtualizarPerfilDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nome?: string;

  @IsOptional()
  @IsString()
  objetivosGerais?: string;

  @IsOptional()
  @IsIn(['iniciante', 'intermediario', 'avancado'])
  nivelAtual?: 'iniciante' | 'intermediario' | 'avancado';

  @IsOptional()
  @IsObject()
  preferencias?: Record<string, unknown>;
}
