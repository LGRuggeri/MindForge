import { IsOptional, IsUUID } from 'class-validator';

export class GerarProjetoDto {
  @IsUUID()
  perfilId!: string;

  @IsUUID()
  @IsOptional()
  moduloId?: string;

  @IsUUID()
  @IsOptional()
  objetivoId?: string;
}
