import { IsUUID, IsIn } from 'class-validator';

const tiposRelacao = ['pre_requisito', 'relacionada', 'aprofundamento'] as const;

export class CriarRelacaoDto {
  @IsUUID()
  competenciaOrigemId!: string;

  @IsUUID()
  competenciaDestinoId!: string;

  @IsIn(tiposRelacao)
  tipoRelacao!: (typeof tiposRelacao)[number];
}
