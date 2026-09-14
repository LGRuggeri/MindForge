import { randomUUID } from 'node:crypto';
import { PostgresIsolado, comSql } from '../../../test/postgres-isolado.test';
import { PerfilRepository } from './perfil.repository';
import { PlannerRepository } from '../planner/planner.repository';

comSql('Perfil — CRUD e objetivos no PostgreSQL', () => {
  const banco = new PostgresIsolado();
  beforeAll(async () => {
    await banco.iniciar();
  });
  beforeEach(async () => {
    await banco.limpar();
  });
  afterAll(async () => {
    await banco.encerrar();
  });
  it('lê e atualiza somente o perfil informado com seus objetivos', async () => {
    const repo = new PerfilRepository(banco.bancos[0]);
    const planner = new PlannerRepository(banco.bancos[0]);
    const a = await repo.criar({ nome: 'A' });
    const b = await repo.criar({ nome: 'B' });
    const objetivo = await planner.criarObjetivo({ perfilId: a.id, titulo: 'Objetivo A' });
    await planner.criarObjetivo({ perfilId: b.id, titulo: 'Objetivo B' });
    expect(await repo.listar()).toHaveLength(2);
    expect((await repo.buscarPorId(a.id))?.objetivos.map((o) => o.id)).toEqual([objetivo.id]);
    expect((await repo.atualizar(a.id, { nome: 'Atualizado' }))?.nome).toBe('Atualizado');
    expect((await repo.buscarPorId(b.id))?.nome).toBe('B');
    expect(await repo.atualizar(randomUUID(), { nome: 'Ausente' })).toBeUndefined();
    expect(await repo.buscarPorId(randomUUID())).toBeUndefined();
  });
});
