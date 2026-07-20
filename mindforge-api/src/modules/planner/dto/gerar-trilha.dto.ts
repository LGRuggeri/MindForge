import { IsUUID } from 'class-validator';

export class GerarTrilhaDto {
  @IsUUID()
  objetivoId!: string;
}
