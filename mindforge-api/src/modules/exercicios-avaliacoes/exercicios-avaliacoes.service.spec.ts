import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { DificuldadeExercicio, TipoExercicio } from './dto';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';
import { JOB_QUEUE } from '../../jobs/job-queue.token';

describe('ExerciciosAvaliacoesService', () => {
  let service: ExerciciosAvaliacoesService;
  let repo: jest.Mocked<ExerciciosAvaliacoesRepository>;
  let agentes: jest.Mocked<AgentesService>;
  let biblioteca: jest.Mocked<BibliotecaVivaService>;
  let knowledgeGraph: jest.Mocked<KnowledgeGraphService>;

  const moduloId = '123e4567-e89b-12d3-a456-426614174000';
  const exercicioId = '223e4567-e89b-12d3-a456-426614174000';
  const perfilId = '323e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    const repoMock = {
      criarExercicio: jest.fn(),
      buscarExercicioPorId: jest.fn(),
      listarExerciciosPorModulo: jest.fn(),
      contarTentativasPorExercicio: jest.fn(),
      salvarTentativa: jest.fn(),
      calcularEstatisticasPorExercicio: jest.fn(),
    };

    const agentesMock = {
      executar: jest.fn(),
    };

    const bibliotecaMock = {
      buscar: jest.fn(),
      indexarTexto: jest.fn(),
    };

    const knowledgeGraphMock = {
      marcarProgressoPorModulo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExerciciosAvaliacoesService,
        { provide: ExerciciosAvaliacoesRepository, useValue: repoMock },
        { provide: AgentesService, useValue: agentesMock },
        { provide: BibliotecaVivaService, useValue: bibliotecaMock },
        { provide: KnowledgeGraphService, useValue: knowledgeGraphMock },
        { provide: JOB_QUEUE, useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get(ExerciciosAvaliacoesService);
    repo = module.get(ExerciciosAvaliacoesRepository);
    agentes = module.get(AgentesService);
    biblioteca = module.get(BibliotecaVivaService);
    knowledgeGraph = module.get(KnowledgeGraphService);
  });

  describe('gerarExercicio', () => {
    it('deve gerar e salvar exercicio usando resposta do evaluator', async () => {
      biblioteca.buscar.mockResolvedValue([]);
      agentes.executar.mockResolvedValue({
        enunciado: 'Qual a capital da França?',
        gabarito: 'Paris',
        dica: 'Cidade da torre Eiffel.',
      });
      repo.criarExercicio.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.QUESTAO_OBJETIVA,
        enunciado: 'Qual a capital da França?',
        gabarito: 'Paris',
        dificuldade: DificuldadeExercicio.FACIL,
        criadoEm: new Date(),
      } as never);

      const resultado = await service.gerarExercicio({
        moduloId,
        tipo: TipoExercicio.QUESTAO_OBJETIVA,
        dificuldade: DificuldadeExercicio.FACIL,
      });

      const exercicio = resultado as Awaited<ReturnType<typeof repo.criarExercicio>> & {
        dica?: string;
        criterios?: string[];
      };
      expect(exercicio.id).toBe(exercicioId);
      expect(exercicio.enunciado).toBe('Qual a capital da França?');
      expect(repo.criarExercicio).toHaveBeenCalledWith(
        expect.objectContaining({
          moduloId,
          tipo: TipoExercicio.QUESTAO_OBJETIVA,
          dificuldade: DificuldadeExercicio.FACIL,
        }),
      );
    });

    it('deve continuar mesmo quando a Biblioteca Viva falha', async () => {
      biblioteca.buscar.mockRejectedValue(new Error('Embedding offline'));
      agentes.executar.mockResolvedValue({
        enunciado: 'Exercicio sem chunks',
      });
      repo.criarExercicio.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
        enunciado: 'Exercicio sem chunks',
        dificuldade: DificuldadeExercicio.MEDIO,
        criadoEm: new Date(),
      } as never);

      const resultado = await service.gerarExercicio({
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
      });

      const exercicio = resultado as Awaited<ReturnType<typeof repo.criarExercicio>> & {
        dica?: string;
        criterios?: string[];
      };
      expect(exercicio.id).toBe(exercicioId);
      expect(biblioteca.buscar).toHaveBeenCalled();
      expect(agentes.executar).toHaveBeenCalled();
    });
  });

  describe('submeterTentativa', () => {
    it('deve lançar NotFoundException quando exercicio nao existe', async () => {
      repo.buscarExercicioPorId.mockResolvedValue(undefined);

      await expect(
        service.submeterTentativa({
          exercicioId,
          respostaUsuario: 'Paris',
        }),
      ).rejects.toThrow(new NotFoundException(`Exercício ${exercicioId} não encontrado`));
    });

    it('deve corrigir questao objetiva automaticamente quando acertar', async () => {
      repo.buscarExercicioPorId.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.QUESTAO_OBJETIVA,
        enunciado: 'Qual a capital da França?',
        gabarito: 'Paris',
      } as never);
      repo.contarTentativasPorExercicio.mockResolvedValue(0);
      repo.salvarTentativa.mockResolvedValue({
        id: 'tentativa-mock',
        exercicioId,
        respostaUsuario: 'Paris',
        correta: true,
        pontuacao: '10',
        tentativaNumero: 1,
        respondidoEm: new Date(),
      } as never);
      knowledgeGraph.marcarProgressoPorModulo.mockResolvedValue({ atualizados: 1, moduloId });

      const resultado = await service.submeterTentativa({
        exercicioId,
        respostaUsuario: 'Paris',
        perfilId,
      });

      const tentativa = resultado as Awaited<ReturnType<typeof repo.salvarTentativa>> & {
        feedback: string;
      };
      expect(tentativa.correta).toBe(true);
      expect(tentativa.pontuacao).toBe('10');
      expect(tentativa.feedback).toContain('correta');
      expect(knowledgeGraph.marcarProgressoPorModulo).toHaveBeenCalledWith(
        moduloId,
        perfilId,
        'dominado',
      );
    });

    it('deve corrigir questao objetiva automaticamente quando errar', async () => {
      repo.buscarExercicioPorId.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.QUESTAO_OBJETIVA,
        enunciado: 'Qual a capital da França?',
        gabarito: 'Paris',
      } as never);
      repo.contarTentativasPorExercicio.mockResolvedValue(1);
      repo.salvarTentativa.mockResolvedValue({
        id: 'tentativa-mock',
        exercicioId,
        respostaUsuario: 'Londres',
        correta: false,
        pontuacao: '0',
        tentativaNumero: 2,
        respondidoEm: new Date(),
      } as never);

      const resultado = await service.submeterTentativa({
        exercicioId,
        respostaUsuario: 'Londres',
      });

      const tentativa = resultado as Awaited<ReturnType<typeof repo.salvarTentativa>> & {
        feedback: string;
      };
      expect(tentativa.correta).toBe(false);
      expect(tentativa.pontuacao).toBe('0');
      expect(knowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
    });

    it('deve usar evaluator para corrigir dissertativa', async () => {
      repo.buscarExercicioPorId.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
        enunciado: 'Explique variáveis.',
        gabarito: 'Variáveis armazenam valores.',
      } as never);
      repo.contarTentativasPorExercicio.mockResolvedValue(0);
      agentes.executar.mockResolvedValue({
        correta: true,
        pontuacao: 8,
        feedback: 'Boa explicação.',
      });
      repo.salvarTentativa.mockResolvedValue({
        id: 'tentativa-mock',
        exercicioId,
        respostaUsuario: 'Variáveis guardam dados.',
        correta: true,
        pontuacao: '8',
        tentativaNumero: 1,
        respondidoEm: new Date(),
      } as never);
      knowledgeGraph.marcarProgressoPorModulo.mockResolvedValue({ atualizados: 1, moduloId });

      const resultado = await service.submeterTentativa({
        exercicioId,
        respostaUsuario: 'Variáveis guardam dados.',
        perfilId,
      });

      const tentativa = resultado as Awaited<ReturnType<typeof repo.salvarTentativa>> & {
        feedback: string;
      };
      expect(tentativa.correta).toBe(true);
      expect(agentes.executar).toHaveBeenCalled();
      expect(knowledgeGraph.marcarProgressoPorModulo).toHaveBeenCalledWith(
        moduloId,
        perfilId,
        'praticando',
      );
    });
  });

  describe('listarPorModulo', () => {
    it('deve delegar ao repositorio', async () => {
      const lista = [{ id: exercicioId, enunciado: 'Pergunta' }];
      repo.listarExerciciosPorModulo.mockResolvedValue(lista as never);

      const resultado = await service.listarPorModulo(moduloId);

      expect(resultado).toEqual(lista);
      expect(repo.listarExerciciosPorModulo).toHaveBeenCalledWith(moduloId);
    });
  });

  describe('estatisticasPorExercicio', () => {
    it('deve delegar ao repositorio', async () => {
      repo.calcularEstatisticasPorExercicio.mockResolvedValue({
        total: 1,
        corretas: 1,
        incorretas: 0,
        pontuacaoMedia: 10,
      });

      const resultado = await service.estatisticasPorExercicio(exercicioId);

      expect(resultado).toEqual({
        total: 1,
        corretas: 1,
        incorretas: 0,
        pontuacaoMedia: 10,
      });
    });
  });
});
