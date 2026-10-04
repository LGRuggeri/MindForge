import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { AgentesService } from '../agentes/agentes.service';
import { ImageService } from '../midia/image.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { ReviewerService } from './reviewer.service';
import { SynthesizerRepository } from './synthesizer.repository';
import { SynthesizerService } from './synthesizer.service';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { ResearchService } from '../research/research.service';

describe('SynthesizerService', () => {
  let service: SynthesizerService;
  let repo: jest.Mocked<SynthesizerRepository>;
  let agentes: jest.Mocked<AgentesService>;
  let biblioteca: jest.Mocked<BibliotecaVivaService>;
  let reviewer: jest.Mocked<ReviewerService>;
  let knowledgeGraph: jest.Mocked<KnowledgeGraphService>;
  let imageService: jest.Mocked<ImageService>;
  let research: jest.Mocked<ResearchService>;

  const moduloId = '123e4567-e89b-12d3-a456-426614174000';

  const moduloMock = {
    id: moduloId,
    titulo: 'Variáveis em Python',
    objetivoAprendizagem: 'Entender variáveis',
    trilha: {
      objetivo: {
        titulo: 'Python para Iniciantes',
        descricao: 'Aprender Python do zero',
        nivelDesejado: 'iniciante',
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

    const imageServiceMock = {
      gerarImagem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthesizerService,
        { provide: SynthesizerRepository, useValue: repoMock },
        { provide: AgentesService, useValue: agentesMock },
        { provide: BibliotecaVivaService, useValue: bibliotecaMock },
        { provide: ReviewerService, useValue: reviewerMock },
        { provide: KnowledgeGraphService, useValue: knowledgeGraphMock },
        { provide: ImageService, useValue: imageServiceMock },
        {
          provide: ResearchService,
          useValue: {
            pesquisarAtualizado: jest
              .fn()
              .mockResolvedValue({ fontes: fontesMock, resultadosWeb: 1 }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_key: string, fallback?: string) => fallback) },
        },
        { provide: JOB_QUEUE, useValue: { send: jest.fn() } },
      ],
    }).compile();

    service = module.get(SynthesizerService);
    repo = module.get(SynthesizerRepository);
    agentes = module.get(AgentesService);
    biblioteca = module.get(BibliotecaVivaService);
    reviewer = module.get(ReviewerService);
    knowledgeGraph = module.get(KnowledgeGraphService);
    imageService = module.get(ImageService);
    research = module.get(ResearchService);
  });

  it('interrompe a geração quando a atualização falha, sem salvar nem sintetizar', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue(fontesMock as never);
    research.pesquisarAtualizado.mockRejectedValue(new Error('offline'));
    await expect(service.gerar({ moduloId, topico: 'Python' })).rejects.toThrow('pesquisa web');
    expect(agentes.executar).not.toHaveBeenCalled();
    expect(repo.criarConteudo).not.toHaveBeenCalled();
  });

  it('envia a grade salva ao gerador e ao revisor mesmo sem tópicos informados pelo cliente', async () => {
    repo.buscarModuloPorId.mockResolvedValue({
      ...moduloMock,
      ordem: 1,
      trilha: {
        ...moduloMock.trilha,
        metadata: {
          programa: {
            codigo: 'LIBRAS',
            nome: 'Concurso',
            modoEstudoPadrao: 'concurso',
            modulos: [
              {
                titulo: 'LDB',
                objetivoAprendizagem: 'Comparar modalidades',
                topicosObrigatorios: ['Capítulos V e V-A'],
              },
            ],
          },
        },
      },
    } as never);
    repo.listarFontesPorModulo.mockResolvedValue([]);
    agentes.executar.mockResolvedValue({
      titulo: 'Aula',
      corpoMarkdown: 'Texto',
      resumo: '',
      palavrasChave: [],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 5,
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    repo.criarConteudo.mockResolvedValue({ id: 'rascunho', status: 'rascunho' } as never);
    await service.gerar({ moduloId, topico: 'Meu foco' });
    expect(agentes.executar.mock.calls[0][0].user).toContain('Capítulos V e V-A');
    expect(reviewer.revisar.mock.calls[0][1]).toContain('Capítulos V e V-A');
    expect(reviewer.revisar.mock.calls[0][1]).toContain('Modo de estudo: concurso');
    expect(repo.criarConteudo).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rascunho' }),
    );
  });

  it('mantém aula superficial em rascunho sem indexar no tutor, mesmo com nota global alta', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([]);
    agentes.executar.mockResolvedValue({
      titulo: 'Aula',
      corpoMarkdown: '# Apenas definições',
      resumo: '',
      palavrasChave: ['variáveis'],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 5,
      pontosFortes: [],
      pontosFracos: ['Raso'],
      sugestoes: ['Desenvolver'],
      criterios: { profundidade: 1, cobertura: 4, fundamentacao: 4, aplicacao: 2 },
      topicosPendentes: [],
    });
    repo.criarConteudo.mockResolvedValue({ id: 'rascunho', status: 'rascunho' } as never);
    await service.gerar({
      moduloId,
      topico: 'Variáveis',
      modoEstudo: 'concurso',
      topicosObrigatorios: ['Escopo'],
    });
    expect(agentes.executar).toHaveBeenCalledTimes(3);
    expect(repo.criarConteudo).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'rascunho' }),
    );
    expect(biblioteca.indexarTexto).not.toHaveBeenCalled();
    expect(knowledgeGraph.vincularCompetenciasAoModulo).not.toHaveBeenCalled();
    expect(reviewer.revisar.mock.calls[0][1]).toContain('Escopo');
    expect(agentes.executar.mock.calls[0][0].user).toContain('Escopo');
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
      criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
      topicosPendentes: [],
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
    expect(research.pesquisarAtualizado).toHaveBeenCalledWith({
      moduloId,
      topico: 'Variáveis',
      limite: 8,
    });
    expect(repo.criarConteudo).toHaveBeenCalledWith(
      expect.objectContaining({
        atualizacaoFontes: {
          tipo: 'busca_web',
          realizadaEm: expect.any(String),
          resultadosWeb: 1,
          fontesEncontradas: 1,
        },
      }),
    );
    expect(conteudo.avaliacaoReviewer.nota).toBe(4);
    expect(agentes.executar).toHaveBeenCalledTimes(1);
    expect(agentes.executar.mock.calls[0][0].user).toContain('origem não verificada');
    expect(knowledgeGraph.vincularCompetenciasAoModulo).toHaveBeenCalledWith(
      moduloId,
      expect.arrayContaining([expect.objectContaining({ categoria: 'synthesizer' })]),
    );
  });

  it('usa referências salvas apenas quando solicitado, registrando ausência de busca', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue(fontesMock as never);
    agentes.executar.mockResolvedValue({
      titulo: 'Aula',
      corpoMarkdown: 'Texto',
      resumo: '',
      palavrasChave: [],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 5,
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    repo.criarConteudo.mockResolvedValue({ id: 'c', status: 'rascunho' } as never);
    await service.gerar({ moduloId, topico: 'Python', atualizarFontes: false });
    expect(research.pesquisarAtualizado).not.toHaveBeenCalled();
    expect(repo.criarConteudo).toHaveBeenCalledWith(
      expect.objectContaining({
        atualizacaoFontes: {
          tipo: 'fontes_salvas',
          realizadaEm: null,
          resultadosWeb: 0,
          fontesEncontradas: 0,
        },
      }),
    );
    expect(repo.vincularFontes).toHaveBeenCalledWith('c', ['fonte-1']);
  });

  it('prioriza fontes desta busca e conserva referências complementares sem duplicar URLs', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([
      ...fontesMock,
      { ...fontesMock[0], id: 'complemento', url: 'https://docs.python.org' },
    ] as never);
    research.pesquisarAtualizado.mockResolvedValue({
      fontes: [{ ...fontesMock[0], id: 'nova', resumo: 'Trecho atual' }],
      resultadosWeb: 1,
    } as never);
    agentes.executar.mockResolvedValue({
      titulo: 'Aula',
      corpoMarkdown: 'Texto',
      resumo: '',
      palavrasChave: [],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 5,
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    repo.criarConteudo.mockResolvedValue({ id: 'c', status: 'rascunho' } as never);
    await service.gerar({ moduloId, topico: 'Python' });
    expect(agentes.executar.mock.calls[0][0].user).toContain('Trecho atual');
    expect(repo.vincularFontes).toHaveBeenCalledWith('c', ['nova', 'complemento']);
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
      criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
      topicosPendentes: [],
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
        criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
        topicosPendentes: [],
        pontosFortes: [],
        pontosFracos: ['faltou exemplos'],
        sugestoes: ['adicione exemplos'],
      })
      .mockResolvedValueOnce({
        nota: 4,
        criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
        topicosPendentes: [],
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

  it('deve injetar ilustrações geradas no corpo markdown', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([] as never);
    agentes.executar.mockResolvedValue({
      titulo: 'Ciclo da água',
      corpoMarkdown: '# Ciclo\n\n[[imagem:0]]\n\nEvaporação e condensação.',
      resumo: 'Resumo',
      palavrasChave: ['água'],
      ilustracoes: [{ prompt: 'Water cycle diagram with labels' }],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 4,
      criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
      topicosPendentes: [],
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    imageService.gerarImagem.mockResolvedValue({
      arquivo: 'imagem-abc.png',
      prompt: 'Water cycle diagram with labels',
    });
    repo.criarConteudo.mockResolvedValue({
      id: 'cont-img',
      moduloId,
      titulo: 'Ciclo da água',
      corpoMarkdown: '',
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 0,
      competenciaIds: [],
    });

    await service.gerar({ moduloId, topico: 'Ciclo da água' });

    expect(imageService.gerarImagem).toHaveBeenCalledWith({
      prompt: 'Water cycle diagram with labels',
    });
    const salvo = repo.criarConteudo.mock.calls[0][0] as { corpoMarkdown: string };
    expect(salvo.corpoMarkdown).toContain('![Water cycle diagram with labels]');
    expect(salvo.corpoMarkdown).toContain('http://localhost:3000/midia/imagem/imagem-abc.png');
    expect(salvo.corpoMarkdown).not.toContain('[[imagem:0]]');
  });

  it('deve salvar conteúdo sem imagem quando o provedor de imagem falhar', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([] as never);
    agentes.executar.mockResolvedValue({
      titulo: 'Ciclo da água',
      corpoMarkdown: '# Ciclo\n\n[[imagem:0]]\n\nTexto.',
      resumo: 'Resumo',
      palavrasChave: ['água'],
      ilustracoes: [{ prompt: 'Water cycle diagram' }],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 4,
      criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
      topicosPendentes: [],
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    imageService.gerarImagem.mockRejectedValue(new Error('provedor fora do ar'));
    repo.criarConteudo.mockResolvedValue({
      id: 'cont-sem-img',
      moduloId,
      titulo: 'Ciclo da água',
      corpoMarkdown: '',
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 0,
      competenciaIds: [],
    });

    const resultado = await service.gerar({ moduloId, topico: 'Ciclo da água' });

    expect(repo.criarConteudo).toHaveBeenCalled();
    const salvo = repo.criarConteudo.mock.calls[0][0] as { corpoMarkdown: string };
    expect(salvo.corpoMarkdown).not.toContain('[[imagem:0]]');
    expect(salvo.corpoMarkdown).not.toContain('/midia/imagem/');
    expect((resultado as { status: string }).status).toBe('revisado');
  });

  it('deve ignorar prompts inválidos preservando o índice original do placeholder', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([] as never);
    const corpo = '# Ciclo\n\n[[imagem:0]]\n\n[[imagem:1]]\n\n[[imagem:2]]\n\nFim.';
    agentes.executar.mockResolvedValue({
      titulo: 'Ciclo da água',
      corpoMarkdown: corpo,
      resumo: 'Resumo',
      palavrasChave: ['água'],
      // Índice 1 inválido: o prompt do índice 2 precisa continuar casando com
      // [[imagem:2]], não ser deslocado para [[imagem:1]].
      ilustracoes: [{ prompt: 'Diagrama 1' }, { prompt: '  ' }, { prompt: 'Diagrama 2' }] as never,
    });
    reviewer.revisar.mockResolvedValue({
      nota: 4,
      criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
      topicosPendentes: [],
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    imageService.gerarImagem.mockResolvedValue({ arquivo: 'imagem-x.png', prompt: 'p' });
    repo.criarConteudo.mockResolvedValue({
      id: 'cont-limite',
      moduloId,
      titulo: 'Ciclo da água',
      corpoMarkdown: '',
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 0,
      competenciaIds: [],
    });

    await service.gerar({ moduloId, topico: 'Ciclo da água' });

    expect(imageService.gerarImagem).toHaveBeenCalledTimes(2);
    expect(imageService.gerarImagem).toHaveBeenCalledWith({ prompt: 'Diagrama 1' });
    expect(imageService.gerarImagem).toHaveBeenCalledWith({ prompt: 'Diagrama 2' });
    const salvo = repo.criarConteudo.mock.calls[0][0] as { corpoMarkdown: string };
    expect(salvo.corpoMarkdown).not.toContain('[[imagem:');
  });

  it('deve limitar a 3 ilustrações mesmo quando todas são válidas', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([] as never);
    const corpo = '# Ciclo\n\n[[imagem:0]]\n\n[[imagem:1]]\n\n[[imagem:2]]\n\n[[imagem:3]]\n\nFim.';
    agentes.executar.mockResolvedValue({
      titulo: 'Ciclo da água',
      corpoMarkdown: corpo,
      resumo: 'Resumo',
      palavrasChave: ['água'],
      ilustracoes: [
        { prompt: 'Diagrama 1' },
        { prompt: 'Diagrama 2' },
        { prompt: 'Diagrama 3' },
        { prompt: 'Diagrama 4' },
      ],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 4,
      criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
      topicosPendentes: [],
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    imageService.gerarImagem.mockResolvedValue({ arquivo: 'imagem-x.png', prompt: 'p' });
    repo.criarConteudo.mockResolvedValue({
      id: 'cont-cap',
      moduloId,
      titulo: 'Ciclo da água',
      corpoMarkdown: '',
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 0,
      competenciaIds: [],
    });

    await service.gerar({ moduloId, topico: 'Ciclo da água' });

    expect(imageService.gerarImagem).toHaveBeenCalledTimes(3);
    expect(imageService.gerarImagem).not.toHaveBeenCalledWith({ prompt: 'Diagrama 4' });
    const salvo = repo.criarConteudo.mock.calls[0][0] as { corpoMarkdown: string };
    expect(salvo.corpoMarkdown).not.toContain('[[imagem:');
  });

  it('deve seguir sem ilustrações quando ilustracoes vem com shape não-array', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([] as never);
    agentes.executar.mockResolvedValue({
      titulo: 'Ciclo da água',
      corpoMarkdown: '# Ciclo\n\n[[imagem:0]]\n\nFim.',
      resumo: 'Resumo',
      palavrasChave: ['água'],
      // parseJsonSeguro faz cast — o LLM pode devolver objeto/string aqui.
      ilustracoes: { prompt: 'shape errado' } as never,
    });
    reviewer.revisar.mockResolvedValue({
      nota: 4,
      criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
      topicosPendentes: [],
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    repo.criarConteudo.mockResolvedValue({
      id: 'cont-shape',
      moduloId,
      titulo: 'Ciclo da água',
      corpoMarkdown: '',
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 0,
      competenciaIds: [],
    });

    const resultado = await service.gerar({ moduloId, topico: 'Ciclo da água' });

    expect(imageService.gerarImagem).not.toHaveBeenCalled();
    const salvo = repo.criarConteudo.mock.calls[0][0] as { corpoMarkdown: string };
    expect(salvo.corpoMarkdown).not.toContain('[[imagem:');
    expect((resultado as { status: string }).status).toBe('revisado');
  });

  it('deve substituir todas as ocorrências de um placeholder repetido pelo LLM', async () => {
    repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
    repo.listarFontesPorModulo.mockResolvedValue([] as never);
    agentes.executar.mockResolvedValue({
      titulo: 'Ciclo da água',
      corpoMarkdown: '# Ciclo\n\n[[imagem:0]]\n\nTexto.\n\n[[imagem:0]]\n\nFim.',
      resumo: 'Resumo',
      palavrasChave: ['água'],
      ilustracoes: [{ prompt: 'Water cycle diagram' }],
    });
    reviewer.revisar.mockResolvedValue({
      nota: 4,
      criterios: { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 },
      topicosPendentes: [],
      pontosFortes: [],
      pontosFracos: [],
      sugestoes: [],
    });
    imageService.gerarImagem.mockResolvedValue({
      arquivo: 'imagem-dup.png',
      prompt: 'Water cycle diagram',
    });
    repo.criarConteudo.mockResolvedValue({
      id: 'cont-dup',
      moduloId,
      titulo: 'Ciclo da água',
      corpoMarkdown: '',
      versao: 1,
      status: 'revisado',
      criadoEm: new Date(),
    } as never);
    biblioteca.indexarTexto.mockResolvedValue([] as never);
    knowledgeGraph.vincularCompetenciasAoModulo.mockResolvedValue({
      vinculados: 0,
      competenciaIds: [],
    });

    await service.gerar({ moduloId, topico: 'Ciclo da água' });

    expect(imageService.gerarImagem).toHaveBeenCalledTimes(1);
    const salvo = repo.criarConteudo.mock.calls[0][0] as { corpoMarkdown: string };
    const ocorrencias = salvo.corpoMarkdown.split('/midia/imagem/imagem-dup.png').length - 1;
    expect(ocorrencias).toBe(2);
    expect(salvo.corpoMarkdown).not.toContain('[[imagem:');
  });
});
