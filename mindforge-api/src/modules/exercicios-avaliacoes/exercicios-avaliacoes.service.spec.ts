import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { PlannerService } from '../planner/planner.service';
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
  let planner: jest.Mocked<PlannerService>;

  const moduloId = '123e4567-e89b-12d3-a456-426614174000';
  const exercicioId = '223e4567-e89b-12d3-a456-426614174000';
  const perfilId = '323e4567-e89b-12d3-a456-426614174000';
  const avaliacaoId = '423e4567-e89b-12d3-a456-426614174000';

  it('alinha o exercício aos tópicos da grade do módulo escolhido pelo perfil', async () => {
    planner.buscarModuloPorId.mockResolvedValue({
      id: moduloId,
      titulo: 'LDB',
      objetivoAprendizagem: 'Comparar modalidades',
      escopoEstudo: {
        programaCodigo: 'LIBRAS',
        programaNome: 'Concurso',
        modoEstudoPadrao: 'concurso',
        topicosObrigatorios: ['Capítulos V e V-A'],
      },
    } as never);
    biblioteca.buscar.mockResolvedValue([]);
    agentes.executar.mockResolvedValue({ enunciado: 'Pergunta', gabarito: 'A', criterios: [] });
    repo.criarExercicio.mockResolvedValue({ id: exercicioId } as never);
    await service.gerarExercicio({ moduloId, tipo: TipoExercicio.QUESTAO_OBJETIVA });
    expect(agentes.executar.mock.calls[0][0].user).toContain('Capítulos V e V-A');
  });

  beforeEach(async () => {
    const repoMock = {
      buscarAvaliacaoPorId: jest.fn().mockResolvedValue({
        modulo: { trilha: { objetivo: { perfilId } } },
        exercicios: [{ exercicioId }],
      }),
      buscarResultadoPorAvaliacaoEPerfil: jest.fn(),
      criarExercicio: jest.fn(),
      buscarExercicioPorId: jest.fn(),
      listarExerciciosPorModulo: jest.fn(),
      listarExerciciosPublicosPorModulo: jest.fn(),
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

    const plannerMock = {
      buscarModuloPorId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExerciciosAvaliacoesService,
        { provide: ExerciciosAvaliacoesRepository, useValue: repoMock },
        { provide: AgentesService, useValue: agentesMock },
        { provide: BibliotecaVivaService, useValue: bibliotecaMock },
        { provide: KnowledgeGraphService, useValue: knowledgeGraphMock },
        { provide: PlannerService, useValue: plannerMock },
        { provide: JOB_QUEUE, useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get(ExerciciosAvaliacoesService);
    repo = module.get(ExerciciosAvaliacoesRepository);
    agentes = module.get(AgentesService);
    biblioteca = module.get(BibliotecaVivaService);
    knowledgeGraph = module.get(KnowledgeGraphService);
    planner = module.get(PlannerService);

    planner.buscarModuloPorId.mockResolvedValue({
      id: moduloId,
      trilha: { objetivo: { perfilId } },
      titulo: 'Módulo de teste',
      objetivoAprendizagem: 'Aprender conceitos básicos',
    } as never);
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

    it('deve persistir criterios para exercicios nao objetivos', async () => {
      biblioteca.buscar.mockResolvedValue([]);
      agentes.executar.mockResolvedValue({
        enunciado: 'Explique closures.',
        criterios: ['Menciona escopo', 'Explica captura de variaveis'],
      });
      repo.criarExercicio.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
        enunciado: 'Explique closures.',
        gabarito: null,
        criterios: ['Menciona escopo', 'Explica captura de variaveis'],
        dificuldade: DificuldadeExercicio.MEDIO,
        criadoEm: new Date(),
      } as never);

      await service.gerarExercicio({
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
      });

      expect(repo.criarExercicio).toHaveBeenCalledWith(
        expect.objectContaining({
          criterios: ['Menciona escopo', 'Explica captura de variaveis'],
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
          perfilId,
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
        perfilId,
      });

      const tentativa = resultado as Awaited<ReturnType<typeof repo.salvarTentativa>> & {
        feedback: string;
      };
      expect(tentativa.correta).toBe(false);
      expect(tentativa.pontuacao).toBe('0');
      expect(tentativa.feedback).toContain('Paris');
      expect(knowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
    });

    it('não deve revelar gabarito em tentativa vinculada a avaliação', async () => {
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
        avaliacaoId,
        respostaUsuario: 'Londres',
        correta: false,
        pontuacao: '0',
        tentativaNumero: 1,
        respondidoEm: new Date(),
      } as never);

      const resultado = await service.submeterTentativa({
        exercicioId,
        respostaUsuario: 'Londres',
        perfilId,
        avaliacaoId,
      });

      const tentativa = resultado as Awaited<ReturnType<typeof repo.salvarTentativa>> & {
        feedback: string;
      };
      expect(tentativa.feedback).not.toContain('Paris');
      expect(tentativa.feedback).toContain('finalização');
    });

    it('não deve atualizar progresso por módulo em tentativa vinculada a avaliação', async () => {
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
        avaliacaoId,
        respostaUsuario: 'Paris',
        correta: true,
        pontuacao: '10',
        tentativaNumero: 1,
        respondidoEm: new Date(),
      } as never);

      await service.submeterTentativa({
        exercicioId,
        respostaUsuario: 'Paris',
        perfilId,
        avaliacaoId,
      });

      expect(knowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
    });

    it('deve usar evaluator para corrigir dissertativa', async () => {
      repo.buscarExercicioPorId.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
        enunciado: 'Explique variáveis.',
        gabarito: 'Variáveis armazenam valores.',
        criterios: ['Menciona armazenamento', 'Diferencia tipos'],
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

    it('deve incluir titulo e objetivo do modulo no prompt de correcao', async () => {
      repo.buscarExercicioPorId.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
        enunciado: 'Explique variáveis.',
        gabarito: null,
        criterios: ['Cobertura dos conceitos'],
      } as never);
      repo.contarTentativasPorExercicio.mockResolvedValue(0);
      agentes.executar.mockResolvedValue({
        correta: true,
        pontuacao: 7,
        feedback: 'Ok.',
      });
      repo.salvarTentativa.mockResolvedValue({
        id: 'tentativa-mock',
        exercicioId,
        respostaUsuario: 'Variáveis guardam dados.',
        correta: true,
        pontuacao: '7',
        tentativaNumero: 1,
        respondidoEm: new Date(),
      } as never);

      await service.submeterTentativa({
        exercicioId,
        respostaUsuario: 'Variáveis guardam dados.',
        perfilId,
      });

      const chamada = (agentes.executar as jest.Mock).mock.calls[0][0];
      expect(chamada.user).toContain('Módulo de teste');
      expect(chamada.user).toContain('Aprender conceitos básicos');
      expect(chamada.user).toContain('Cobertura dos conceitos');
    });

    it('deve rejeitar resposta do evaluator com pontuacao fora do intervalo 0-10', async () => {
      repo.buscarExercicioPorId.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
        enunciado: 'Explique variáveis.',
        criterios: ['Menciona atribuicao'],
      } as never);
      repo.contarTentativasPorExercicio.mockResolvedValue(0);
      agentes.executar.mockImplementationOnce(
        async (options: { parser?: (raw: string) => unknown }) => {
          if (!options.parser) {
            throw new Error('parser ausente');
          }
          return options.parser(
            JSON.stringify({ correta: true, pontuacao: 15, feedback: 'Otimo.' }),
          );
        },
      );

      await expect(
        service.submeterTentativa({
          exercicioId,
          respostaUsuario: 'Variáveis guardam dados.',
          perfilId,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(repo.salvarTentativa).not.toHaveBeenCalled();
    });

    it('deve rejeitar resposta do evaluator com correta nao boolean', async () => {
      repo.buscarExercicioPorId.mockResolvedValue({
        id: exercicioId,
        moduloId,
        tipo: TipoExercicio.DISSERTATIVA,
        enunciado: 'Explique variáveis.',
        criterios: ['Menciona atribuicao'],
      } as never);
      repo.contarTentativasPorExercicio.mockResolvedValue(0);
      agentes.executar.mockImplementationOnce(
        async (options: { parser?: (raw: string) => unknown }) => {
          if (!options.parser) {
            throw new Error('parser ausente');
          }
          return options.parser(
            JSON.stringify({ correta: 'sim', pontuacao: 8, feedback: 'Boa explicação.' }),
          );
        },
      );

      await expect(
        service.submeterTentativa({
          exercicioId,
          respostaUsuario: 'Variáveis guardam dados.',
          perfilId,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(repo.salvarTentativa).not.toHaveBeenCalled();
    });
  });

  describe('listarPorModulo', () => {
    it('deve retornar a projeção pública sem gabarito e critérios', async () => {
      const lista = [
        {
          id: exercicioId,
          moduloId,
          tipo: TipoExercicio.QUESTAO_OBJETIVA,
          enunciado: 'Pergunta',
          dificuldade: DificuldadeExercicio.MEDIO,
          criadoEm: new Date(),
        },
      ];
      repo.listarExerciciosPublicosPorModulo.mockResolvedValue(lista as never);

      const resultado = await service.listarPorModulo(moduloId);

      expect(resultado).toEqual(lista);
      expect(repo.listarExerciciosPublicosPorModulo).toHaveBeenCalledWith(moduloId);
      expect(resultado[0]).not.toHaveProperty('gabarito');
      expect(resultado[0]).not.toHaveProperty('criterios');
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
