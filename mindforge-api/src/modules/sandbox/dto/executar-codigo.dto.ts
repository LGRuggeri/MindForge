import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class ExecutarCodigoDto {
  @IsUUID()
  perfilId!: string;

  @IsIn(['python', 'javascript'])
  linguagem!: 'python' | 'javascript';

  @IsString()
  @Matches(/\S/, { message: 'O código não pode estar vazio' })
  @MaxLength(16000)
  codigo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  entrada?: string;
}
