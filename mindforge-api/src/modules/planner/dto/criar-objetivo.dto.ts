import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SelecaoProgramaDto } from './selecao-programa.dto';

export class CriarObjetivoDto extends SelecaoProgramaDto {
  @IsUUID()
  perfilId!: string;

  @IsString()
  titulo!: string;

  @IsString()
  @IsOptional()
  descricao?: string;

  @IsEnum(['iniciante', 'intermediario', 'avancado'])
  @IsOptional()
  nivelDesejado?: 'iniciante' | 'intermediario' | 'avancado';

  @IsDateString()
  @IsOptional()
  prazoEstimado?: string;
}
