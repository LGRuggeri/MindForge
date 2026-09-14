import { AvaliacoesService } from './avaliacoes.service';

describe('Feedback do resultado — tentativas usadas na nota', () => {
  const antiga = {
    id: 't1',
    respostaUsuario: '3',
    correta: false,
    pontuacao: '0',
    feedbackIa: 'Resposta incorreta. 4',
  };
  const recente = {
    id: 't2',
    respostaUsuario: '4',
    correta: true,
    pontuacao: '10',
    feedbackIa: 'Resposta correta!',
  };
  const detalhe = {
    exercicioId: 'e1',
    tentativaId: 't1',
    enunciado: 'Quanto é 2 + 2?',
    respostaUsuario: '3',
    correta: false,
    pontuacao: '0',
    feedbackIa: 'Resposta incorreta. 4',
  };
  const repo = {
    buscarAvaliacaoPorId: jest.fn(),
    buscarResultadoPorAvaliacaoEPerfil: jest.fn(),
    listarTentativasPorExercicioEAvaliacao: jest.fn(),
    salvarResultadoAvaliacao: jest.fn(),
    listarHistoricoDaAvaliacao: jest.fn(),
  };
  let service: AvaliacoesService;
  beforeEach(() => {
    jest.resetAllMocks();
    repo.buscarAvaliacaoPorId.mockResolvedValue({
      id: 'a',
      modulo: { trilha: { objetivo: { perfilId: 'p' } } },
      exercicios: [
        { exercicioId: 'e1', exercicio: { enunciado: detalhe.enunciado } },
        { exercicioId: 'e2', exercicio: { enunciado: 'Explique frações' } },
      ],
    });
    repo.listarTentativasPorExercicioEAvaliacao.mockResolvedValue([recente, antiga]);
    repo.salvarResultadoAvaliacao.mockImplementation(async (dados) => ({ id: 'r', ...dados }));
    service = new AvaliacoesService(
      repo as never,
      { processarRevisao: jest.fn() } as never,
      {} as never,
      { transaction: async (fn: (tx: unknown) => unknown) => fn({}) } as never,
    );
  });
  it('devolve e persiste a tentativa selecionada, não a mais recente, e a questão omitida', async () => {
    const resultado = await service.submeter({
      avaliacaoId: 'a',
      perfilId: 'p',
      respostas: [{ exercicioId: 'e1', tentativaId: 't1' }],
    });
    const feedbackExercicios = [
      detalhe,
      {
        exercicioId: 'e2',
        tentativaId: null,
        enunciado: 'Explique frações',
        respostaUsuario: null,
        correta: null,
        pontuacao: '0',
        feedbackIa: null,
      },
    ];
    expect(resultado).toMatchObject({ pontuacaoTotal: '0', feedbackExercicios });
    expect(repo.salvarResultadoAvaliacao).toHaveBeenCalledWith(
      expect.objectContaining({ feedbackExercicios }),
      expect.anything(),
    );
  });
  it('não consulta histórico antes de finalizar nem para outro perfil', async () => {
    expect(await service.buscarResultado('a', 'p')).toEqual({ resultado: null });
    await expect(service.buscarResultado('a', 'outro')).rejects.toMatchObject({ status: 403 });
    expect(repo.listarHistoricoDaAvaliacao).not.toHaveBeenCalled();
  });
  it('recupera o snapshot e mantém a seleção ao repetir a finalização', async () => {
    repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue({
      avaliacaoId: 'a',
      perfilId: 'p',
      pontuacaoTotal: '0',
      pontosFortes: null,
      pontosFracos: null,
      recomendacoes: null,
      feedbackExercicios: [detalhe],
    });
    expect(await service.buscarResultado('a', 'p')).toMatchObject({
      resultado: { feedbackExercicios: [detalhe] },
    });
    expect(
      await service.submeter({
        avaliacaoId: 'a',
        perfilId: 'p',
        respostas: [{ exercicioId: 'e1', tentativaId: 't2' }],
      }),
    ).toMatchObject({ feedbackExercicios: [detalhe] });
    expect(repo.salvarResultadoAvaliacao).not.toHaveBeenCalled();
    expect(repo.listarTentativasPorExercicioEAvaliacao).not.toHaveBeenCalled();
    expect(repo.listarHistoricoDaAvaliacao).not.toHaveBeenCalled();
  });
  it('expõe histórico escopado no legado sem inventar qual tentativa entrou na nota', async () => {
    repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue({
      avaliacaoId: 'a',
      perfilId: 'p',
      pontuacaoTotal: '5',
      pontosFortes: null,
      pontosFracos: null,
      recomendacoes: null,
      feedbackExercicios: null,
    });
    repo.listarHistoricoDaAvaliacao.mockResolvedValue([detalhe]);
    const esperado = { feedbackExercicios: null, historicoTentativas: [detalhe] };
    expect(await service.buscarResultado('a', 'p')).toMatchObject({ resultado: esperado });
    expect(
      await service.submeter({ avaliacaoId: 'a', perfilId: 'p', respostas: [] }),
    ).toMatchObject(esperado);
    expect(repo.listarHistoricoDaAvaliacao).toHaveBeenCalledWith('a', 'p');
    expect(repo.salvarResultadoAvaliacao).not.toHaveBeenCalled();
  });
});
