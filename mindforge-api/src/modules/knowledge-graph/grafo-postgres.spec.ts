import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';

comSql('Grafo — persistência, escopo e concorrência', () => {
  const banco = new PostgresIsolado();
  let repo: KnowledgeGraphRepository;
  let ciclo: Awaited<ReturnType<typeof criarCiclo>>;
  beforeAll(async () => {
    await banco.iniciar();
    repo = new KnowledgeGraphRepository(banco.bancos[0]);
  });
  beforeEach(async () => {
    await banco.limpar();
    ciclo = await criarCiclo(banco.bancos[0]);
  });
  afterAll(async () => {
    await banco.encerrar();
  });

  it('persiste progresso concorrente no mesmo item sem violar unicidade', async () => {
    const competencia = await repo.criarCompetencia({ nome: 'SQL' });
    const { pid } = (
      await banco.conexoes[1].query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
    ).rows[0];
    await banco.conexoes[0].query('BEGIN');
    const primeiro = await repo.atualizarProgresso(
      competencia.id,
      ciclo.perfil.id,
      'aprendendo',
      'Estudo',
    );
    const pendente = new KnowledgeGraphRepository(banco.bancos[1]).atualizarProgresso(
      competencia.id,
      ciclo.perfil.id,
      'dominado',
      'Avaliação',
    );
    void pendente.catch(() => undefined);
    try {
      await banco.aguardarBloqueio(pid);
    } finally {
      await banco.conexoes[0].query('COMMIT');
    }
    const segundo = await pendente;
    expect(segundo.id).toBe(primeiro.id);
    expect(await banco.bancos[0].select().from(schema.competenciaProgresso)).toHaveLength(1);
    expect(await repo.buscarProgressoDoPerfil(ciclo.perfil.id, competencia.id)).toMatchObject({
      nivelAtual: 'dominado',
      evidencia: 'Avaliação',
    });
  });

  it('mantém vínculos e relações idempotentes e restringe o progresso ao perfil', async () => {
    const outro = await criarCiclo(banco.bancos[0], 'Outro');
    const inicial = await repo.criarCompetencia({ nome: 'A — Básico' });
    const avancada = await banco.bancos[0].transaction((tx) =>
      repo.criarCompetencia({ nome: 'B — Avançado' }, tx),
    );
    const privada = await repo.criarCompetencia({ nome: 'C — Outro perfil' });
    expect(await repo.buscarCompetenciaPorNome(inicial.nome)).toMatchObject({ id: inicial.id });
    await banco.bancos[0].transaction(async (tx) => {
      expect(await repo.buscarCompetenciaPorNome(avancada.nome, tx)).toMatchObject({
        id: avancada.id,
      });
      await repo.vincularModuloCompetencias(
        [
          { moduloId: ciclo.modulo.id, competenciaId: inicial.id },
          { moduloId: ciclo.modulo.id, competenciaId: avancada.id },
        ],
        tx,
      );
      const relacao = {
        competenciaOrigemId: inicial.id,
        competenciaDestinoId: avancada.id,
        tipoRelacao: 'pre_requisito',
      };
      expect(await repo.criarRelacaoSeNaoExistir(relacao, tx)).toBeDefined();
      expect(await repo.criarRelacaoSeNaoExistir(relacao, tx)).toBeUndefined();
    });
    expect(await repo.vincularModuloCompetencias([])).toEqual([]);
    expect(
      await repo.vincularModuloCompetencias([
        { moduloId: ciclo.modulo.id, competenciaId: inicial.id },
      ]),
    ).toEqual([]);
    await repo.vincularModuloCompetencias([
      { moduloId: outro.modulo.id, competenciaId: privada.id },
    ]);
    await repo.atualizarProgresso(inicial.id, ciclo.perfil.id, 'aprendendo', 'Pessoal');
    await repo.atualizarProgresso(inicial.id, outro.perfil.id, 'dominado', 'Outro segredo');
    expect((await repo.buscarCompetenciaPorId(inicial.id, ciclo.perfil.id))?.progresso).toEqual([
      expect.objectContaining({ perfilId: ciclo.perfil.id }),
    ]);
    expect(await repo.buscarCompetenciaPorId(inicial.id)).not.toHaveProperty('progresso');
    expect(
      (await repo.listarCompetenciasDoModulo(ciclo.modulo.id)).map((v) => v.competenciaId).sort(),
    ).toEqual([inicial.id, avancada.id].sort());
    expect((await repo.listarCompetenciasDoPerfil(ciclo.perfil.id)).map((c) => c.id)).toEqual([
      inicial.id,
      avancada.id,
    ]);
    expect((await repo.listarCompetencias()).map((c) => c.nome)).toEqual([
      inicial.nome,
      avancada.nome,
      privada.nome,
    ]);
    expect((await repo.recomendarCompetencias(ciclo.perfil.id)).map((c) => c.id)).toEqual([
      inicial.id,
    ]);
    await repo.atualizarProgresso(inicial.id, ciclo.perfil.id, 'dominado');
    expect((await repo.recomendarCompetencias(ciclo.perfil.id)).map((c) => c.id)).toEqual([
      avancada.id,
    ]);
    const grafo = await repo.buscarGrafoVisualDoPerfil(ciclo.perfil.id);
    expect(grafo.nodes.map((n) => n.id).sort()).toEqual([inicial.id, avancada.id].sort());
    expect(grafo.edges).toEqual([
      expect.objectContaining({ source: inicial.id, target: avancada.id }),
    ]);
    expect(
      (await repo.buscarCaminhoDePreRequisitos(avancada.id, ciclo.perfil.id)).map((c) => c.id),
    ).toEqual([inicial.id]);
    expect((await repo.buscarDependentes(inicial.id)).map((c) => c.id)).toEqual([avancada.id]);
    expect(await repo.buscarDependentes(inicial.id, outro.perfil.id)).toEqual([]);
  });
});
