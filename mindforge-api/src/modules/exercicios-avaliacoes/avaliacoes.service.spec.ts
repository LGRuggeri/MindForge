import { Test, TestingModule } from '@nestjs/testing';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';
import { AvaliacoesService } from './avaliacoes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';
import { TipoAvaliacao } from './dto';

describe('AvaliacoesService', () => {
  let service: AvaliacoesService;
  let repo: jest.Mocked<ExerciciosAvaliacoesRepository>;
  let revisao: jest.Mocked<RevisaoEspacadaService>;
  let knowledgeGraph: jest.Mocked<KnowledgeGraphService>;

  const avaliacaoId = '123e4567-e89b-12d3-a456-426614174000';
  const exercicioId = '223e4567-e89b-12d3-a456-426614174000';
  const moduloId = '323e4567-e89b-12d3-a456-426614174000';
  const perfilId = '423e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    const repoMock = {
      criarAvaliacao: jest.fn(),
      adicionarExerciciosNaAvaliacao: jest.fn(),
      buscarAvaliacaoPorId: jest.fn(),
      listarTentativasPorExercicio: jest.fn(),
      salvarResultadoAvaliacao: jest.fn(),
    };

    const revisaoMock = {
      processarRevisao: jest.fn(),
    };

    const knowledgeGraphMock = {
      marcarProgressoPorModulo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvaliacoesService,
        { provide: ExerciciosAvaliacoesRepository, useValue: repoMock },
        { provide: RevisaoEspacadaService, useValue: revisaoMock },
        { provide: KnowledgeGraphService, useValue: knowledgeGraphMock },
      ],
    }).compile();

    service = module.get(AvaliacoesService);
    repo = module.get(ExerciciosAvaliacoesRepository);
    revisao = module.get(RevisaoEspacadaService);
    knowledgeGraph = module.get(KnowledgeGraphService);
  });

  describe('criar', () => {
    it('deve criar avaliacao com exercicios', async () => {
      repo.criarAvaliacao.mockResolvedValue({
        id: avaliacaoId,
        titulo: 'Avaliacao 1',
        tipo: TipoAvaliacao.FORMATIVA,
      } as never);
      repo.buscarAvaliacaoPorId.mockResolvedValue({ id: avaliacaoId } as never);

      const resultado = await service.criar({
        titulo: 'Avaliacao 1',
        tipo: TipoAvaliacao.FORMATIVA,
        exerciciosIds: [exercicioId],
      });

      expect(resultado).toBeDefined();
      expect(resultado!.id).toBe(avaliacaoId);
      expect(repo.adicionarExerciciosNaAvaliacao).toHaveBeenCalledWith([
        { avaliacaoId, exercicioId, ordem: 1 },
      ]);
    });
  });

  describe('submeter', () => {
    it('deve calcular resultado e disparar revisao', async () => {
      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);
      repo.listarTentativasPorExercicio.mockResolvedValue([
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
      expect(revisao.processarRevisao).toHaveBeenCalledWith(
        expect.objectContaining({
          itemTipo: 'exercicio',
          itemId: exercicioId,
          qualidade: 5,
        }),
      );
      expect(knowledgeGraph.marcarProgressoPorModulo).toHaveBeenCalledWith(
        moduloId,
        perfilId,
        'dominado',
      );
    });

    it('nao deve atualizar progresso quando nota for baixa', async () => {
      repo.buscarAvaliacaoPorId.mockResolvedValue({
        id: avaliacaoId,
        moduloId,
        exercicios: [
          {
            exercicioId,
            exercicio: { enunciado: 'Pergunta 1' },
          },
        ],
      } as never);
      repo.listarTentativasPorExercicio.mockResolvedValue([
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
  });
});
