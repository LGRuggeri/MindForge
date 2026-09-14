import { Test, TestingModule } from '@nestjs/testing';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';
import { AvaliacoesService } from './avaliacoes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';
import { TipoAvaliacao } from './dto';
import { DRIZZLE } from '../../database/database.module';

describe('AvaliacoesService', () => {
  let service: AvaliacoesService;
  let repo: jest.Mocked<ExerciciosAvaliacoesRepository>;
  let revisao: jest.Mocked<RevisaoEspacadaService>;
  let knowledgeGraph: jest.Mocked<KnowledgeGraphService>;

  const avaliacaoId = '123e4567-e89b-12d3-a456-426614174000';
  const exercicioId = '223e4567-e89b-12d3-a456-426614174000';
  const moduloId = '323e4567-e89b-12d3-a456-426614174000';
  const perfilId = '423e4567-e89b-12d3-a456-426614174000';
  const trilhaId = '523e4567-e89b-12d3-a456-426614174000';

  const objetivoDoPerfil = { perfilId };
  const moduloComDono = { id: moduloId, trilha: { id: trilhaId, objetivo: objetivoDoPerfil } };
  const trilhaComDono = { id: trilhaId, objetivo: objetivoDoPerfil };

  beforeEach(async () => {
    const repoMock = {
      buscarModuloDaAvaliacao: jest.fn().mockResolvedValue({ ...moduloComDono, trilhaId }),
      buscarTrilhaDaAvaliacao: jest.fn().mockResolvedValue(trilhaComDono),
      criarAvaliacao: jest.fn(),
      adicionarExerciciosNaAvaliacao: jest.fn(),
      criarAvaliacaoComExercicios: jest.fn(),
      buscarAvaliacaoPorId: jest.fn(),
      listarTentativasPorExercicioEAvaliacao: jest.fn(),
      salvarResultadoAvaliacao: jest.fn(),
      listarExerciciosPorModulo: jest.fn().mockResolvedValue([{ id: exercicioId }]),
      listarExerciciosPorTrilha: jest.fn(),
      buscarResultadoPorAvaliacaoEPerfil: jest.fn(),
    };

    const revisaoMock = {
      processarRevisao: jest.fn(),
    };

    const knowledgeGraphMock = {
      marcarProgressoPorModulo: jest.fn(),
    };

    const dbMock: { transaction: jest.Mock } = {
      transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvaliacoesService,
        { provide: ExerciciosAvaliacoesRepository, useValue: repoMock },
        { provide: RevisaoEspacadaService, useValue: revisaoMock },
        { provide: KnowledgeGraphService, useValue: knowledgeGraphMock },
        { provide: DRIZZLE, useValue: dbMock },
      ],
    }).compile();

    service = module.get(AvaliacoesService);
    repo = module.get(ExerciciosAvaliacoesRepository);
    revisao = module.get(RevisaoEspacadaService);
    knowledgeGraph = module.get(KnowledgeGraphService);
  });

  describe('criar', () => {
    it('deve criar avaliacao com exercicios', async () => {
      repo.criarAvaliacaoComExercicios.mockResolvedValue({
        avaliacaoId,
        exerciciosAdicionados: 1,
      });
      repo.buscarAvaliacaoPorId.mockResolvedValue({ id: avaliacaoId } as never);

      const resultado = await service.criar({
        moduloId,
        titulo: 'Avaliacao 1',
        tipo: TipoAvaliacao.FORMATIVA,
        exerciciosIds: [exercicioId],
      });

      expect(resultado).toBeDefined();
      expect(resultado!.id).toBe(avaliacaoId);
      expect(repo.criarAvaliacaoComExercicios).toHaveBeenCalledWith(
        expect.objectContaining({
          moduloId,
          trilhaId: null,
          titulo: 'Avaliacao 1',
          tipo: TipoAvaliacao.FORMATIVA,
        }),
        [exercicioId],
      );
    });

    it('deve sortear exercícios automaticamente ao criar simulado por trilha', async () => {
      const exercicio2Id = '623e4567-e89b-12d3-a456-426614174000';

      repo.criarAvaliacaoComExercicios.mockResolvedValue({
        avaliacaoId,
        exerciciosAdicionados: 2,
      });
      repo.buscarAvaliacaoPorId.mockResolvedValue({ id: avaliacaoId } as never);
      repo.listarExerciciosPorTrilha.mockResolvedValue([
        { id: exercicioId, moduloId },
        { id: exercicio2Id, moduloId: '323e4567-e89b-12d3-a456-426614174001' },
      ] as never);

      const resultado = await service.criar({
        titulo: 'Simulado',
        tipo: TipoAvaliacao.SIMULADO,
        trilhaId,
        quantidade: 2,
      });

      expect(resultado).toBeDefined();
      expect(resultado!.id).toBe(avaliacaoId);
      expect(repo.listarExerciciosPorTrilha).toHaveBeenCalledWith(trilhaId);
      expect(repo.criarAvaliacaoComExercicios).toHaveBeenCalledWith(
        expect.objectContaining({ trilhaId }),
        expect.arrayContaining([exercicioId, exercicio2Id]),
      );
    });

    it('deve popular simulado por modulo quando exerciciosIds for vazio', async () => {
      repo.criarAvaliacaoComExercicios.mockResolvedValue({
        avaliacaoId,
        exerciciosAdicionados: 1,
      });
      repo.buscarAvaliacaoPorId.mockResolvedValue({ id: avaliacaoId } as never);
      repo.listarExerciciosPorModulo.mockResolvedValue([{ id: exercicioId }] as never);

      const resultado = await service.criar({
        titulo: 'Simulado 1',
        tipo: TipoAvaliacao.SIMULADO,
        moduloId,
      });

      expect(resultado).toBeDefined();
      expect(resultado!.id).toBe(avaliacaoId);
      expect(repo.listarExerciciosPorModulo).toHaveBeenCalledWith(moduloId);
      expect(repo.criarAvaliacaoComExercicios).toHaveBeenCalledWith(
        expect.objectContaining({ moduloId }),
        [exercicioId],
      );
    });

    it('deve rejeitar simulado sem exercicios, modulo e trilha', async () => {
      repo.criarAvaliacaoComExercicios.mockResolvedValue({
        avaliacaoId,
        exerciciosAdicionados: 0,
      });

      await expect(
        service.criar({
          titulo: 'Simulado vazio',
          tipo: TipoAvaliacao.SIMULADO,
        }),
      ).rejects.toThrow('Avaliação deve estar vinculada a um módulo ou trilha');
    });
  });

  describe('submeter', () => {
    it('deve calcular resultado e disparar revisao', async () => {
      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);
      repo.listarTentativasPorExercicioEAvaliacao.mockResolvedValue([
        {
          id: 'tent-1',
          exercicioId,
          correta: true,
          pontuacao: '10',
        },
      ] as never);
      repo.salvarResultadoAvaliacao.mockResolvedValue({
        id: 'resultado-1',
        avaliacaoId,
        pontuacaoTotal: '10',
      } as never);
      knowledgeGraph.marcarProgressoPorModulo.mockResolvedValue({ atualizados: 1, moduloId });

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [{ exercicioId, tentativaId: 'tent-1' }],
      });

      expect(resultado.pontuacaoTotal).toBe('10');
      expect(repo.salvarResultadoAvaliacao).toHaveBeenCalledWith(
        expect.objectContaining({
          pontosFortes: JSON.stringify(['Pergunta 1']),
          pontosFracos: null,
        }),
        expect.anything(),
      );
      expect(revisao.processarRevisao).toHaveBeenCalledWith(
        expect.objectContaining({
          perfilId,
          itemTipo: 'exercicio',
          itemId: exercicioId,
          qualidade: 5,
        }),
        expect.anything(),
      );
      expect(knowledgeGraph.marcarProgressoPorModulo).toHaveBeenCalledWith(
        moduloId,
        perfilId,
        'dominado',
      );
    });

    it('deve desserializar listas gravadas em JSON ao retornar resultado existente', async () => {
      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);

      repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue({
        id: 'resultado-json',
        avaliacaoId,
        perfilId,
        pontuacaoTotal: '7.00',
        pontosFortes: JSON.stringify(['Pergunta 1', 'Pergunta com\nquebra de linha']),
        pontosFracos: null,
        recomendacoes: null,
      } as never);

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [{ exercicioId, tentativaId: 'tent-1' }],
      });

      expect(resultado.pontosFortes).toEqual(['Pergunta 1', 'Pergunta com\nquebra de linha']);
    });

    it('deve manter compatibilidade com listas legadas separadas por quebra de linha', async () => {
      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);

      repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue({
        id: 'resultado-legado',
        avaliacaoId,
        perfilId,
        pontuacaoTotal: '7.00',
        pontosFortes: 'Pergunta 1',
        pontosFracos: null,
        recomendacoes: null,
      } as never);

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [{ exercicioId, tentativaId: 'tent-1' }],
      });

      expect(resultado.pontosFortes).toEqual(['Pergunta 1']);
    });

    it('nao deve atualizar progresso quando nota for baixa', async () => {
      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);
      repo.listarTentativasPorExercicioEAvaliacao.mockResolvedValue([
        {
          id: 'tent-1',
          exercicioId,
          correta: false,
          pontuacao: '5',
        },
      ] as never);
      repo.salvarResultadoAvaliacao.mockResolvedValue({
        id: 'resultado-1',
        avaliacaoId,
        pontuacaoTotal: '5',
      } as never);

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [{ exercicioId, tentativaId: 'tent-1' }],
      });

      expect(resultado.pontuacaoTotal).toBe('5');
      expect(knowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
    });

    it('deve atualizar progresso de multiplos modulos em simulado', async () => {
      const exercicio2Id = '623e4567-e89b-12d3-a456-426614174000';
      const modulo2Id = '323e4567-e89b-12d3-a456-426614174001';

      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        tipo: TipoAvaliacao.SIMULADO,
        trilhaId,
        trilha: trilhaComDono,
        moduloId: null,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1', moduloId },
          },
          {
            exercicioId: exercicio2Id,
            exercicio: { enunciado: 'Pergunta 2', moduloId: modulo2Id },
          },
        ],
      } as never);
      repo.listarTentativasPorExercicioEAvaliacao.mockResolvedValue([
        {
          id: 'tent-1',
          exercicioId,
          correta: true,
          pontuacao: '10',
        },
      ] as never);
      repo.salvarResultadoAvaliacao.mockResolvedValue({
        id: 'resultado-1',
        avaliacaoId,
        pontuacaoTotal: '10',
      } as never);
      knowledgeGraph.marcarProgressoPorModulo.mockResolvedValue({ atualizados: 1, moduloId });

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [
          { exercicioId, tentativaId: 'tent-1' },
          { exercicioId: exercicio2Id, tentativaId: 'tent-1' },
        ],
      });

      expect(resultado.pontuacaoTotal).toBe('10');
      expect(knowledgeGraph.marcarProgressoPorModulo).toHaveBeenCalledWith(
        moduloId,
        perfilId,
        'dominado',
      );
      expect(knowledgeGraph.marcarProgressoPorModulo).toHaveBeenCalledWith(
        modulo2Id,
        perfilId,
        'dominado',
      );
    });

    it('deve contar exercicio sem resposta como nota zero na média', async () => {
      const outroExercicioId = '523e4567-e89b-12d3-a456-426614174000';

      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          { exercicioId, exercicio: { enunciado: 'Pergunta 1' } },
          { exercicioId: outroExercicioId, exercicio: { enunciado: 'Pergunta 2' } },
        ],
      } as never);
      repo.listarTentativasPorExercicioEAvaliacao.mockResolvedValue([
        { id: 'tent-1', exercicioId, correta: true, pontuacao: '10' },
      ] as never);
      repo.salvarResultadoAvaliacao.mockResolvedValue({
        id: 'resultado-1',
        avaliacaoId,
        pontuacaoTotal: '5',
      } as never);

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [{ exercicioId, tentativaId: 'tent-1' }],
      });

      expect(resultado.pontuacaoTotal).toBe('5');
      expect(repo.listarTentativasPorExercicioEAvaliacao).toHaveBeenCalledTimes(1);
      expect(repo.listarTentativasPorExercicioEAvaliacao).toHaveBeenCalledWith(
        exercicioId,
        avaliacaoId,
        perfilId,
      );
    });

    it('deve pontuar todos os exercícios da avaliação, não apenas os respondidos', async () => {
      const exercicioId2 = '223e4567-e89b-12d3-a456-426614174001';
      const exercicioId3 = '223e4567-e89b-12d3-a456-426614174002';

      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
          {
            exercicioId: exercicioId2,
            exercicio: { enunciado: 'Pergunta 2' },
          },
          {
            exercicioId: exercicioId3,
            exercicio: { enunciado: 'Pergunta 3' },
          },
        ],
      } as never);

      repo.listarTentativasPorExercicioEAvaliacao.mockImplementation(async (id: string) => {
        if (id === exercicioId) {
          return [{ id: 'tent-1', exercicioId, correta: true, pontuacao: '10' }] as never;
        }
        return [] as never;
      });

      repo.salvarResultadoAvaliacao.mockResolvedValue({
        id: 'resultado-1',
        avaliacaoId,
        pontuacaoTotal: '3.33',
      } as never);

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [{ exercicioId, tentativaId: 'tent-1' }],
      });

      expect(resultado.pontuacaoTotal).toBe('3.33');
      expect(repo.listarTentativasPorExercicioEAvaliacao).toHaveBeenCalledTimes(1);
      expect(repo.listarTentativasPorExercicioEAvaliacao).toHaveBeenCalledWith(
        exercicioId,
        avaliacaoId,
        perfilId,
      );
      expect(knowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
    });

    it('deve rejeitar respostas de exercicios fora da avaliacao', async () => {
      const exercicioEstranhoId = '523e4567-e89b-12d3-a456-426614174000';

      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [{ exercicioId, exercicio: { enunciado: 'Pergunta 1' } }],
      } as never);
      repo.listarTentativasPorExercicioEAvaliacao.mockResolvedValue([
        { id: 'tent-1', exercicioId, correta: true, pontuacao: '10' },
      ] as never);
      repo.salvarResultadoAvaliacao.mockResolvedValue({
        id: 'resultado-1',
        avaliacaoId,
        pontuacaoTotal: '10',
      } as never);

      await expect(
        service.submeter({
          avaliacaoId,
          perfilId,
          respostas: [
            { exercicioId, tentativaId: 'tent-1' },
            { exercicioId: exercicioEstranhoId, tentativaId: 'tent-9' },
          ],
        }),
      ).rejects.toThrow('não vinculado');
      expect(repo.salvarResultadoAvaliacao).not.toHaveBeenCalled();
    });

    it('deve rejeitar respostas com exercício fora da avaliação', async () => {
      const exercicioIdFora = '223e4567-e89b-12d3-a456-426614174099';

      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);

      repo.listarTentativasPorExercicioEAvaliacao.mockResolvedValue([
        { id: 'tent-1', exercicioId, correta: true, pontuacao: '10' },
      ] as never);

      repo.salvarResultadoAvaliacao.mockResolvedValue({
        id: 'resultado-1',
        avaliacaoId,
        pontuacaoTotal: '10',
      } as never);

      await expect(
        service.submeter({
          avaliacaoId,
          perfilId,
          respostas: [
            { exercicioId, tentativaId: 'tent-1' },
            { exercicioId: exercicioIdFora, tentativaId: 'tent-99' },
          ],
        }),
      ).rejects.toThrow('não vinculado');
      expect(repo.salvarResultadoAvaliacao).not.toHaveBeenCalled();
    });

    it('deve retornar o resultado existente ao submeter a mesma avaliação novamente', async () => {
      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);

      repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue({
        id: 'resultado-previo',
        avaliacaoId,
        perfilId,
        pontuacaoTotal: '8.50',
        pontosFortes: 'Pergunta 1',
        pontosFracos: null,
        recomendacoes: 'Bom desempenho',
      } as never);

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [{ exercicioId, tentativaId: 'tent-1' }],
      });

      expect(resultado.pontuacaoTotal).toBe('8.50');
      expect(resultado.pontosFortes).toEqual(['Pergunta 1']);
      expect(resultado.recomendacoes).toEqual(['Bom desempenho']);
      expect(repo.salvarResultadoAvaliacao).not.toHaveBeenCalled();
      expect(revisao.processarRevisao).not.toHaveBeenCalled();
      expect(knowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
    });

    it('deve retornar resultado existente quando inserção conflita com submissão concorrente', async () => {
      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        modulo: moduloComDono,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);

      repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValueOnce(undefined).mockResolvedValue({
        id: 'resultado-concorrente',
        avaliacaoId,
        perfilId,
        pontuacaoTotal: '9.00',
        pontosFortes: 'Pergunta 1',
        pontosFracos: null,
        recomendacoes: null,
      } as never);

      repo.salvarResultadoAvaliacao.mockResolvedValue(undefined as never);
      repo.listarTentativasPorExercicioEAvaliacao.mockResolvedValue([
        { id: 'tent-1', exercicioId, correta: true, pontuacao: '10' },
      ] as never);

      const resultado = await service.submeter({
        avaliacaoId,
        perfilId,
        respostas: [{ exercicioId, tentativaId: 'tent-1' }],
      });

      expect(resultado.pontuacaoTotal).toBe('9.00');
      expect(repo.salvarResultadoAvaliacao).toHaveBeenCalled();
      expect(knowledgeGraph.marcarProgressoPorModulo).not.toHaveBeenCalled();
    });
  });
});
