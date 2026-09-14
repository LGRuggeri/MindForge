import { randomUUID } from 'node:crypto';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';

comSql('Exercícios — consultas, estatísticas e transações SQL', () => {
  const banco = new PostgresIsolado();
  let repo: ExerciciosAvaliacoesRepository;
  let ciclo: Awaited<ReturnType<typeof criarCiclo>>;
  beforeAll(async () => {
    await banco.iniciar();
    repo = new ExerciciosAvaliacoesRepository(banco.bancos[0]);
  });
  beforeEach(async () => {
    await banco.limpar();
    ciclo = await criarCiclo(banco.bancos[0]);
  });
  afterAll(async () => {
    await banco.encerrar();
  });
  const exercicio = (enunciado: string, moduloId = ciclo.modulo.id, dia = '01') =>
    repo.criarExercicio({
      moduloId,
      enunciado,
      tipo: 'questao_objetiva',
      gabarito: 'Privado',
      criterios: ['Privado'],
      criadoEm: new Date(`2026-09-${dia}`),
    });

  it('filtra exercícios por módulo/trilha e omite gabarito na projeção pública', async () => {
    const db = banco.bancos[0];
    const outro = await criarCiclo(db, 'Outro');
    const [m2] = await db
      .insert(schema.modulosTrilha)
      .values({ trilhaId: ciclo.trilha.id, titulo: 'Segundo', ordem: 2 })
      .returning();
    const a = await exercicio('A');
    const b = await exercicio('B', ciclo.modulo.id, '02');
    const c = await exercicio('C', m2.id, '03');
    await exercicio('Outro', outro.modulo.id);
    expect((await repo.listarExerciciosPorModulo(ciclo.modulo.id)).map((e) => e.id)).toEqual([
      b.id,
      a.id,
    ]);
    expect((await repo.listarExerciciosPorTrilha(ciclo.trilha.id)).map((e) => e.id)).toEqual([
      c.id,
      b.id,
      a.id,
    ]);
    expect((await repo.listarExerciciosPorModulos([m2.id])).map((e) => e.id)).toEqual([c.id]);
    expect(await repo.listarExerciciosPorModulos([])).toEqual([]);
    expect(await repo.listarExerciciosPorTrilha(randomUUID())).toEqual([]);
    expect((await repo.listarModulosDaTrilha(ciclo.trilha.id)).map((m) => m.id)).toEqual([
      ciclo.modulo.id,
      m2.id,
    ]);
    expect(await repo.buscarModuloDaAvaliacao(ciclo.modulo.id)).toMatchObject({
      trilha: { objetivo: { perfilId: ciclo.perfil.id } },
    });
    expect(await repo.buscarTrilhaDaAvaliacao(ciclo.trilha.id)).toMatchObject({
      objetivo: { perfilId: ciclo.perfil.id },
    });
    expect(await repo.buscarExercicioPorId(a.id)).toMatchObject({
      modulo: { id: ciclo.modulo.id },
      gabarito: 'Privado',
    });
    const publicos = await repo.listarExerciciosPublicosPorModulo(ciclo.modulo.id);
    expect(publicos.map((e) => e.id)).toEqual([b.id, a.id]);
    for (const e of publicos) {
      expect(e).not.toHaveProperty('gabarito');
      expect(e).not.toHaveProperty('criterios');
    }
  });

  it('cria avaliação com vínculos atômicos e recusa FK inválida sem deixar avaliação parcial', async () => {
    const a = await exercicio('A');
    const b = await exercicio('B');
    const dados = { titulo: 'Avaliação', tipo: 'formativa', moduloId: ciclo.modulo.id };
    const criada = await repo.criarAvaliacaoComExercicios(dados, [a.id, b.id]);
    expect(criada.exerciciosAdicionados).toBe(2);
    const avaliacao = await repo.buscarAvaliacaoPorId(criada.avaliacaoId);
    expect(avaliacao?.exercicios.map((e) => e.exercicioId).sort()).toEqual([a.id, b.id].sort());
    expect(avaliacao?.exercicios[0].exercicio).not.toHaveProperty('gabarito');
    expect(avaliacao).toMatchObject({
      modulo: { trilha: { objetivo: { perfilId: ciclo.perfil.id } } },
    });
    await expect(repo.criarAvaliacaoComExercicios(dados, [a.id, randomUUID()])).rejects.toThrow();
    expect(await banco.bancos[0].select().from(schema.avaliacoes)).toHaveLength(1);
    expect(await banco.bancos[0].select().from(schema.avaliacaoExercicios)).toHaveLength(2);
    expect((await repo.criarAvaliacaoComExercicios(dados, [])).exerciciosAdicionados).toBe(0);
    const direta = await repo.criarAvaliacao(dados);
    expect(await repo.adicionarExerciciosNaAvaliacao([])).toEqual([]);
    expect(
      await repo.adicionarExerciciosNaAvaliacao([
        { avaliacaoId: direta.id, exercicioId: a.id, ordem: 1 },
      ]),
    ).toHaveLength(1);
  });

  it('isola tentativas por avaliação e perfil e calcula estatísticas vazias/com notas nulas', async () => {
    const a = await exercicio('A');
    const b = await exercicio('B');
    const outro = await criarCiclo(banco.bancos[0], 'Outro');
    expect(await repo.calcularEstatisticasPorExercicio(a.id)).toEqual({
      total: 0,
      corretas: 0,
      incorretas: 0,
      pontuacaoMedia: null,
    });
    expect(await repo.contarTentativasPorExercicio(a.id)).toBe(0);
    const avaliacao = await repo.criarAvaliacao({
      moduloId: ciclo.modulo.id,
      titulo: 'A',
      tipo: 'formativa',
    });
    const base = { exercicioId: a.id, perfilId: ciclo.perfil.id, respostaUsuario: 'Resposta' };
    await repo.salvarTentativa({
      ...base,
      correta: true,
      pontuacao: '10',
      respondidoEm: new Date('2026-09-01'),
    });
    const vinculada = await repo.salvarTentativa({
      ...base,
      avaliacaoId: avaliacao.id,
      correta: false,
      pontuacao: '2',
      respondidoEm: new Date('2026-09-02'),
    });
    await repo.salvarTentativa({
      ...base,
      perfilId: outro.perfil.id,
      avaliacaoId: avaliacao.id,
      correta: null,
      pontuacao: null,
      respondidoEm: new Date('2026-09-03'),
    });
    await repo.salvarTentativa({ ...base, exercicioId: b.id });
    expect(await repo.contarTentativasPorExercicio(a.id)).toBe(3);
    expect(await repo.calcularEstatisticasPorExercicio(a.id)).toEqual({
      total: 3,
      corretas: 1,
      incorretas: 2,
      pontuacaoMedia: 4,
    });
    expect(
      (await repo.listarTentativasPorExercicio(a.id)).map((t) =>
        t.respondidoEm.toISOString().slice(0, 10),
      ),
    ).toEqual(['2026-09-03', '2026-09-02', '2026-09-01']);
    expect(
      (await repo.listarTentativasPorExercicioEAvaliacao(a.id, avaliacao.id, ciclo.perfil.id)).map(
        (t) => t.id,
      ),
    ).toEqual([vinculada.id]);
    expect(
      await repo.listarTentativasPorExercicioEAvaliacao(a.id, randomUUID(), ciclo.perfil.id),
    ).toEqual([]);
    await expect(repo.salvarTentativa({ ...base, avaliacaoId: randomUUID() })).rejects.toThrow(
      'Avaliação não encontrada',
    );
    expect(await repo.contarTentativasPorExercicio(a.id)).toBe(3);
  });
});
