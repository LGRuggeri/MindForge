import { eq } from 'drizzle-orm';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { AvaliacoesService } from './avaliacoes.service';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';

comSql('Feedback final — persistência e isolamento SQL', () => {
  const banco = new PostgresIsolado();
  beforeAll(() => banco.iniciar());
  beforeEach(() => banco.limpar());
  afterAll(() => banco.encerrar());
  const servico = (indice = 0) =>
    new AvaliacoesService(
      new ExerciciosAvaliacoesRepository(banco.bancos[indice]),
      { processarRevisao: jest.fn() } as never,
      { marcarProgressoPorModulo: jest.fn() } as never,
      banco.bancos[indice],
    );
  async function preparar() {
    const db = banco.bancos[0];
    const ciclo = await criarCiclo(db);
    const repo = new ExerciciosAvaliacoesRepository(db);
    const exercicio = await repo.criarExercicio({
      moduloId: ciclo.modulo.id,
      tipo: 'questao_objetiva',
      enunciado: 'Quanto é 2 + 2?',
      gabarito: '4',
    });
    const outraQuestao = await repo.criarExercicio({
      moduloId: ciclo.modulo.id,
      tipo: 'dissertativa',
      enunciado: 'Explique frações',
    });
    const { avaliacaoId } = await repo.criarAvaliacaoComExercicios(
      { moduloId: ciclo.modulo.id, tipo: 'simulado', titulo: 'Prova' },
      [outraQuestao.id, exercicio.id],
    );
    const base = { perfilId: ciclo.perfil.id, avaliacaoId, exercicioId: exercicio.id };
    const antiga = await repo.salvarTentativa({
      ...base,
      respostaUsuario: '3',
      correta: false,
      pontuacao: '0',
      feedbackIa: 'Resposta incorreta. 4',
      tentativaNumero: 1,
      respondidoEm: new Date('2026-09-01T10:00:00Z'),
    });
    const recente = await repo.salvarTentativa({
      ...base,
      respostaUsuario: '4',
      correta: true,
      pontuacao: '10',
      feedbackIa: 'Resposta correta!',
      tentativaNumero: 2,
      respondidoEm: new Date('2026-09-01T11:00:00Z'),
    });
    return { db, ciclo, repo, exercicio, outraQuestao, avaliacaoId, base, antiga, recente };
  }

  it('salva a seleção usada na nota e preserva o feedback mesmo se o exercício ou a tentativa mudar', async () => {
    const { db, ciclo, exercicio, outraQuestao, avaliacaoId, antiga, recente } = await preparar();
    const service = servico();
    expect(await service.buscarResultado(avaliacaoId, ciclo.perfil.id)).toEqual({
      resultado: null,
    });
    const resultado = await service.submeter({
      avaliacaoId,
      perfilId: ciclo.perfil.id,
      respostas: [{ exercicioId: exercicio.id, tentativaId: antiga.id }],
    });
    expect(resultado).toMatchObject({
      feedbackExercicios: [
        { exercicioId: outraQuestao.id, tentativaId: null, respostaUsuario: null, pontuacao: '0' },
        {
          exercicioId: exercicio.id,
          tentativaId: antiga.id,
          enunciado: 'Quanto é 2 + 2?',
          respostaUsuario: '3',
          correta: false,
          feedbackIa: 'Resposta incorreta. 4',
        },
      ],
    });
    await db
      .update(schema.exercicios)
      .set({ enunciado: 'Enunciado editado' })
      .where(eq(schema.exercicios.id, exercicio.id));
    await db
      .update(schema.tentativasExercicio)
      .set({ feedbackIa: 'Feedback editado' })
      .where(eq(schema.tentativasExercicio.id, antiga.id));
    expect(await servico(1).buscarResultado(avaliacaoId, ciclo.perfil.id)).toEqual({ resultado });
    expect(
      await servico(1).submeter({
        avaliacaoId,
        perfilId: ciclo.perfil.id,
        respostas: [{ exercicioId: exercicio.id, tentativaId: recente.id }],
      }),
    ).toEqual(resultado);
    const outro = await criarCiclo(db, 'Outro perfil');
    await expect(servico(1).buscarResultado(avaliacaoId, outro.perfil.id)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('recupera somente o histórico da avaliação e perfil corretos em resultados anteriores à migration', async () => {
    const { db, ciclo, repo, exercicio, avaliacaoId, base, antiga, recente } = await preparar();
    const outro = await criarCiclo(db, 'Outro');
    // Dados alheios válidos no schema: o filtro não pode depender só do exercício.
    await repo.salvarTentativa({
      ...base,
      perfilId: outro.perfil.id,
      respostaUsuario: 'Outro perfil',
      feedbackIa: 'Segredo de outro perfil',
    });
    const outraAvaliacao = await repo.criarAvaliacaoComExercicios(
      { moduloId: ciclo.modulo.id, tipo: 'simulado', titulo: 'Outra prova' },
      [exercicio.id],
    );
    await repo.salvarTentativa({
      ...base,
      avaliacaoId: outraAvaliacao.avaliacaoId,
      respostaUsuario: 'Outra prova',
      feedbackIa: 'Segredo de outra prova',
    });
    await repo.salvarTentativa({
      ...base,
      avaliacaoId: null,
      respostaUsuario: 'Prática',
      feedbackIa: 'Correção de prática',
    });
    await repo.salvarResultadoAvaliacao({
      avaliacaoId,
      perfilId: ciclo.perfil.id,
      pontuacaoTotal: '5',
    });
    const consulta = await servico(1).buscarResultado(avaliacaoId, ciclo.perfil.id);
    expect(consulta).toMatchObject({
      resultado: {
        feedbackExercicios: null,
        historicoTentativas: [
          { tentativaId: antiga.id, feedbackIa: 'Resposta incorreta. 4' },
          { tentativaId: recente.id, feedbackIa: 'Resposta correta!' },
        ],
      },
    });
    expect(JSON.stringify(consulta)).not.toMatch(/Segredo|Correção de prática/);
  });
});
