import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { PostgresIsolado, comSql } from '../../../test/postgres-isolado.test';
import { agentesExecucoes } from '../../database/schema';
import { AgentesRepository } from './agentes.repository';

comSql('Agentes — filtros, paginação e projeção pública SQL', () => {
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

  it('filtra execuções e pagina sem entrada/saída privadas', async () => {
    const repo = new AgentesRepository(banco.bancos[0]);
    const itens = [
      { agente: 'planner', status: 'sucesso' },
      { agente: 'teacher', status: 'erro' },
      { agente: 'planner', status: 'erro' },
    ];
    for (const item of itens) {
      await repo.registrar({
        ...item,
        entrada: { segredo: 'Privado' },
        saida: { resposta: 'Privada' },
        tokensUtilizados: 10,
      });
    }
    // Datas distintas para garantir ordem determinística dos três registros.
    const todos = await banco.bancos[0].select().from(agentesExecucoes);
    for (const [indice, registro] of todos.entries())
      await banco.bancos[0]
        .update(agentesExecucoes)
        .set({ criadoEm: new Date(`2026-09-0${indice + 1}`) })
        .where(eq(agentesExecucoes.id, registro.id));
    const lista = await repo.listar({ limite: 10, offset: 0 });
    expect(lista).toHaveLength(3);
    expect(lista.map((item) => item.id)).toEqual(todos.map((item) => item.id).reverse());
    for (const registro of lista) {
      expect(registro).not.toHaveProperty('entrada');
      expect(registro).not.toHaveProperty('saida');
    }
    expect(await repo.listar({ limite: 1, offset: 1 })).toEqual([lista[1]]);
    expect(await repo.listar({ agente: 'planner', limite: 10, offset: 0 })).toHaveLength(2);
    expect(await repo.listar({ status: 'erro', limite: 10, offset: 0 })).toHaveLength(2);
    expect(
      await repo.listar({ agente: 'teacher', status: 'sucesso', limite: 10, offset: 0 }),
    ).toEqual([]);
    expect(await repo.buscarPorId(lista[0].id)).toMatchObject({
      entrada: { segredo: 'Privado' },
      saida: { resposta: 'Privada' },
    });
    expect(await repo.buscarPorId(randomUUID())).toBeUndefined();
  });
});
