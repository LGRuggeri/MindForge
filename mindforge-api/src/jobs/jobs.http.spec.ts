import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  HttpException,
  INestApplication,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ProblemDetailsFilter } from '../common/filters/problem-details.filter';
import { JobsController } from './jobs.controller';
import { JOB_QUEUE } from './job-queue.token';

@Controller('erros-teste')
class ErrosTesteController {
  @Get(':tipo')
  falhar(@Param('tipo') tipo: string) {
    if (tipo === 'validacao')
      throw new BadRequestException(['Campo obrigatório', 'Limite inválido']);
    if (tipo === '404') throw new NotFoundException('Registro não encontrado');
    if (tipo === '409') throw new ConflictException('Registro já existe');
    if (tipo === 'string') throw new HttpException('Entrada inválida', 400);
    if (tipo === 'objeto') throw new HttpException({ message: { senha: 'SEGREDO' } }, 400);
    if (tipo === '500') throw new InternalServerErrorException('SEGREDO do banco');
    if (tipo === '503') throw new ServiceUnavailableException('SEGREDO de conexão');
    if (tipo === 'nao-error') throw { senha: 'SEGREDO' };
    throw new Error('SEGREDO inesperado');
  }
}

describe('Jobs e ProblemDetails — contratos HTTP reais', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';
  const fila = 'research.pesquisar';
  const resultado = { moduloId: id, resultadosWeb: 1, fontes: [{ id, origem: 'busca_web' }] };
  const jobs = { getQueues: jest.fn(), getJobById: jest.fn(), cancelJob: jest.fn() };
  let app: INestApplication;
  let url: string;
  let log: jest.SpyInstance;
  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [JobsController, ErrosTesteController],
      providers: [{ provide: JOB_QUEUE, useValue: jobs }],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jobs.getJobById.mockResolvedValue({
      id,
      name: fila,
      state: 'completed',
      retryCount: 1,
      data: { pergunta: 'SEGREDO' },
      output: {
        ...resultado,
        prompt: 'SEGREDO',
        fontes: [{ ...resultado.fontes[0], segredo: 'SEGREDO' }],
      },
      createdOn: '2026-09-14T00:00:00.000Z',
      startedOn: null,
      completedOn: null,
    });
    jobs.getQueues.mockResolvedValue([
      {
        name: fila,
        queuedCount: 2,
        readyCount: 1,
        activeCount: 1,
        failedCount: 0,
        totalCount: 3,
        updatedOn: null,
        segredo: 'SEGREDO',
      },
    ]);
    jobs.cancelJob.mockResolvedValue({ affected: 1 });
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
  });
  const buscar = (rota: string) => fetch(url + rota);
  it('expõe apenas metadados e saída pública do Research concluído', async () => {
    const response = await buscar('/jobs/' + fila + '/' + id);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      encontrado: true,
      id,
      nome: fila,
      status: 'completed',
      tentativas: 1,
      criadoEm: '2026-09-14T00:00:00.000Z',
      iniciadoEm: null,
      finalizadoEm: null,
      resultado,
    });
    expect(JSON.stringify(body)).not.toContain('SEGREDO');
  });
  it.each(['failed', 'retry', 'active', 'cancelled', 'created'])(
    'oculta saída privada em estado %s',
    async (state) => {
      jobs.getJobById.mockResolvedValue({
        id,
        name: fila,
        state,
        data: { segredo: 'SEGREDO' },
        output: { message: 'SEGREDO', stack: 'SEGREDO' },
      });
      const body = await (await buscar('/jobs/' + fila + '/' + id)).json();
      expect(body.resultado).toBeNull();
      expect(JSON.stringify(body)).not.toContain('SEGREDO');
    },
  );
  it.each([
    null,
    {},
    { moduloId: 'invalido', resultadosWeb: 0, fontes: [] },
    { ...resultado, fontes: [{ id, origem: 'inventada' }] },
  ])('oculta saída incompleta ou inválida %j', async (output) => {
    jobs.getJobById.mockResolvedValue({ id, name: fila, state: 'completed', output });
    expect((await (await buscar('/jobs/' + fila + '/' + id)).json()).resultado).toBeNull();
  });
  it('não expõe retorno arbitrário das outras filas', async () => {
    jobs.getJobById.mockResolvedValue({
      id,
      name: 'exercicios.gerar',
      state: 'completed',
      output: { ...resultado, segredo: 'SEGREDO' },
    });
    expect((await (await buscar('/jobs/exercicios.gerar/' + id)).json()).resultado).toBeNull();
  });
  it('preserva contrato de job inexistente', async () => {
    jobs.getJobById.mockResolvedValue(null);
    expect(await (await buscar('/jobs/' + fila + '/' + id)).json()).toEqual({ encontrado: false });
    expect(await (await buscar('/jobs/' + fila + '/' + id + '/estado')).json()).toEqual({
      encontrado: false,
      id,
      nome: fila,
      status: null,
      retryCount: null,
    });
  });
  it('retorna estado compacto sem entrada ou saída', async () => {
    expect(await (await buscar('/jobs/' + fila + '/' + id + '/estado')).json()).toEqual({
      encontrado: true,
      id,
      nome: fila,
      status: 'completed',
      retryCount: 1,
    });
  });
  it('lista contadores públicos das filas suportadas', async () => {
    expect(await (await buscar('/jobs/filas')).json()).toEqual([
      {
        nome: fila,
        enfileirados: 2,
        prontos: 1,
        ativos: 1,
        falhos: 0,
        total: 3,
        atualizadoEm: null,
      },
    ]);
    expect(jobs.getQueues.mock.calls[0][0]).toHaveLength(5);
  });
  it.each(['cancelled', 'completed', null])(
    'informa resultado do cancelamento %s',
    async (state) => {
      jobs.getJobById.mockResolvedValue(state ? { state } : null);
      const response = await fetch(url + '/jobs/' + fila + '/' + id, { method: 'DELETE' });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        cancelado: state === 'cancelled',
        id,
        nome: fila,
        status: state,
      });
      expect(jobs.cancelJob).toHaveBeenCalledWith(fila, id);
    },
  );
  it.each([
    ['GET', '/jobs/privada/' + id],
    ['GET', '/jobs/privada/' + id + '/estado'],
    ['DELETE', '/jobs/privada/' + id],
    ['GET', '/jobs/' + fila + '/invalido'],
    ['DELETE', '/jobs/' + fila + '/invalido'],
  ])('rejeita fila ou UUID inválidos: %s %s', async (method, path) => {
    const response = await fetch(url + path, { method });
    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(jobs.getJobById).not.toHaveBeenCalled();
    expect(jobs.cancelJob).not.toHaveBeenCalled();
  });
  it.each([
    ['validacao', 400, 'Campo obrigatório; Limite inválido'],
    ['404', 404, 'Registro não encontrado'],
    ['409', 409, 'Registro já existe'],
  ])('normaliza erro %s', async (tipo, status, detail) => {
    const response = await buscar('/erros-teste/' + tipo);
    expect(response.status).toBe(status);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    expect(await response.json()).toMatchObject({
      status,
      detail,
      instance: '/erros-teste/' + tipo,
      type: 'https://mindforge.local/erros/' + status,
    });
  });
  it('preserva mensagem de exceção HTTP textual', async () => {
    const body = await (await buscar('/erros-teste/string')).json();
    expect(body.title).toBe('Entrada inválida');
    expect(body.status).toBe(400);
  });
  it.each(['objeto', '500', '503', 'nao-error', 'inesperado'])(
    'não expõe dados internos na resposta/log em %s',
    async (tipo) => {
      const response = await buscar('/erros-teste/' + tipo + '?token=SEGREDO');
      const body = await response.json();
      expect(body.status).toBe(tipo === 'objeto' ? 400 : tipo === '503' ? 503 : 500);
      expect(JSON.stringify(body)).not.toContain('SEGREDO');
      expect(JSON.stringify(log.mock.calls)).not.toContain('SEGREDO');
      expect(body.instance).toBe('/erros-teste/' + tipo);
    },
  );
});
