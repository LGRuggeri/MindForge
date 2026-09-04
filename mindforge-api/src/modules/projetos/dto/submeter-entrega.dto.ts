import { IsString, MinLength } from 'class-validator';

export class SubmeterEntregaDto {
  @IsString()
  @MinLength(3)
  conteudo!: string;
}
