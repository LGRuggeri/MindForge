import { IsUUID } from 'class-validator';

export class CriarProgressoModuloDto {
  @IsUUID()
  moduloId!: string;

  @IsUUID()
  perfilId!: string;
}
