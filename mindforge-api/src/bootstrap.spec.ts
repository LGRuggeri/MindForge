import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { NestFactory } from '@nestjs/core';
import { PerfilRepository } from './modules/perfil/perfil.repository';
import { bootstrap, configurarAplicacao } from './main';

const mockPool = { end: jest.fn(), query: jest.fn(), on: jest.fn() };
const mockBoss = {
  start: jest.fn(),
  stop: jest.fn(),
  on: jest.fn(),
  createQueue: jest.fn(),
  work: jest.fn(),
  getQueues: jest.fn(),
};
jest.mock('pg', () => ({
  ...jest.requireActual<typeof import('pg')>('pg'),
  Pool: jest.fn(() => mockPool),
}));
jest.mock('pg-boss', () => ({ PgBoss: jest.fn(() => mockBoss) }));

describe('Bootstrap — composição da API e encerramento', () => {
  let app: INestApplication | undefined;
  const perfil = { id: '123e4567-e89b-42d3-a456-426614174000', nome: 'Teste' };
  const repo = { listar: jest.fn(), criar: jest.fn(), buscarPorId: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.replaceProperty(process, 'env', {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://teste:teste@127.0.0.1:1/nao_conectar',
      LLM_API_KEY: 'teste',
      IMAGE_API_KEY: 'teste',
      AGENT_KB_ENABLED: 'false',
      FRONTEND_URL: 'http://frontend.teste',
    });
    mockBoss.start.mockResolvedValue(mockBoss);
    mockBoss.stop.mockResolvedValue(undefined);
    mockBoss.createQueue.mockResolvedValue(undefined);
    mockBoss.work.mockResolvedValue('worker-teste');
    mockBoss.getQueues.mockResolvedValue([]);
    repo.listar.mockResolvedValue([perfil]);
    repo.criar.mockResolvedValue(perfil);
    repo.buscarPorId.mockResolvedValue(undefined);
    mockPool.end.mockResolvedValue(undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });
  afterEach(async () => {
    await app?.close();
    app = undefined;
    jest.restoreAllMocks();
  });

  it('propaga a falha de criação da aplicação sem inicializar workers', async () => {
    jest.spyOn(NestFactory, 'create').mockRejectedValueOnce(new Error('Falha de composição'));
    await expect(bootstrap()).rejects.toThrow('Falha de composição');
    expect(mockBoss.start).not.toHaveBeenCalled();
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it('inicializa módulos e workers, aplica CORS/validação/filtro e fecha fila/pool', async () => {
    const { AppModule } = await import('./app.module');
    const modulo = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PerfilRepository)
      .useValue(repo)
      .compile();
    app = modulo.createNestApplication({ logger: false });
    configurarAplicacao(app);
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const resposta = await fetch(url + '/perfis', { headers: { Origin: 'http://frontend.teste' } });
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('access-control-allow-origin')).toBe('http://frontend.teste');
    expect(resposta.headers.get('access-control-allow-credentials')).toBe('true');
    expect(await resposta.json()).toEqual([perfil]);
    const invalida = await fetch(url + '/perfis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Teste', extra: 'indevido' }),
    });
    expect(invalida.status).toBe(400);
    expect(invalida.headers.get('content-type')).toContain('application/problem+json');
    expect(await invalida.json()).toMatchObject({ status: 400, instance: '/perfis' });
    expect(repo.criar).not.toHaveBeenCalled();
    repo.listar.mockRejectedValueOnce(new Error('SEGREDO_INTERNO'));
    const falha = await fetch(url + '/perfis?token=SEGREDO_INTERNO');
    expect(falha.status).toBe(500);
    expect(JSON.stringify(await falha.json())).not.toContain('SEGREDO_INTERNO');
    const ausente = await fetch(url + '/rota-inexistente');
    expect(ausente.status).toBe(404);
    await ausente.arrayBuffer();
    expect(new Set(mockBoss.work.mock.calls.map(([nome]: [string]) => nome))).toEqual(
      new Set([
        'synthesizer.gerar-conteudo',
        'exercicios.gerar',
        'exercicios.corrigir-tentativa',
        'biblioteca-viva.indexar',
        'research.pesquisar',
      ]),
    );
    expect(mockBoss.start).toHaveBeenCalledTimes(1);
    expect(mockPool.query).not.toHaveBeenCalled();
    await app.close();
    app = undefined;
    expect(mockBoss.stop).toHaveBeenCalledTimes(1);
    expect(mockPool.end).toHaveBeenCalledTimes(1);
    expect(mockBoss.stop.mock.invocationCallOrder[0]).toBeLessThan(
      mockPool.end.mock.invocationCallOrder[0],
    );
  });

  it('bootstrap aplica a porta configurada e habilita hooks de encerramento', async () => {
    const aplicacao = {
      get: jest.fn().mockReturnValue(new ConfigService({ PORT: 4321 })),
      enableCors: jest.fn(),
      enableShutdownHooks: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      listen: jest.fn(),
      close: jest.fn(),
    };
    const criar = jest
      .spyOn(NestFactory, 'create')
      .mockResolvedValueOnce(aplicacao as unknown as INestApplication);
    const criada = await bootstrap();
    expect(criada).toBe(aplicacao);
    expect(criar).toHaveBeenCalledWith(expect.any(Function), { abortOnError: false });
    expect(aplicacao.listen).toHaveBeenCalledWith(4321);
    expect(aplicacao.enableShutdownHooks).toHaveBeenCalledTimes(1);
  });

  it('fecha recursos quando abrir a porta falha', async () => {
    const aplicacao = {
      get: jest.fn().mockReturnValue(new ConfigService()),
      enableCors: jest.fn(),
      enableShutdownHooks: jest.fn(),
      useGlobalPipes: jest.fn(),
      useGlobalFilters: jest.fn(),
      listen: jest.fn().mockRejectedValue(new Error('Porta ocupada')),
      close: jest.fn(),
    };
    await expect(bootstrap(async () => aplicacao as unknown as INestApplication)).rejects.toThrow(
      'Porta ocupada',
    );
    expect(aplicacao.close).toHaveBeenCalledTimes(1);
  });
});
