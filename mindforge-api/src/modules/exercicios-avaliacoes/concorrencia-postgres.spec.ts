import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';
import { AvaliacoesService } from './avaliacoes.service';
import { RevisaoEspacadaRepository } from './revisao-espacada.repository';
import { RevisaoEspacadaService } from './revisao-espacada.service';

comSql('Avaliações — concorrência e rollback em conexões distintas', () => {
  const banco = new PostgresIsolado();
  let ciclo: Awaited<ReturnType<typeof criarCiclo>>;
  let avaliacaoId: string;
  let exercicioId: string;
  beforeAll(async () => {
    await banco.iniciar();
  });
  beforeEach(async () => {
    await banco.limpar();
    ciclo = await criarCiclo(banco.bancos[0]);
    const repo = new ExerciciosAvaliacoesRepository(banco.bancos[0]);
    const exercicio = await repo.criarExercicio({
      moduloId: ciclo.modulo.id,
      tipo: 'questao_objetiva',
      enunciado: 'Pergunta',
      gabarito: 'Resposta',
    });
    exercicioId = exercicio.id;
    avaliacaoId = (
      await repo.criarAvaliacaoComExercicios(
        { moduloId: ciclo.modulo.id, titulo: 'Avaliação', tipo: 'simulado' },
        [exercicioId],
      )
    ).avaliacaoId;
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await banco.encerrar();
  });
  const criarService = (indice: number) => {
    const db = banco.bancos[indice];
    const revisao = new RevisaoEspacadaService(new RevisaoEspacadaRepository(db));
    const service = new AvaliacoesService(
      new ExerciciosAvaliacoesRepository(db),
      revisao,
      { marcarProgressoPorModulo: jest.fn() } as never,
      db,
    );
    return { service, revisao };
  };
  const dto = () => ({ perfilId: ciclo.perfil.id, avaliacaoId, respostas: [] });

  it('duas finalizações simultâneas retornam o mesmo resultado e agendam revisão uma única vez', async () => {
    const repo = new ExerciciosAvaliacoesRepository(banco.bancos[0]);
    const tentativas = await Promise.all(
      ['0', '10'].map((pontuacao) =>
        repo.salvarTentativa({
          perfilId: ciclo.perfil.id,
          avaliacaoId,
          exercicioId,
          respostaUsuario: pontuacao,
          pontuacao,
          correta: pontuacao === '10',
          feedbackIa: `Correção ${pontuacao}`,
        }),
      ),
    );
    const a = criarService(0);
    const b = criarService(1);
    const processarA = jest.spyOn(a.revisao, 'processarRevisao');
    const processarB = jest.spyOn(b.revisao, 'processarRevisao');
    const pids = await Promise.all(
      banco.conexoes.map(
        async (c) => (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid,
      ),
    );
    await banco.admin.query('BEGIN');
    await banco.admin.query('SELECT id FROM avaliacoes WHERE id = $1 FOR UPDATE', [avaliacaoId]);
    const resultados = Promise.all(
      [a, b].map(({ service }, indice) =>
        service.submeter({
          ...dto(),
          respostas: [{ exercicioId, tentativaId: tentativas[indice].id }],
        }),
      ),
    );
    void resultados.catch(() => undefined);
    try {
      await Promise.all(pids.map((pid) => banco.aguardarBloqueio(pid)));
    } finally {
      await banco.admin.query('COMMIT');
    }
    const [primeiro, segundo] = await resultados;
    expect(primeiro).toEqual(segundo);
    expect(primeiro.feedbackExercicios).toEqual([
      expect.objectContaining({
        pontuacao: primeiro.pontuacaoTotal,
        feedbackIa: `Correção ${Number(primeiro.pontuacaoTotal)}`,
      }),
    ]);
    expect(processarA.mock.calls.length + processarB.mock.calls.length).toBe(1);
    expect(await banco.bancos[0].select().from(schema.resultadosAvaliacao)).toHaveLength(1);
    expect(await banco.bancos[0].select().from(schema.revisaoEspacada)).toEqual([
      expect.objectContaining({
        itemId: exercicioId,
        perfilId: ciclo.perfil.id,
        repeticoes: 0,
        intervaloDias: 1,
      }),
    ]);
  });

  it('falha na revisão reverte o resultado e permite nova finalização', async () => {
    const { service } = criarService(0);
    // Falha real na segunda escrita, limitada à tabela deste schema.
    await banco.admin.query(
      'ALTER TABLE revisao_espacada ADD CONSTRAINT falha_revisao_teste CHECK (false)',
    );
    try {
      await expect(service.submeter(dto())).rejects.toThrow();
    } finally {
      await banco.admin.query('ALTER TABLE revisao_espacada DROP CONSTRAINT falha_revisao_teste');
    }
    expect(await banco.bancos[0].select().from(schema.resultadosAvaliacao)).toEqual([]);
    expect(await banco.bancos[0].select().from(schema.revisaoEspacada)).toEqual([]);
    await service.submeter(dto());
    expect(await banco.bancos[0].select().from(schema.resultadosAvaliacao)).toHaveLength(1);
    expect(await banco.bancos[0].select().from(schema.revisaoEspacada)).toHaveLength(1);
  });

  it.each(['resultado', 'tentativa'])(
    'respeita a ordem do lock quando %s é gravado primeiro',
    async (primeira) => {
      const dadosResultado = { perfilId: ciclo.perfil.id, avaliacaoId, pontuacaoTotal: '0' };
      const dadosTentativa = {
        perfilId: ciclo.perfil.id,
        avaliacaoId,
        exercicioId,
        respostaUsuario: 'Resposta',
      };
      let sinalizar!: () => void;
      let liberar!: () => void;
      const escrita = new Promise<void>((resolve) => {
        sinalizar = resolve;
      });
      const trava = new Promise<void>((resolve) => {
        liberar = resolve;
      });
      const mantida = banco.bancos[0].transaction(async (tx) => {
        const repo = new ExerciciosAvaliacoesRepository(tx);
        if (primeira === 'resultado') await repo.salvarResultadoAvaliacao(dadosResultado, tx);
        else await repo.salvarTentativa(dadosTentativa);
        sinalizar();
        await trava;
      });
      await Promise.race([escrita, mantida]);
      const segundoRepo = new ExerciciosAvaliacoesRepository(banco.bancos[1]);
      const { pid } = (
        await banco.conexoes[1].query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
      ).rows[0];
      const concorrente =
        primeira === 'resultado'
          ? segundoRepo.salvarTentativa(dadosTentativa)
          : segundoRepo.salvarResultadoAvaliacao(dadosResultado);
      const observado = Promise.allSettled([concorrente]);
      try {
        await banco.aguardarBloqueio(pid);
      } finally {
        liberar();
        await mantida;
      }
      const [resultado] = await observado;
      if (primeira === 'resultado') {
        expect(resultado).toMatchObject({
          status: 'rejected',
          reason: { message: 'Avaliação já finalizada' },
        });
      } else expect(resultado.status).toBe('fulfilled');
      expect(await banco.bancos[0].select().from(schema.tentativasExercicio)).toHaveLength(
        primeira === 'resultado' ? 0 : 1,
      );
      expect(await banco.bancos[0].select().from(schema.resultadosAvaliacao)).toHaveLength(1);
    },
  );

  it('compare-and-swap permite apenas uma atualização da mesma versão da revisão', async () => {
    const repoA = new RevisaoEspacadaRepository(banco.bancos[0]);
    const repoB = new RevisaoEspacadaRepository(banco.bancos[1]);
    const revisao = await repoA.criar({
      perfilId: ciclo.perfil.id,
      itemTipo: 'exercicio',
      itemId: exercicioId,
      proximaRevisao: '2026-09-01',
    });
    const lida = await repoB.buscarPorId(revisao.id, ciclo.perfil.id);
    const pids = await Promise.all(
      banco.conexoes.map(
        async (c) => (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid,
      ),
    );
    await banco.admin.query('BEGIN');
    await banco.admin.query('SELECT id FROM revisao_espacada WHERE id = $1 FOR UPDATE', [
      revisao.id,
    ]);
    const dados = {
      perfilId: ciclo.perfil.id,
      itemTipo: 'exercicio',
      itemId: exercicioId,
      repeticoes: 1,
      proximaRevisao: '2026-09-02',
      ultimaRevisao: '2026-09-01',
    };
    const resultados = Promise.all([
      repoA.atualizarSeAtual(revisao, dados),
      repoB.atualizarSeAtual(lida!, dados),
    ]);
    void resultados.catch(() => undefined);
    try {
      await Promise.all(pids.map((pid) => banco.aguardarBloqueio(pid)));
    } finally {
      await banco.admin.query('COMMIT');
    }
    expect((await resultados).filter(Boolean)).toHaveLength(1);
    expect(await repoA.buscarPorId(revisao.id, ciclo.perfil.id)).toMatchObject({
      repeticoes: 1,
      proximaRevisao: '2026-09-02',
    });
  });
});
