import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const AGENTES = ['planner', 'researcher', 'synthesizer', 'teacher', 'evaluator', 'reviewer'] as const;
const STATUS = ['sucesso', 'erro'] as const;

export class ListarExecucoesQueryDto {
  @IsOptional()
  @IsIn(AGENTES)
  agente?: (typeof AGENTES)[number];

  @IsOptional()
  @IsIn(STATUS)
  status?: (typeof STATUS)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  // Teto de segurança: valores acima de MAX_SAFE_INTEGER passam no IsInt
  // (ex.: 1e20) mas estouram o bigint do OFFSET no Postgres (500).
  @Max(Number.MAX_SAFE_INTEGER)
  offset: number = 0;
}
