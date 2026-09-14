import { ConfigService } from '@nestjs/config';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import { exercicios } from '../../database/schema';
import { SandboxRepository } from './sandbox.repository';
import { SandboxService } from './sandbox.service';

comSql('Sandbox — escopo resolvido no PostgreSQL', () => {
  const banco = new PostgresIsolado();
  beforeAll(async () => {
    await banco.iniciar();
  });
  afterAll(async () => {
    await banco.encerrar();
  });
  it('resolve o proprietário real e não altera tentativas ao executar', async () => {
    const db = banco.bancos[0];
    const ciclo = await criarCiclo(db);
    const outro = await criarCiclo(db, 'Outro');
    const [exercicio] = await db
      .insert(exercicios)
      .values({ moduloId: ciclo.modulo.id, tipo: 'codigo', enunciado: 'Imprima uma soma' })
      .returning();
    const repo = new SandboxRepository(banco.bancos[1]);
    expect(await repo.buscarExercicio(exercicio.id)).toEqual({
      tipo: 'codigo',
      perfilId: ciclo.perfil.id,
    });
    expect(await repo.buscarExercicio(outro.modulo.id)).toBeUndefined();
    const executor = { executar: jest.fn().mockResolvedValue({ stdout: '4' }) };
    const service = new SandboxService(
      repo,
      executor as never,
      new ConfigService({ SANDBOX_ENABLED: 'true' }),
    );
    const dto = { perfilId: outro.perfil.id, linguagem: 'python' as const, codigo: 'print(2+2)' };
    await expect(service.executar(exercicio.id, dto)).rejects.toMatchObject({ status: 403 });
    expect(executor.executar).not.toHaveBeenCalled();
    expect(await service.executar(exercicio.id, { ...dto, perfilId: ciclo.perfil.id })).toEqual({
      stdout: '4',
    });
    expect(await db.query.tentativasExercicio.findMany()).toEqual([]);
  });
});
