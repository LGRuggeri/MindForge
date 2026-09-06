import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { PlannerService } from './planner.service';
import { PlannerRepository } from './planner.repository';

describe('PlannerService', () => {
  let service: PlannerService;
  let repo: jest.Mocked<PlannerRepository>;
  let agentes: jest.Mocked<AgentesService>;
  let knowledgeGraph: jest.Mocked<KnowledgeGraphService>;

  const objetivoId = '123e4567-e89b-12d3-a456-426614174000';

  const moduloValido = (ordem: number) => ({
    ordem,
    titulo: `Módulo ${ordem}`,
    objetivoAprendizagem: `Aprender o conteúdo ${ordem}`,
    tempoEstimadoMin: 60,
  });

  const planoValido = (quantidade: number) => ({
    tituloTrilha: 'Trilha de teste',
    versao: 1,
    modulos: Array.from({ length: quantidade }, (_, i) => moduloValido(i + 1)),
  });

  /** Simula o AgentesService aplicando o parser do Planner no JSON bruto do LLM. */
  const mockAgentesComRaw = (raw: string) => {
    agentes.executar.mockImplementation((config: { parser: (r: string) => unknown }) =>
      Promise.resolve(config.parser(raw) as never),
    );
  };

  beforeEach(async () => {
    const repoMock = {
      criarObjetivo: jest.fn(),
      listarObjetivosDoPerfil: jest.fn(),
      buscarModuloPorId: jest.fn(),
      buscarObjetivoPorId: jest.fn(),
      removerObjetivo: jest.fn(),
      executarEmTransacao: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
      criarTrilha: jest.fn(),
      substituirTrilhasAnteriores: jest.fn(),
      criarModulos: jest.fn(),
    };

    const agentesMock = {
      executar: jest.fn(),
    };

    const knowledgeGraphMock = {
      criarCompetencia: jest.fn(async ({ nome }: { nome: string }) => ({
        id: `comp-${nome}`,
        nome,
        descricao: null,
      })),
      vincularCompetenciasAoModulo: jest.fn(),
      criarRelacaoSeNaoExistir: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlannerService,
        { provide: PlannerRepository, useValue: repoMock },
        { provide: AgentesService, useValue: agentesMock },
        { provide: KnowledgeGraphService, useValue: knowledgeGraphMock },
      ],
    }).compile();

    service = module.get(PlannerService);
    repo = module.get(PlannerRepository);
    agentes = module.get(AgentesService);
    knowledgeGraph = module.get(KnowledgeGraphService);

    repo.buscarObjetivoPorId.mockResolvedValue({
      id: objetivoId,
      titulo: 'Objetivo de teste',
    } as never);
    repo.criarTrilha.mockResolvedValue({ id: 'trilha-1' } as never);
    repo.criarModulos.mockImplementation(
      async (modulos: Array<{ ordem: number; titulo: string }>) =>
        modulos.map((m, i) => ({
          id: `mod-${i + 1}`,
          ordem: m.ordem,
          titulo: m.titulo,
          objetivoAprendizagem: null,
        })) as never,
    );
  });

  describe('gerarTrilha — validação do plano retornado pelo LLM', () => {
    it('aceita um plano válido com 3 módulos', async () => {
      mockAgentesComRaw(JSON.stringify(planoValido(3)));

      const resultado = await service.gerarTrilha(objetivoId);

      expect(resultado.modulos).toHaveLength(3);
      expect(repo.criarTrilha).toHaveBeenCalled();
      expect(knowledgeGraph.criarRelacaoSeNaoExistir).toHaveBeenCalledTimes(2);
    });

    it('aceita JSON embrulhado em bloco de código markdown', async () => {
      mockAgentesComRaw(`\`\`\`json\n${JSON.stringify(planoValido(3))}\n\`\`\``);

      const resultado = await service.gerarTrilha(objetivoId);

      expect(resultado.modulos).toHaveLength(3);
    });

    it('rejeita plano sem módulos (mínimo 3)', async () => {
      mockAgentesComRaw(JSON.stringify({ ...planoValido(3), modulos: [] }));

      await expect(service.gerarTrilha(objetivoId)).rejects.toThrow(/plano inválido/);
      expect(repo.criarTrilha).not.toHaveBeenCalled();
    });

    it('rejeita plano com mais de 8 módulos', async () => {
      mockAgentesComRaw(JSON.stringify(planoValido(9)));

      await expect(service.gerarTrilha(objetivoId)).rejects.toThrow(/plano inválido/);
      expect(repo.criarTrilha).not.toHaveBeenCalled();
    });

    it('rejeita módulo com tempoEstimadoMin inválido', async () => {
      const plano = planoValido(3);
      plano.modulos[1].tempoEstimadoMin = 0;
      mockAgentesComRaw(JSON.stringify(plano));

      await expect(service.gerarTrilha(objetivoId)).rejects.toThrow(/plano inválido/);
      expect(repo.criarTrilha).not.toHaveBeenCalled();
    });

    it('rejeita resposta que não é JSON', async () => {
      mockAgentesComRaw('desculpe, não consegui gerar a trilha');

      await expect(service.gerarTrilha(objetivoId)).rejects.toThrow(/resposta inválida/);
      expect(repo.criarTrilha).not.toHaveBeenCalled();
    });
  });

  describe('removerObjetivo', () => {
    it('remove o objetivo existente', async () => {
      await service.removerObjetivo(objetivoId);

      expect(repo.removerObjetivo).toHaveBeenCalledWith(objetivoId);
    });

    it('lança NotFound quando o objetivo não existe e não remove nada', async () => {
      repo.buscarObjetivoPorId.mockResolvedValue(null as never);

      await expect(service.removerObjetivo(objetivoId)).rejects.toThrow(NotFoundException);
      expect(repo.removerObjetivo).not.toHaveBeenCalled();
    });
  });
});
