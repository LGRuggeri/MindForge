import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { PlannerService } from './planner.service';
import { PlannerRepository } from './planner.repository';
import { programaAz900 } from './trilhas-guiadas/az-900';
import { programaKaliLinux } from './trilhas-guiadas/kali-linux';

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
      buscarPerfilPorId: jest.fn(async () => ({ id: 'perfil-a' })),
      criarFontesPrograma: jest.fn(),
      listarObjetivosDoPerfil: jest.fn(),
      buscarModuloPorId: jest.fn(),
      buscarObjetivoPorId: jest.fn(),
      removerObjetivo: jest.fn(),
      listarCompetenciasDosModulosDoObjetivo: jest.fn(),
      removerCompetenciasOrfas: jest.fn(),
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

  describe('objetivo pronto do perfil', () => {
    it('cria objetivo e apenas os módulos escolhidos numa transação, sem chamar a IA', async () => {
      repo.criarObjetivo.mockResolvedValue({ id: objetivoId, perfilId: 'perfil-a' } as never);
      const criado = await service.criarObjetivo({
        perfilId: 'perfil-a',
        titulo: 'Meu estudo',
        programaCodigo: 'CONCURSO-LIBRAS-IBAM-2026',
        modulosIndices: [5, 2],
      });
      expect(repo.executarEmTransacao).toHaveBeenCalledTimes(1);
      expect(repo.criarObjetivo).toHaveBeenCalledWith(
        expect.objectContaining({ perfilId: 'perfil-a' }),
        expect.anything(),
      );
      expect(repo.criarModulos.mock.calls[0][0]).toHaveLength(2);
      expect(repo.criarTrilha.mock.calls[0][0].metadata).toEqual(
        expect.objectContaining({ modulosIndices: [2, 5] }),
      );
      expect(repo.criarFontesPrograma).toHaveBeenCalled();
      expect(criado).toHaveProperty('trilhas');
      expect(agentes.executar).not.toHaveBeenCalled();
    });
    it('rejeita perfil inexistente e seleção inválida antes de gravar o estudo', async () => {
      repo.buscarPerfilPorId.mockResolvedValue(undefined);
      await expect(
        service.criarObjetivo({ perfilId: 'ausente', titulo: 'Teste', programaCodigo: 'AZ-900' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.criarObjetivo({
          perfilId: 'a',
          titulo: 'Teste',
          programaCodigo: 'AZ-900',
          modulosIndices: [99],
        }),
      ).rejects.toThrow();
      await expect(
        service.criarObjetivo({ perfilId: 'a', titulo: 'Teste', modulosIndices: [1] }),
      ).rejects.toThrow();
      expect(repo.criarObjetivo).not.toHaveBeenCalled();
    });
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

  describe('trilha de certificação AZ-900', () => {
    it('cobre os três domínios oficiais sem depender da resposta do LLM', async () => {
      const resultado = await service.gerarTrilha(objetivoId, 'AZ-900');

      expect(agentes.executar).not.toHaveBeenCalled();
      expect(resultado.modulos).toHaveLength(8);
      expect(repo.criarModulos).toHaveBeenCalledWith(
        programaAz900.modulos.map((modulo, indice) =>
          expect.objectContaining({
            ordem: indice + 1,
            titulo: modulo.titulo,
            objetivoAprendizagem: modulo.objetivoAprendizagem,
          }),
        ),
        expect.anything(),
      );
      expect(repo.criarTrilha).toHaveBeenCalledWith(
        expect.objectContaining({
          geradoPorAgente: 'catalogo-certificacoes',
          metadata: expect.objectContaining({
            tituloTrilha: 'AZ-900 — Microsoft Azure Fundamentals',
            programa: programaAz900,
            certificacao: programaAz900,
          }),
        }),
        expect.anything(),
      );
    });

    it('não substitui a trilha atual para um código desconhecido', async () => {
      await expect(service.gerarTrilha(objetivoId, 'AZ-999')).rejects.toThrow(/não disponível/);
      expect(repo.criarTrilha).not.toHaveBeenCalled();
      expect(repo.substituirTrilhasAnteriores).not.toHaveBeenCalled();
    });

    it('cria trilha por assunto sem registrar uma certificação fictícia', async () => {
      const resultado = await service.gerarTrilha(objetivoId, programaKaliLinux.codigo);

      expect(resultado.modulos).toHaveLength(programaKaliLinux.modulos.length);
      expect(agentes.executar).not.toHaveBeenCalled();
      expect(repo.criarTrilha).toHaveBeenCalledWith(
        expect.objectContaining({
          geradoPorAgente: 'catalogo-trilhas',
          metadata: {
            tituloTrilha: 'KALI-LINUX — Kali Linux em laboratório',
            programa: programaKaliLinux,
            modulosIndices: [1, 2, 3, 4, 5, 6, 7],
          },
        }),
        expect.anything(),
      );
    });

    it('mantém cada domínio do catálogo representado em módulos', () => {
      const dominios = new Set(programaAz900.dominios.map((dominio) => dominio.codigo));
      const dominiosComModulo = new Set(
        programaAz900.modulos.map((modulo) => modulo.dominioCodigo),
      );
      expect(dominiosComModulo).toEqual(dominios);
      expect(
        programaAz900.dominios.map((dominio) => [dominio.pesoMinimo, dominio.pesoMaximo]),
      ).toEqual([
        [25, 30],
        [35, 40],
        [30, 35],
      ]);
    });
  });

  describe('removerObjetivo', () => {
    beforeEach(() => {
      repo.listarCompetenciasDosModulosDoObjetivo.mockResolvedValue(['comp-1', 'comp-2']);
      repo.removerCompetenciasOrfas.mockResolvedValue(2);
    });

    it('remove o objetivo existente e as competências órfãs dos módulos', async () => {
      await service.removerObjetivo(objetivoId);

      expect(repo.listarCompetenciasDosModulosDoObjetivo).toHaveBeenCalledWith(objetivoId);
      expect(repo.removerObjetivo).toHaveBeenCalledWith(objetivoId);
      expect(repo.removerCompetenciasOrfas).toHaveBeenCalledWith(['comp-1', 'comp-2']);
    });

    it('delega lista vazia quando o objetivo não tinha módulos (repositório no-op)', async () => {
      repo.listarCompetenciasDosModulosDoObjetivo.mockResolvedValue([]);

      await service.removerObjetivo(objetivoId);

      expect(repo.removerObjetivo).toHaveBeenCalledWith(objetivoId);
      expect(repo.removerCompetenciasOrfas).toHaveBeenCalledWith([]);
    });

    it('lança NotFound quando o objetivo não existe e não remove nada', async () => {
      repo.buscarObjetivoPorId.mockResolvedValue(null as never);

      await expect(service.removerObjetivo(objetivoId)).rejects.toThrow(NotFoundException);
      expect(repo.listarCompetenciasDosModulosDoObjetivo).not.toHaveBeenCalled();
      expect(repo.removerObjetivo).not.toHaveBeenCalled();
    });
  });
});
