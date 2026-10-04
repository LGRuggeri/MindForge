import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class PerfilAtividadeDto {
  @IsUUID()
  perfilId!: string;
}

export class ResponderAtividadeDto extends PerfilAtividadeDto {
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(10000)
  resposta!: string;
}
