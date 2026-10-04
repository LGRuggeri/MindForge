import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { listarCertificacoes } from '../trilhas-guiadas/catalogo';
import { SelecaoProgramaDto } from './selecao-programa.dto';

export class GerarTrilhaDto extends SelecaoProgramaDto {
  @IsUUID()
  objetivoId!: string;

  /** Compatibilidade com o primeiro piloto AZ-900. */
  @IsOptional()
  @IsIn(listarCertificacoes().map((programa) => programa.codigo))
  certificacaoCodigo?: string;
}
