import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';
import { AvaliacoesService } from './avaliacoes.service';
import { TipoAvaliacao } from './dto';

describe('Consistência de tentativas e avaliações', () => {
  const modulo = {
    id: 'm',
    trilhaId: 't',
    titulo: 'Teste',
    objetivoAprendizagem: null,
    trilha: { id: 't', objetivo: { perfilId: 'p' } },
  };
  const exercicio = {
    id: 'e',
    moduloId: 'm',
    modulo,
    tipo: 'dissertativa',
    enunciado: 'Teste',
    gabarito: null,
    criterios: [],
  };
  let repo: Record<string, jest.Mock>;
  let agentes: { executar: jest.Mock };
  let queue: { send: jest.Mock };
  let tentativas: ExerciciosAvaliacoesService;
  let avaliacoes: AvaliacoesService;
  beforeEach(() => {
    repo = {
      buscarExercicioPorId: jest.fn().mockResolvedValue(exercicio),
      buscarModuloDaAvaliacao: jest.fn().mockResolvedValue(modulo),
      buscarTrilhaDaAvaliacao: jest.fn().mockResolvedValue(modulo.trilha),
      buscarAvaliacaoPorId: jest.fn().mockResolvedValue({
        id: 'a',
        moduloId: 'm',
        modulo,
        exercicios: [{ exercicioId: 'e', exercicio }],
      }),
      buscarResultadoPorAvaliacaoEPerfil: jest.fn(),
      contarTentativasPorExercicio: jest.fn().mockResolvedValue(0),
      salvarTentativa: jest.fn().mockImplementation(async (dados) => ({ id: 'tent', ...dados })),
      listarExerciciosPorModulo: jest.fn().mockResolvedValue([exercicio]),
      listarExerciciosPorTrilha: jest.fn().mockResolvedValue([exercicio]),
      criarAvaliacaoComExercicios: jest.fn().mockResolvedValue({ avaliacaoId: 'a' }),
      listarTentativasPorExercicioEAvaliacao: jest.fn().mockResolvedValue([]),
      salvarResultadoAvaliacao: jest.fn(),
    };
    agentes = {
      executar: jest
        .fn()
        .mockResolvedValue({ correta: true, pontuacao: 10, feedback: 'Gabarito privado' }),
    };
    queue = { send: jest.fn().mockResolvedValue('job') };
    tentativas = new ExerciciosAvaliacoesService(
      repo as never,
      agentes as never,
      {} as never,
      { marcarProgressoPorModulo: jest.fn() } as never,
      { buscarModuloPorId: jest.fn().mockResolvedValue(modulo) } as never,
      queue as never,
    );
    avaliacoes = new AvaliacoesService(
      repo as never,
      {} as never,
      {} as never,
      { transaction: jest.fn(async (fn) => fn({})) } as never,
    );
  });
  it.each([false, true])(
    'recusa perfil incorreto antes de corrigir ou enfileirar (async=%s)',
    async (async) => {
      await expect(
        tentativas.submeterTentativa({
          exercicioId: 'e',
          perfilId: 'outro',
          respostaUsuario: 'Resposta',
          async,
        }),
      ).rejects.toThrow('não pertence');
      expect(agentes.executar).not.toHaveBeenCalled();
      expect(queue.send).not.toHaveBeenCalled();
      expect(repo.salvarTentativa).not.toHaveBeenCalled();
    },
  );
  it('recusa exercício fora da avaliação', async () => {
    repo.buscarAvaliacaoPorId.mockResolvedValue({ modulo, exercicios: [] });
    await expect(
      tentativas.submeterTentativa({
        exercicioId: 'e',
        perfilId: 'p',
        avaliacaoId: 'a',
        respostaUsuario: 'Resposta',
      }),
    ).rejects.toThrow('não pertence');
    expect(repo.salvarTentativa).not.toHaveBeenCalled();
  });
  it('recusa nova tentativa depois da finalização', async () => {
    repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue({ id: 'resultado' });
    await expect(
      tentativas.submeterTentativa({
        exercicioId: 'e',
        perfilId: 'p',
        avaliacaoId: 'a',
        respostaUsuario: 'Resposta',
      }),
    ).rejects.toThrow('finalizada');
    expect(agentes.executar).not.toHaveBeenCalled();
  });
  it('oculta todos os campos de correção no retorno e mantém a correção persistida', async () => {
    const resposta = await tentativas.submeterTentativa({
      exercicioId: 'e',
      perfilId: 'p',
      avaliacaoId: 'a',
      respostaUsuario: 'Resposta',
    });
    expect(resposta).toMatchObject({
      id: 'tent',
      correta: null,
      pontuacao: null,
      feedbackIa: null,
    });
    expect(JSON.stringify(resposta)).not.toContain('Gabarito privado');
    expect(repo.salvarTentativa).toHaveBeenCalledWith(
      expect.objectContaining({ feedbackIa: 'Gabarito privado', pontuacao: '10' }),
    );
  });
  it.each([
    { titulo: 'Teste', tipo: TipoAvaliacao.FORMATIVA, exerciciosIds: ['e'] },
    { titulo: 'Teste', tipo: TipoAvaliacao.FORMATIVA, moduloId: 'm' },
    { titulo: 'Teste', tipo: TipoAvaliacao.FORMATIVA, moduloId: 'm', exerciciosIds: ['outro'] },
    { titulo: 'Teste', tipo: TipoAvaliacao.FORMATIVA, moduloId: 'm', exerciciosIds: ['e', 'e'] },
  ])('recusa criação inconsistente %j', async (dto) => {
    await expect(avaliacoes.criar(dto)).rejects.toThrow();
    expect(repo.criarAvaliacaoComExercicios).not.toHaveBeenCalled();
  });
  it('recusa simulado sem candidatos', async () => {
    repo.listarExerciciosPorModulo.mockResolvedValue([]);
    await expect(
      avaliacoes.criar({ titulo: 'Teste', tipo: TipoAvaliacao.SIMULADO, moduloId: 'm' }),
    ).rejects.toThrow('exercício');
    expect(repo.criarAvaliacaoComExercicios).not.toHaveBeenCalled();
  });
  it('recusa finalização de avaliação legada vazia', async () => {
    repo.buscarAvaliacaoPorId.mockResolvedValue({ modulo, exercicios: [] });
    await expect(
      avaliacoes.submeter({ avaliacaoId: 'a', perfilId: 'p', respostas: [] }),
    ).rejects.toThrow('exercício');
    expect(repo.salvarResultadoAvaliacao).not.toHaveBeenCalled();
  });
  it('recusa tentativa inexistente na finalização', async () => {
    await expect(
      avaliacoes.submeter({
        avaliacaoId: 'a',
        perfilId: 'p',
        respostas: [{ exercicioId: 'e', tentativaId: 'invalida' }],
      }),
    ).rejects.toThrow('Tentativa');
    expect(repo.salvarResultadoAvaliacao).not.toHaveBeenCalled();
  });
  it('mantém feedback e nota da tentativa avulsa', async () => {
    expect(
      await tentativas.submeterTentativa({
        exercicioId: 'e',
        perfilId: 'p',
        respostaUsuario: 'Resposta',
      }),
    ).toMatchObject({ correta: true, pontuacao: '10', feedbackIa: 'Gabarito privado' });
  });
  it('enfileira uma tentativa válida sem corrigir antecipadamente', async () => {
    expect(
      await tentativas.submeterTentativa({
        exercicioId: 'e',
        perfilId: 'p',
        avaliacaoId: 'a',
        respostaUsuario: 'Resposta',
        async: true,
      }),
    ).toMatchObject({ jobId: 'job' });
    expect(agentes.executar).not.toHaveBeenCalled();
  });
  it('revalida uma avaliação finalizada durante a correção', async () => {
    agentes.executar.mockImplementation(async () => {
      repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue({ id: 'resultado' });
      return { correta: true, pontuacao: 10, feedback: 'Privado' };
    });
    await expect(
      tentativas.submeterTentativa({
        exercicioId: 'e',
        perfilId: 'p',
        avaliacaoId: 'a',
        respostaUsuario: 'Resposta',
      }),
    ).rejects.toThrow('finalizada');
    expect(repo.salvarTentativa).not.toHaveBeenCalled();
  });
  it('recusa módulo e trilha contraditórios', async () => {
    await expect(
      avaliacoes.criar({
        titulo: 'Teste',
        tipo: TipoAvaliacao.SIMULADO,
        moduloId: 'm',
        trilhaId: 'outra',
      }),
    ).rejects.toThrow('não pertence');
    expect(repo.criarAvaliacaoComExercicios).not.toHaveBeenCalled();
  });
  it('recusa avaliação de outro perfil mesmo com exercício próprio vinculado', async () => {
    repo.buscarAvaliacaoPorId.mockResolvedValue({
      modulo: { trilha: { objetivo: { perfilId: 'outro' } } },
      exercicios: [{ exercicioId: 'e' }],
    });
    await expect(
      tentativas.submeterTentativa({
        exercicioId: 'e',
        perfilId: 'p',
        avaliacaoId: 'a',
        respostaUsuario: 'Resposta',
      }),
    ).rejects.toThrow('não pertence');
    expect(agentes.executar).not.toHaveBeenCalled();
  });
  it('recusa respostas duplicadas antes de gravar resultado', async () => {
    await expect(
      avaliacoes.submeter({
        avaliacaoId: 'a',
        perfilId: 'p',
        respostas: [
          { exercicioId: 'e', tentativaId: '1' },
          { exercicioId: 'e', tentativaId: '2' },
        ],
      }),
    ).rejects.toThrow('duplicadas');
    expect(repo.salvarResultadoAvaliacao).not.toHaveBeenCalled();
  });
  it('guarda o gabarito objetivo para consulta futura sem expô-lo no retorno', async () => {
    repo.buscarExercicioPorId.mockResolvedValue({
      ...exercicio,
      tipo: 'questao_objetiva',
      gabarito: 'Paris',
    });
    const resposta = await tentativas.submeterTentativa({
      exercicioId: 'e',
      perfilId: 'p',
      avaliacaoId: 'a',
      respostaUsuario: 'Londres',
    });
    expect(JSON.stringify(resposta)).not.toContain('Paris');
    expect(repo.salvarTentativa).toHaveBeenCalledWith(
      expect.objectContaining({ feedbackIa: expect.stringContaining('Paris') }),
    );
  });
});
