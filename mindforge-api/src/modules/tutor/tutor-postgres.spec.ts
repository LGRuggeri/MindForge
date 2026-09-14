import { randomUUID } from 'node:crypto';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import { TutorRepository } from './tutor.repository';

comSql('Tutor — histórico por perfil no PostgreSQL', () => {
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

  it('persiste dúvida com citações/idioma e mantém escopo, ordem e limites', async () => {
    const repo = new TutorRepository(banco.bancos[0]);
    const a = await criarCiclo(banco.bancos[0], 'A');
    const b = await criarCiclo(banco.bancos[0], 'B');
    const antigos = [];
    for (const dia of [1, 2, 3])
      antigos.push(
        await repo.salvarDuvida({
          perfilId: a.perfil.id,
          moduloId: a.modulo.id,
          pergunta: `Pergunta ${dia}`,
          resposta: 'Resposta',
          idiomaResposta: 'en-US',
          citacoes: [{ titulo: 'Fonte' }],
          criadoEm: new Date(`2026-09-0${dia}`),
        }),
      );
    await repo.salvarDuvida({
      perfilId: b.perfil.id,
      moduloId: b.modulo.id,
      pergunta: 'Privada',
      resposta: 'Outro perfil',
    });
    const esperados = antigos.map((d) => d.id).reverse();
    expect((await repo.listarHistoricoPorPerfil(a.perfil.id)).map((d) => d.id)).toEqual(esperados);
    expect((await repo.listarHistoricoPorPerfil(a.perfil.id, 1)).map((d) => d.id)).toEqual(
      esperados.slice(0, 1),
    );
    expect((await repo.listarHistoricoRecentePorPerfil(a.perfil.id, 2)).map((d) => d.id)).toEqual(
      esperados.slice(0, 2),
    );
    expect(await repo.listarHistoricoRecentePorPerfil(b.perfil.id)).toHaveLength(1);
    expect(await repo.buscarDuvidaPorId(antigos[0].id)).toMatchObject({
      idiomaResposta: 'en-US',
      citacoes: [{ titulo: 'Fonte' }],
    });
    expect(await repo.buscarModuloPorId(a.modulo.id)).toMatchObject({
      trilha: { objetivo: { perfilId: a.perfil.id } },
    });
    expect(await repo.buscarDuvidaPorId(randomUUID())).toBeUndefined();
    expect(await repo.avaliarDuvida(antigos[0].id, 5, 'Útil')).toMatchObject({
      avaliacao: 5,
      feedback: 'Útil',
    });
    expect(await repo.avaliarDuvida(antigos[0].id, 4)).toMatchObject({
      avaliacao: 4,
      feedback: 'Útil',
    });
    await expect(repo.avaliarDuvida(antigos[0].id, 6)).rejects.toThrow();
    expect((await repo.buscarDuvidaPorId(antigos[0].id))?.avaliacao).toBe(4);
  });
});
