import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class GerarAudioQueryDto {
  @IsString()
  @Length(1, 500)
  texto!: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  idioma?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z]{2}-[a-zA-Z]{2}-[a-zA-Z0-9]+Neural$/, {
    message: "Voz inválida — formato esperado: 'pt-BR-FranciscaNeural'",
  })
  voz?: string;
}
