import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BibliotecaVivaModule } from './biblioteca-viva.module';
import { BibliotecaVivaRepository } from './biblioteca-viva.repository';
import { EmbeddingService } from './embedding.service';
import { JOB_QUEUE } from '../../jobs/job-queue.token';

const queue = { send: jest.fn().mockResolvedValue('job') };
@Global()
@Module({ providers: [{ provide: JOB_QUEUE, useValue: queue }], exports: [JOB_QUEUE] })
class FilaTesteModule {}

describe('Biblioteca Viva — contrato HTTP e composição do módulo', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';
  const repo = { indexarChunks: jest.fn(), buscarSimilares: jest.fn() };
  const embeddings = { gerar: jest.fn() };
  let app: INestApplication;
  let url: string;
  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [FilaTesteModule, BibliotecaVivaModule],
    })
      .overrideProvider(BibliotecaVivaRepository)
      .useValue(repo)
      .overrideProvider(EmbeddingService)
      .useValue(embeddings)
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
    embeddings.gerar.mockResolvedValue([1, 0]);
    repo.buscarSimilares.mockResolvedValue([{ id: 'chunk', texto: 'Conteúdo', similaridade: 1 }]);
    repo.indexarChunks.mockImplementation(async (dados) =>
      dados.map((d: object) => ({ id: 'chunk', ...d })),
    );
  });
  afterAll(async () => {
    await app?.close();
  });
  const postar = (rota: string, body: object) =>
    fetch(`${url}/biblioteca-viva/${rota}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  it('valida consulta e retorna resultados do serviço com limite padrão', async () => {
    const resposta = await postar('buscar', { consulta: 'Conceito', moduloId: id });
    expect(resposta.status).toBe(201);
    expect(await resposta.json()).toEqual([{ id: 'chunk', texto: 'Conteúdo', similaridade: 1 }]);
    expect(repo.buscarSimilares).toHaveBeenCalledWith([1, 0], 5, id);
  });
  it('indexa fonte e preserva a origem no registro', async () => {
    const resposta = await postar('indexar', { texto: 'Fonte para estudo', fonteId: id });
    expect(resposta.status).toBe(201);
    expect(await resposta.json()).toEqual([
      expect.objectContaining({ fonteId: id, conteudoId: null, ordem: 0 }),
    ]);
  });
  it('enfileira origem válida sem chamar embeddings', async () => {
    const resposta = await postar('indexar', { texto: 'Texto', conteudoId: id, async: true });
    expect(resposta.status).toBe(201);
    expect(await resposta.json()).toEqual({ jobId: 'job', status: 'enfileirado' });
    expect(embeddings.gerar).not.toHaveBeenCalled();
  });
  it.each([
    { rota: 'buscar', body: { consulta: 'ab' } },
    { rota: 'buscar', body: { consulta: 'Texto', limite: 21 } },
    { rota: 'buscar', body: { consulta: 'Texto', limite: 0 } },
    { rota: 'buscar', body: { consulta: 'Texto', moduloId: 'errado' } },
    { rota: 'indexar', body: { texto: '', conteudoId: id } },
    { rota: 'indexar', body: { texto: 'Texto', fonteId: 'errado' } },
    { rota: 'indexar', body: { texto: 'Texto', async: true } },
    { rota: 'indexar', body: { texto: 'Texto', fonteId: id, conteudoId: id, async: true } },
    { rota: 'indexar', body: { texto: 'Texto', conteudoId: id, extra: true } },
  ])('rejeita entrada inválida antes de efeitos: %j', async ({ rota, body }) => {
    expect((await postar(rota, body)).status).toBe(400);
    expect(embeddings.gerar).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
    expect(repo.indexarChunks).not.toHaveBeenCalled();
    expect(repo.buscarSimilares).not.toHaveBeenCalled();
  });
});
