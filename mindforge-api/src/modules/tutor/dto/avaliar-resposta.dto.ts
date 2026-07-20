import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class AvaliarRespostaDto {
  @IsUUID()
  duvidaId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  avaliacao!: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
