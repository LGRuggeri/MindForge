import 'reflect-metadata';
import { validate } from 'class-validator';
import { ListarExecucoesQueryDto } from './listar-execucoes-query.dto';

describe('ListarExecucoesQueryDto', () => {
  it('aceita valores padrão', async () => {
    const dto = new ListarExecucoesQueryDto();

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.limite).toBe(50);
    expect(dto.offset).toBe(0);
  });

  it('rejeita offset maior que MAX_SAFE_INTEGER (ex.: 1e20 do Postgres bigint)', async () => {
    const dto = new ListarExecucoesQueryDto();
    dto.offset = 1e20;

    const erros = await validate(dto);

    expect(erros.some((erro) => erro.property === 'offset')).toBe(true);
  });

  it('aceita offset dentro do limite seguro', async () => {
    const dto = new ListarExecucoesQueryDto();
    dto.offset = Number.MAX_SAFE_INTEGER;

    expect(await validate(dto)).toHaveLength(0);
  });

  it('rejeita agente e status fora das listas permitidas', async () => {
    const dto = new ListarExecucoesQueryDto();
    // Forçar valores inválidos para exercitar os @IsIn
    Object.assign(dto, { agente: 'intruso', status: 'pendente' });

    const erros = await validate(dto);

    expect(erros.map((erro) => erro.property)).toEqual(
      expect.arrayContaining(['agente', 'status']),
    );
  });
});
