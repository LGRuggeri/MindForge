import { IsDateString, IsInt, IsUUID, Matches, Max, Min } from 'class-validator';

export class ConcluirRevisaoDto {
  @IsUUID()
  perfilId!: string;

  @IsInt()
  @Min(0)
  @Max(5)
  qualidade!: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  proximaRevisaoEsperada!: string;
}
