import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { AgentesModule } from '../agentes/agentes.module';
import { AgentesService } from '../agentes/agentes.service';
import { ResearchModule } from './research.module';
import { ResearchRepository } from './research.repository';
import { RESEARCH_JOB, ResearchJobHandler } from './research.job.handler';

const queue = { send: jest.fn(), work: jest.fn() };
const agentes = { executar: jest.fn() };
@Global()
@Module({
  providers: [
    { provide: JOB_QUEUE, useValue: queue },
    { provide: AgentesService, useValue: agentes },
    { provide: ConfigService, useValue: new ConfigService() },
  ],
  exports: [JOB_QUEUE, AgentesService, ConfigService],
})
class DependenciasTesteModule {}

describe('Research — HTTP e composição com handler real', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';
  const repo = { buscarModuloPorId: jest.fn(), criarFontes: jest.fn(), listarPorModulo: jest.fn() };
  let app: INestApplication;
  let url: string;
  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [ResearchModule] })
      .overrideModule(AgentesModule)
      .useModule(DependenciasTesteModule)
      .overrideProvider(ResearchRepository)
      .useValue(repo)
      .compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    queue.send.mockResolvedValue('job-teste');
    repo.buscarModuloPorId.mockResolvedValue({
      titulo: 'Módulo',
      objetivoAprendizagem: null,
      trilha: {
        objetivo: { titulo: 'Objetivo', descricao: 'Contexto', nivelDesejado: 'avancado' },
      },
    });
    repo.criarFontes.mockImplementation(async (dados) =>
      dados.map((d: object) => ({ id: 'fonte', ...d })),
    );
    repo.listarPorModulo.mockResolvedValue([
      { id: 'fonte', moduloId: id, origem: 'sugestao_ia', url: null },
    ]);
    agentes.executar.mockImplementation(async (opcoes) =>
      opcoes.parser(
        JSON.stringify({
          fontes: [
            { titulo: 'Livro', resumo: 'Referência', tipo: 'tipo inesperado', autor: 'Autora' },
          ],
        }),
      ),
    );
  });
  afterAll(async () => {
    await app?.close();
  });
  const postar = (body: object) =>
    fetch(url + '/research/fontes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  it('retorna curadoria sem URLs inventadas e com defaults de campos opcionais', async () => {
    const response = await postar({ moduloId: id, topico: 'Tema específico' });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      topico: 'Tema específico',
      resultadosWeb: 0,
      fontes: [
        {
          origem: 'sugestao_ia',
          url: null,
          tipo: 'outro',
          autor: 'Autora',
          confiabilidadeScore: null,
        },
      ],
    });
    expect(agentes.executar.mock.calls[0][0].user).toContain(
      'Objetivo de aprendizagem: Não informado',
    );
    expect(agentes.executar.mock.calls[0][0].user).toContain('Nível do aluno: avancado');
  });
  it('lista fontes do módulo informado', async () => {
    const response = await fetch(url + '/research/modulos/' + id + '/fontes');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: 'fonte', moduloId: id, origem: 'sugestao_ia', url: null },
    ]);
    expect(repo.listarPorModulo).toHaveBeenCalledWith(id);
  });
  it('rejeita identificador de módulo inválido na listagem', async () => {
    expect((await fetch(url + '/research/modulos/invalido/fontes')).status).toBe(400);
    expect(repo.listarPorModulo).not.toHaveBeenCalled();
  });
  it('enfileira e executa pela factory do módulo sem novo enqueue', async () => {
    const response = await postar({ moduloId: id, topico: 'Tema', async: true });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      jobId: 'job-teste',
      status: 'enfileirado',
      topico: 'Tema',
    });
    expect(agentes.executar).not.toHaveBeenCalled();
    await app.get(ResearchJobHandler).onModuleInit();
    expect(queue.work).toHaveBeenCalledWith(RESEARCH_JOB, expect.any(Function));
    const handler = queue.work.mock.calls[0][1];
    await handler([{ id: 'job-teste', data: queue.send.mock.calls[0][1] }]);
    expect(queue.send).toHaveBeenCalledTimes(1);
    expect(repo.criarFontes).toHaveBeenCalledWith([
      expect.objectContaining({ moduloId: id, origem: 'sugestao_ia', url: null }),
    ]);
  });
  it.each([
    {},
    { moduloId: 'errado' },
    { moduloId: id, limite: 0 },
    { moduloId: id, limite: 13 },
    { moduloId: id, limite: 1.5 },
    { moduloId: id, topico: {} },
    { moduloId: id, webSearch: 'true' },
    { moduloId: id, async: 'true' },
    { moduloId: id, extra: true },
  ])('recusa entrada inválida sem efeitos %j', async (body) => {
    expect((await postar(body)).status).toBe(400);
    expect(repo.buscarModuloPorId).not.toHaveBeenCalled();
    expect(repo.criarFontes).not.toHaveBeenCalled();
    expect(agentes.executar).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });
});
