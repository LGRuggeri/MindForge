import { randomUUID } from 'node:crypto';
import { setTimeout as pausa } from 'node:timers/promises';
import { Client } from 'pg';
import { config } from 'dotenv';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JOB_QUEUE } from './job-queue.token';
import { ProblemDetailsFilter } from '../common/filters/problem-details.filter';
import {
  RESEARCH_JOB,
  RESEARCH_SERVICE,
  ResearchJobHandler,
} from '../modules/research/research.job.handler';

const executar = process.env.MINDFORGE_SQL_TESTS === '1' ? describe : describe.skip;
executar('Jobs — pg-boss real em schema descartável', () => {
  const schemaTeste = 'mf_jobs_test_' + randomUUID().replaceAll('-', '');
  const moduloId = randomUUID();
  const fonteId = randomUUID();
  const publico = { moduloId, resultadosWeb: 1, fontes: [{ id: fonteId, origem: 'busca_web' }] };
  const research = { pesquisar: jest.fn() };
  let admin: Client;
  let queue: JobsService;
  let app: INestApplication;
  let url: string;
  let criado = false;

  beforeAll(async () => {
    config({ quiet: true });
    const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (
      !connectionString ||
      !['localhost', '127.0.0.1', '[::1]'].includes(new URL(connectionString).hostname)
    ) {
      throw new Error('Os testes SQL exigem banco local');
    }
    if (!/^mf_jobs_test_[a-f0-9]{32}$/.test(schemaTeste))
      throw new Error('Schema de teste inválido');
    admin = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    await admin.connect();
    await admin.query("SET statement_timeout = '10s'");
    // Nome gerado internamente e CREATE sem IF NOT EXISTS: nunca reutiliza schema existente.
    await admin.query('CREATE SCHEMA "' + schemaTeste + '"');
    criado = true;
    queue = new JobsService(connectionString, { schema: schemaTeste });
    const modulo = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        { provide: JOB_QUEUE, useValue: queue },
        { provide: RESEARCH_SERVICE, useValue: research },
        ResearchJobHandler,
      ],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  }, 30000);
  beforeEach(() => {
    research.pesquisar
      .mockReset()
      .mockResolvedValue({ ...publico, topico: 'SEGREDO', estrategia: 'SEGREDO' });
  });
  afterAll(async () => {
    try {
      if (app) await app.close();
      else if (queue) await queue.onModuleDestroy();
    } finally {
      try {
        if (criado && /^mf_jobs_test_[a-f0-9]{32}$/.test(schemaTeste)) {
          await admin.query('DROP SCHEMA "' + schemaTeste + '" CASCADE');
          const restante = await admin.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [
            schemaTeste,
          ]);
          expect(restante.rowCount).toBe(0);
        }
      } finally {
        await admin?.end();
      }
    }
  }, 30000);
  async function aguardar(id: string, estado: string) {
    const fim = Date.now() + 15000;
    while (Date.now() < fim) {
      const job = await queue.getJobById(RESEARCH_JOB, id);
      if (job?.state === estado) return job;
      await pausa(50);
    }
    throw new Error('Job não atingiu o estado esperado: ' + estado);
  }
  const consultar = (id: string) => fetch(url + '/jobs/' + RESEARCH_JOB + '/' + id);
  it('persiste resultado do worker e entrega somente saída pública por HTTP', async () => {
    const id = await queue.send(RESEARCH_JOB, { moduloId, topico: 'SEGREDO', async: true });
    expect(id).not.toBeNull();
    const job = await aguardar(id!, 'completed');
    expect(job.output).toEqual(publico);
    expect(research.pesquisar).toHaveBeenCalledWith({ moduloId, topico: 'SEGREDO', async: false });
    const response = await consultar(id!);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ encontrado: true, status: 'completed', resultado: publico });
    expect(JSON.stringify(body)).not.toContain('SEGREDO');
    const persistido = await admin.query(
      'SELECT output FROM "' + schemaTeste + '".job WHERE id = $1',
      [id],
    );
    expect(persistido.rows[0].output).toEqual(publico);
  }, 20000);
  it('repete falha transitória e conclui com resultado', async () => {
    research.pesquisar.mockRejectedValueOnce(new Error('Falha transitória'));
    const id = await queue.send(RESEARCH_JOB, { moduloId }, { retryLimit: 1 });
    const job = await aguardar(id!, 'completed');
    expect(job.retryCount).toBe(1);
    expect(research.pesquisar).toHaveBeenCalledTimes(2);
    expect(job.output).toEqual(publico);
  }, 20000);
  it('preserva falha definitiva no banco sem expor detalhes privados', async () => {
    research.pesquisar.mockRejectedValue(new Error('SEGREDO da falha'));
    const id = await queue.send(RESEARCH_JOB, { moduloId }, { retryLimit: 0 });
    await aguardar(id!, 'failed');
    const body = await (await consultar(id!)).json();
    expect(body).toMatchObject({ status: 'failed', resultado: null });
    expect(JSON.stringify(body)).not.toContain('SEGREDO');
    expect(research.pesquisar).toHaveBeenCalledTimes(1);
  }, 20000);
  it('cancela job agendado antes da execução', async () => {
    const id = await queue.send(RESEARCH_JOB, { moduloId }, { startAfter: 60 });
    const response = await fetch(url + '/jobs/' + RESEARCH_JOB + '/' + id, { method: 'DELETE' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ cancelado: true, status: 'cancelled' });
    expect((await queue.getJobById(RESEARCH_JOB, id!))?.state).toBe('cancelled');
    expect(research.pesquisar).not.toHaveBeenCalled();
  }, 20000);
});
