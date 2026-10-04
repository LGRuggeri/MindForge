import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { TutorService } from '../../modules/tutor/tutor.service';
import { SynthesizerService } from '../../modules/synthesizer/synthesizer.service';
import { ReviewerService } from '../../modules/synthesizer/reviewer.service';
import { ExerciciosAvaliacoesService } from '../../modules/exercicios-avaliacoes/exercicios-avaliacoes.service';
import { TipoExercicio } from '../../modules/exercicios-avaliacoes/dto';

describe('Contratos de IA antes da persistência', () => {
  const codigo = 'Exemplo:\n```python\nprint("Olá")\n```\nTexto com ```json literal.';
  const modulo = {
    id: 'mod-1',
    titulo: 'Python',
    objetivoAprendizagem: 'Programar',
    trilha: { objetivo: { perfilId: 'perfil-1' } },
  };
  let respostas: Record<string, unknown>;
  const agentes = {
    executar: jest.fn(async (opcoes: { agente: string; parser: (raw: string) => unknown }) =>
      opcoes.parser(JSON.stringify(respostas[opcoes.agente])),
    ),
  };
  const repo = {
    buscarModuloPorId: jest.fn(),
    listarHistoricoRecentePorPerfil: jest.fn(),
    salvarDuvida: jest.fn(),
    listarFontesPorModulo: jest.fn(),
    criarConteudo: jest.fn(),
    criarExercicio: jest.fn(),
  };
  const biblioteca = { buscar: jest.fn(), indexarTexto: jest.fn() };
  const image = { gerarImagem: jest.fn() };
  const graph = { vincularCompetenciasAoModulo: jest.fn() };
  const tutor = new TutorService(
    repo as never,
    agentes as never,
    biblioteca as never,
    { isAvailable: () => false } as never,
  );
  const reviewer = new ReviewerService(agentes as never);
  const synthesizer = new SynthesizerService(
    repo as never,
    agentes as never,
    biblioteca as never,
    reviewer,
    graph as never,
    image as never,
    { get: (_key: string, valor: string) => valor } as never,
    { pesquisarAtualizado: async () => ({ fontes: [], resultadosWeb: 1 }) } as never,
    {} as never,
  );
  const exercicios = new ExerciciosAvaliacoesService(
    repo as never,
    agentes as never,
    biblioteca as never,
    {} as never,
    { buscarModuloPorId: async () => modulo } as never,
    {} as never,
  );
  const perguntar = () =>
    tutor.tirarDuvida({ perfilId: 'perfil-1', moduloId: 'mod-1', pergunta: 'Exemplo?' });
  const sintetizar = () => synthesizer.gerar({ moduloId: 'mod-1', topico: 'Python' });
  const gerarExercicio = () =>
    exercicios.gerarExercicio({ moduloId: 'mod-1', tipo: TipoExercicio.QUESTAO_OBJETIVA });

  beforeEach(() => {
    jest.clearAllMocks();
    repo.buscarModuloPorId.mockResolvedValue(modulo);
    repo.listarHistoricoRecentePorPerfil.mockResolvedValue([]);
    repo.listarFontesPorModulo.mockResolvedValue([]);
    repo.salvarDuvida.mockImplementation(async (dados) => ({ id: 'duvida-1', ...dados }));
    repo.criarConteudo.mockImplementation(async (dados) => ({ id: 'conteudo-1', ...dados }));
    repo.criarExercicio.mockImplementation(async (dados) => ({ id: 'ex-1', ...dados }));
    biblioteca.buscar.mockResolvedValue([]);
    biblioteca.indexarTexto.mockResolvedValue([]);
    respostas = {
      teacher: { resposta: codigo, citacoes: [], proximosPassos: [], idioma: 'pt-br' },
      synthesizer: {
        titulo: 'Python',
        corpoMarkdown: codigo,
        resumo: 'Resumo',
        palavrasChave: ['Python'],
      },
      reviewer: { nota: 4, pontosFortes: [], pontosFracos: [], sugestoes: [] },
      evaluator: { enunciado: codigo, gabarito: 'A', criterios: ['Acertar'], dica: 'Dica' },
    };
  });

  it('recusa módulo de outro perfil antes de consultar RAG ou IA', async () => {
    repo.buscarModuloPorId.mockResolvedValue({
      ...modulo,
      trilha: { objetivo: { perfilId: 'outro' } },
    });
    await expect(perguntar()).rejects.toBeInstanceOf(ForbiddenException);
    expect(biblioteca.buscar).not.toHaveBeenCalled();
    expect(agentes.executar).not.toHaveBeenCalled();
    expect(repo.salvarDuvida).not.toHaveBeenCalled();
  });
  it('envia o módulo validado para a busca e preserva o código do Tutor', async () => {
    expect(await perguntar()).toMatchObject({ resposta: codigo });
    expect(biblioteca.buscar).toHaveBeenCalledWith(expect.objectContaining({ moduloId: 'mod-1' }));
    expect(repo.salvarDuvida).toHaveBeenCalledWith(
      expect.objectContaining({ resposta: codigo, perfilId: 'perfil-1' }),
    );
  });
  it('preserva os blocos de código no material e no enunciado persistidos', async () => {
    await sintetizar();
    await gerarExercicio();
    expect(repo.criarConteudo).toHaveBeenCalledWith(
      expect.objectContaining({ corpoMarkdown: codigo }),
    );
    expect(repo.criarExercicio).toHaveBeenCalledWith(
      expect.objectContaining({ enunciado: codigo }),
    );
  });
  it.each([{ resposta: [] }, { resposta: '  ' }, { citacoes: {} }, { proximosPassos: [123] }])(
    'rejeita Tutor malformado %j sem gravar',
    async (invalido) => {
      respostas.teacher = { ...(respostas.teacher as object), ...invalido };
      await expect(perguntar()).rejects.toBeInstanceOf(BadGatewayException);
      expect(repo.salvarDuvida).not.toHaveBeenCalled();
    },
  );
  it.each([
    { palavrasChave: 'Python' },
    { palavrasChave: undefined },
    { corpoMarkdown: {} },
    { titulo: '' },
  ])('rejeita síntese inválida %j antes do Reviewer', async (invalido) => {
    respostas.synthesizer = { ...(respostas.synthesizer as object), ...invalido };
    await expect(sintetizar()).rejects.toBeInstanceOf(BadGatewayException);
    expect(repo.criarConteudo).not.toHaveBeenCalled();
    expect(image.gerarImagem).not.toHaveBeenCalled();
    expect(agentes.executar).toHaveBeenCalledTimes(1);
  });
  it.each([{ nota: 6 }, { nota: '4' }, { nota: 0 }, { sugestoes: {} }, { pontosFracos: null }])(
    'rejeita avaliação inválida %j',
    async (invalido) => {
      respostas.reviewer = { ...(respostas.reviewer as object), ...invalido };
      await expect(sintetizar()).rejects.toBeInstanceOf(BadGatewayException);
      expect(repo.criarConteudo).not.toHaveBeenCalled();
    },
  );
  it.each([{ enunciado: null }, { criterios: 'texto' }, { gabarito: {} }])(
    'rejeita exercício inválido %j',
    async (invalido) => {
      respostas.evaluator = { ...(respostas.evaluator as object), ...invalido };
      await expect(gerarExercicio()).rejects.toBeInstanceOf(BadGatewayException);
      expect(repo.criarExercicio).not.toHaveBeenCalled();
    },
  );
});
