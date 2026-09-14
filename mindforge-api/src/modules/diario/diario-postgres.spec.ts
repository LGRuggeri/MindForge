import { randomUUID } from 'node:crypto';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import { DiarioRepository } from './diario.repository';
import * as schema from '../../database/schema';

comSql('Diário — persistência e rollback no PostgreSQL', () => {
  const banco = new PostgresIsolado();
  let repo: DiarioRepository;
  let ciclo: Awaited<ReturnType<typeof criarCiclo>>;
  beforeAll(async () => {
    await banco.iniciar();
    repo = new DiarioRepository(banco.bancos[0]);
  });
  beforeEach(async () => {
    await banco.limpar();
    ciclo = await criarCiclo(banco.bancos[0]);
  });
  afterAll(async () => {
    await banco.encerrar();
  });

  it('reverte o diário inteiro quando o vínculo com módulo inexistente falha', async () => {
    await expect(
      repo.criar({ perfilId: ciclo.perfil.id, data: '2026-09-01' }, [
        ciclo.modulo.id,
        randomUUID(),
      ]),
    ).rejects.toThrow();
    expect(await banco.bancos[0].select().from(schema.diarioAprendizagem)).toEqual([]);
    expect(await banco.bancos[0].select().from(schema.diarioModulos)).toEqual([]);
  });

  it('persiste módulos sem duplicatas e atualiza recomendações', async () => {
    const diario = await repo.criar(
      { perfilId: ciclo.perfil.id, data: '2026-09-01', conquistas: 'Transações' },
      [ciclo.modulo.id, ciclo.modulo.id],
    );
    expect(diario?.modulos.map((m) => m.moduloId)).toEqual([ciclo.modulo.id]);
    expect(
      (await repo.atualizarRecomendacoes(diario!.id, 'Praticar rollback')).recomendacoesIa,
    ).toBe('Praticar rollback');
    expect((await repo.buscarPorId(diario!.id))?.conquistas).toBe('Transações');
    expect(await repo.buscarPorId(randomUUID())).toBeUndefined();
  });

  it('filtra perfil, ordena datas, aplica limite e conta propriedade dos módulos', async () => {
    const outro = await criarCiclo(banco.bancos[0], 'Outro');
    await repo.criar({ perfilId: outro.perfil.id, data: '2026-09-03' });
    const antigo = await repo.criar({ perfilId: ciclo.perfil.id, data: '2026-09-01' });
    const recente = await repo.criar({ perfilId: ciclo.perfil.id, data: '2026-09-02' });
    expect((await repo.listarPorPerfil(ciclo.perfil.id)).map((d) => d.id)).toEqual([
      recente!.id,
      antigo!.id,
    ]);
    expect((await repo.listarPorPerfil(ciclo.perfil.id, 1)).map((d) => d.id)).toEqual([
      recente!.id,
    ]);
    expect(
      await repo.contarModulosDoPerfil(ciclo.perfil.id, [
        ciclo.modulo.id,
        outro.modulo.id,
        randomUUID(),
      ]),
    ).toBe(1);
    expect(await repo.contarModulosDoPerfil(ciclo.perfil.id, [])).toBe(0);
    expect(await repo.contarModulosDoPerfil(outro.perfil.id, [ciclo.modulo.id])).toBe(0);
    await expect(repo.criar({ perfilId: ciclo.perfil.id, data: '2026-09-02' })).rejects.toThrow();
    expect(await repo.listarPorPerfil(ciclo.perfil.id)).toHaveLength(2);
  });
});
