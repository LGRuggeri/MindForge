import { ArrayMinSize, ArrayUnique, IsArray, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { programas } from '../trilhas-guiadas/catalogo';

export class SelecaoProgramaDto {
  @IsOptional()
  @IsIn(programas.map((p) => p.codigo))
  programaCodigo?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  modulosIndices?: number[];
}
