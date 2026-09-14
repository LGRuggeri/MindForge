import { IsUUID } from 'class-validator';

export class ConcluirModuloDto {
  @IsUUID('all', { message: 'perfilId deve ser um UUID válido' })
  perfilId!: string;
}
