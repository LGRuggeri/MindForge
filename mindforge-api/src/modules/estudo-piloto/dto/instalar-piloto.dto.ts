import { IsUUID } from 'class-validator';

export class InstalarPilotoDto {
  @IsUUID()
  perfilId!: string;
}
