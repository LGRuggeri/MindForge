import { ResearchService } from './research.service';
import { BadGatewayException } from '@nestjs/common';

describe('ResearchService — fontes e procedência', () => {
  const fonte = {
    tipo: 'artigo',
    titulo: 'Guia',
    url: 'https://example.org/guia?q=1',
    autor: null,
    confiabilidadeScore: 1,
    resumo: 'Exemplo com ```json preservado',
  };
  const web = {
    titulo: 'Guia real',
    url: fonte.url,
    resumo: 'Resumo da busca',
    fonte: 'example.org',
  };
  let resposta: unknown;
  let repo: { buscarModuloPorId: jest.Mock; criarFontes: jest.Mock; listarPorModulo: jest.Mock };
  let agentes: { executar: jest.Mock };
  let busca: { buscar: jest.Mock };
  let queue: { send: jest.Mock };
  let service: ResearchService;
  beforeEach(() => {
    resposta = { estrategia: 'Curadoria', fontes: [fonte] };
    repo = {
      buscarModuloPorId: jest
        .fn()
        .mockResolvedValue({ titulo: 'Módulo', objetivoAprendizagem: 'Estudar' }),
      criarFontes: jest
        .fn()
        .mockImplementation(async (dados) => dados.map((d: object) => ({ id: 'fonte', ...d }))),
      listarPorModulo: jest.fn().mockResolvedValue([]),
    };
    agentes = {
      executar: jest
        .fn()
        .mockImplementation(async (opcoes) => opcoes.parser(JSON.stringify(resposta))),
    };
    busca = { buscar: jest.fn().mockResolvedValue([web]) };
    queue = { send: jest.fn().mockResolvedValue('job') };
    service = new ResearchService(repo as never, agentes as never, busca as never, queue as never);
  });
  const pesquisar = { moduloId: 'm', webSearch: true };
  it.each([
    [-0.5, '0'],
    [0.956, '0.96'],
    [1.5, '1'],
    [null, null],
  ])('normaliza score %s para %s na persistência', async (score, esperado) => {
    resposta = { fontes: [{ ...fonte, confiabilidadeScore: score }] };
    await service.pesquisar(pesquisar);
    expect(repo.criarFontes).toHaveBeenCalledWith([
      expect.objectContaining({ confiabilidadeScore: esperado }),
    ]);
  });
  it('deduplica sugestões pelo título normalizado', async () => {
    resposta = {
      fontes: [
        { ...fonte, url: null },
        { ...fonte, titulo: ' GUIA ', url: undefined },
      ],
    };
    await service.pesquisar(pesquisar);
    expect(repo.criarFontes.mock.calls[0][0]).toHaveLength(1);
  });
  it('persiste somente URL correspondente e conserva o Markdown', async () => {
    resposta = {
      estrategia: 'Curadoria',
      fontes: [{ ...fonte, url: 'https://EXAMPLE.ORG:443/guia?q=1#secao' }],
    };
    await service.pesquisar(pesquisar);
    expect(repo.criarFontes).toHaveBeenCalledWith([
      expect.objectContaining({ url: web.url, origem: 'busca_web', resumo: fonte.resumo }),
    ]);
  });
  it.each([
    'https://inventada.org',
    'https://example.org/guia?q=2',
    'https://example.org/Guia?q=1',
    'javascript:alert(1)',
    'data:text/html,oi',
    'file:///tmp/a',
    '//example.org/guia',
    'https://usuario:senha@example.org/guia?q=1',
  ])('remove URL sem correspondência ou insegura: %s', async (url) => {
    resposta = { estrategia: 'Curadoria', fontes: [{ ...fonte, url }] };
    await service.pesquisar(pesquisar);
    expect(repo.criarFontes).toHaveBeenCalledWith([
      expect.objectContaining({ url: null, origem: 'sugestao_ia' }),
    ]);
  });
  it.each([false, true])(
    'mantém sugestão sem link quando não há resultados (webSearch=%s)',
    async (webSearch) => {
      busca.buscar.mockResolvedValue([]);
      await service.pesquisar({ ...pesquisar, webSearch });
      expect(repo.criarFontes).toHaveBeenCalledWith([
        expect.objectContaining({ url: null, origem: 'sugestao_ia' }),
      ]);
    },
  );
  it('degrada para sugestão quando o provider falha', async () => {
    busca.buscar.mockRejectedValue(new Error('offline'));
    await service.pesquisar(pesquisar);
    expect(repo.criarFontes).toHaveBeenCalledWith([
      expect.objectContaining({ url: null, origem: 'sugestao_ia' }),
    ]);
  });
  it('filtra resultados web inseguros antes de enviar à IA', async () => {
    busca.buscar.mockResolvedValue([{ ...web, url: 'javascript:alert(1)' }]);
    await service.pesquisar(pesquisar);
    expect(agentes.executar.mock.calls[0][0].system).not.toContain('javascript:');
  });
  it('remove duplicatas e respeita o limite solicitado', async () => {
    resposta = {
      estrategia: 'Curadoria',
      fontes: [
        fonte,
        { ...fonte, url: fonte.url + '#x' },
        { ...fonte, titulo: 'Livro', url: null },
      ],
    };
    await service.pesquisar({ ...pesquisar, limite: 1 });
    expect(repo.criarFontes.mock.calls[0][0]).toHaveLength(1);
  });
  it.each([
    null,
    { fontes: [] },
    { fontes: [{ ...fonte, titulo: {} }] },
    { fontes: [fonte], estrategia: 42 },
    { fontes: [{ ...fonte, url: 42 }] },
  ])('recusa formato inválido antes de persistir %j', async (valor) => {
    resposta = valor;
    await expect(service.pesquisar(pesquisar)).rejects.toThrow(BadGatewayException);
    expect(repo.criarFontes).not.toHaveBeenCalled();
  });
  it.each([false, true])('recusa módulo ausente (async=%s)', async (async) => {
    repo.buscarModuloPorId.mockResolvedValue(undefined);
    await expect(service.pesquisar({ ...pesquisar, async })).rejects.toThrow('não encontrado');
    expect(queue.send).not.toHaveBeenCalled();
    expect(agentes.executar).not.toHaveBeenCalled();
  });
  it('enfileira com contexto sem chamar IA e sinaliza falha de enqueue', async () => {
    expect(await service.pesquisar({ ...pesquisar, async: true })).toMatchObject({
      jobId: 'job',
      topico: 'Módulo',
    });
    expect(agentes.executar).not.toHaveBeenCalled();
    queue.send.mockResolvedValue(null);
    await expect(service.pesquisar({ ...pesquisar, async: true })).rejects.toThrow('enfileirar');
  });
});
