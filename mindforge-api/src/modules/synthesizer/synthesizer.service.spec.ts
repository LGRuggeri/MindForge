import { Test, TestingModule } from '@nestjs/testing';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { AgentesService } from '../agentes/agentes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { ReviewerService } from './reviewer.service';
import { SynthesizerRepository } from './synthesizer.repository';
import { SynthesizerService } from './synthesizer.service';
import { JOB_QUEUE } from '../../jobs/job-queue.token';

describe('SynthesizerService', () => {
  let service: SynthesizerService;
  let repo: jest.Mocked<SynthesizerRepository>;
  let agentes: jest.Mocked<AgentesService>;
  let biblioteca: jest.Mocked<BibliotecaVivaService>;
  let reviewer: jest.Mocked<ReviewerService>;
  let knowledgeGraph: jest.Mocked<KnowledgeGraphService>;

  const moduloId = '123e4567-e89b-12d3-a456-426614174000';

  const moduloMock = {
    id: moduloId,
    titulo: 'Variáveis em Python',
    objetivoAprendizagem: 'Entender variáveis',
    trilha: {
      objetivo: {
        titulo: 'Python para Iniciantes',
        descricao: 'Aprender Python do zero',
        perfil: { nivelAtual: 'iniciante' },
      },
    },
  };

  const fontesMock = [
    {
      id: 'fonte-1',
      titulo: 'Doc Python',
      resumo: 'Resumo',
      url: 'https://python.org',
      tipo: 'artigo',
    },
  ];

  beforeEach(async () => {
    const repoMock = {
      buscarModuloPorId: jest.fn(),
      listarFontesPorModulo: jest.fn(),
      criarConteudo: jest.fn(),
      vincularFontes: jest.fn(),
      listarConteudosPorModulo: jest.fn(),
    };

    const agentesMock = {
      executar: jest.fn(),
    };

    const bibliotecaMock = {
      indexarTexto: jest.fn(),
      buscar: jest.fn(),
    };

    const reviewerMock = {
      revisar: jest.fn(),
    };

    const knowledgeGraphMock = {
      vincularCompetenciasAoModulo: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthesizerService,
        { provide: SynthesizerRepository, useValue: repoMock },
        { provide: AgentesService, useValue: agentesMock },
        { provide: BibliotecaVivaService, useValue: bibliotecaMock },
        { provide: ReviewerService, useValue: reviewerMock },
        { provide: KnowledgeGraphService, useValue: knowledgeGraphMock },
        { provide: JOB_QUEUE, useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get(SynthesizerService);
    repo = module.get(SynthesizerRepository);
    agentes = module.get(AgentesService);
    biblioteca = module.get(BibliotecaVivaService);
    reviewer = module.get(ReviewerService);
    knowledgeGraph = module.get(KnowledgeGraphService);
  });

  it('deve aprovar conteudo e salvar como revisado quando reviewer der nota >= 3', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue(fontesMock as never);
    agentes.executar.mockResolvedValue({
      titulo: 'Conteúdo',
      corpoMarkdown: '# Intro',
      resumo: 'Resumo',
      palavrasChave: ['vars'],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 4,
      pontosFortes: ['claro'],
      pontosFracos: [],
      sugestoes: [],
    });
    repo.criarConteudo.mockResolvedValue({
      id: 'cont-1',
      moduloId,
      titulo: 'Conteúdo',
      corpoMarkdown: '# Intro',
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([{ id: 'chunk-1' }] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 1,
      competenciaIds: ['c1'],
    });

    const resultado = await service.gerar({ moduloId, topico: 'Variáveis' });

    const conteudo = resultado as Awaited<ReturnType<typeof repo.criarConteudo>> & {
      resumo: string;
      palavrasChave: string[];
      chunksIndexados: number;
      avaliacaoReviewer: { nota: number };
    };
    expect(conteudo.status).toBe('revisado');
    expect(conteudo.avaliacaoReviewer.nota).toBe(4);
    expect(agentes.executar).toHaveBeenCalledTimes(1);
    expect(knowledgeGraph.vincularCompetenciasAoModulo).toHaveBeenCalledWith(
      moduloId,
      expect.arrayContaining([expect.objectContaining({ categoria: 'synthesizer' })]),
    );
  });

  it('deve enviar o corpo markdown completo ao reviewer, sem truncar', async () => {
    const corpoLongo = '# '.concat('a'.repeat(5000));
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([] as never);
    agentes.executar.mockResolvedValue({
      titulo: 'Conteúdo longo',
      corpoMarkdown: corpoLongo,
      resumo: 'Resumo',
      palavrasChave: ['vars'],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 4,
      pontosFortes: ['completo'],
      pontosFracos: [],
      sugestoes: [],
    });
    repo.criarConteudo.mockResolvedValue({
      id: 'cont-longo',
      moduloId,
      titulo: 'Conteúdo longo',
      corpoMarkdown: corpoLongo,
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 0,
      competenciaIds: [],
    });

    await service.gerar({ moduloId, topico: 'Variáveis' });

    expect(reviewer.revisar).toHaveBeenCalledWith(
      expect.objectContaining({ corpoMarkdown: corpoLongo }),
      expect.any(String),
    );
  });

  it('deve reescrever conteudo quando reviewer rejeitar na primeira tentativa', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([] as never);

    agentes.executar
      .mockResolvedValueOnce({
        titulo: 'Conteúdo 1',
        corpoMarkdown: '# Intro',
        resumo: 'Resumo',
        palavrasChave: ['vars'],
      })
      .mockResolvedValueOnce({
        titulo: 'Conteúdo 2',
        corpoMarkdown: '# Intro\nExemplos.',
        resumo: 'Resumo melhor',
        palavrasChave: ['vars', 'exemplos'],
      });

    reviewer.revisar
      .mockResolvedValueOnce({
        nota: 2,
        pontosFortes: [],
        pontosFracos: ['faltou exemplos'],
        sugestoes: ['adicione exemplos'],
      })
      .mockResolvedValueOnce({
        nota: 4,
        pontosFortes: ['melhor'],
        pontosFracos: [],
        sugestoes: [],
      });

    repo.criarConteudo.mockResolvedValue({
      id: 'cont-1',
      moduloId,
      titulo: 'Conteúdo 2',
      corpoMarkdown: '# Intro\nExemplos.',
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 2,
      competenciaIds: ['c1', 'c2'],
    });

    const resultado = await service.gerar({ moduloId, topico: 'Variáveis' });

    const conteudo = resultado as Awaited<ReturnType<typeof repo.criarConteudo>> & {
      resumo: string;
      palavrasChave: string[];
      chunksIndexados: number;
      avaliacaoReviewer: { nota: number };
    };
    expect(conteudo.status).toBe('revisado');
    expect(agentes.executar).toHaveBeenCalledTimes(2);
    expect(reviewer.revisar).toHaveBeenCalledTimes(2);
    expect(knowledgeGraph.vincularCompetenciasAoModulo).toHaveBeenCalled();
  });
});
