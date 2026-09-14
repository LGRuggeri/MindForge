import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ExerciciosAvaliacoesController } from './exercicios-avaliacoes.controller';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';
import { AvaliacoesService } from './avaliacoes.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';
import { ProblemDetailsFilter } from '../../common/filters/problem-details.filter';

describe('Resultado de avaliação — consulta HTTP por perfil', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';
  const perfilId = '223e4567-e89b-42d3-a456-426614174000';
  const outroId = '323e4567-e89b-42d3-a456-426614174000';
  const repo = { buscarAvaliacaoPorId: jest.fn(), buscarResultadoPorAvaliacaoEPerfil: jest.fn() };
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [ExerciciosAvaliacoesController],
      providers: [
        { provide: ExerciciosAvaliacoesService, useValue: {} },
        { provide: RevisaoEspacadaService, useValue: {} },
        {
          provide: AvaliacoesService,
          useValue: new AvaliacoesService(repo as never, {} as never, {} as never, {} as never),
        },
      ],
    }).compile();
    app = modulo.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/exercicios-avaliacoes/avaliacoes`;
  });
  beforeEach(() => {
    jest.resetAllMocks();
    repo.buscarAvaliacaoPorId.mockResolvedValue({
      id,
      modulo: { trilha: { objetivo: { perfilId } } },
      exercicios: [],
    });
    repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue(undefined);
  });
  afterAll(async () => {
    await app?.close();
  });

  it('retorna objeto com resultado nulo antes da finalização', async () => {
    const res = await fetch(`${url}/${id}/resultado?perfilId=${perfilId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resultado: null });
    expect(repo.buscarResultadoPorAvaliacaoEPerfil).toHaveBeenCalledWith(id, perfilId);
  });

  it('recupera o resultado salvo e normaliza listas JSON, legadas e nulas', async () => {
    repo.buscarResultadoPorAvaliacaoEPerfil.mockResolvedValue({
      id: outroId,
      avaliacaoId: id,
      perfilId,
      pontuacaoTotal: '7.50',
      pontosFortes: '["**Soma**","Código\\ncom linhas"]',
      pontosFracos: 'Frações\nDivisão',
      recomendacoes: null,
    });
    const res = await fetch(`${url}/${id}/resultado?perfilId=${perfilId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      resultado: {
        id: outroId,
        avaliacaoId: id,
        perfilId,
        pontuacaoTotal: '7.50',
        pontosFortes: ['**Soma**', 'Código\ncom linhas'],
        pontosFracos: ['Frações', 'Divisão'],
        recomendacoes: [],
      },
    });
  });

  it('resolve o proprietário pela trilha em simulados de vários módulos', async () => {
    repo.buscarAvaliacaoPorId.mockResolvedValue({
      id,
      modulo: null,
      trilha: { objetivo: { perfilId } },
    });
    const res = await fetch(`${url}/${id}/resultado?perfilId=${perfilId}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ resultado: null });
  });

  it('recusa outro perfil antes de consultar o resultado', async () => {
    const res = await fetch(`${url}/${id}/resultado?perfilId=${outroId}`);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ status: 403 });
    expect(repo.buscarResultadoPorAvaliacaoEPerfil).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, 404],
    [{ id, modulo: null, trilha: null }, 400],
  ])('recusa avaliação inexistente ou sem proprietário', async (avaliacao, status) => {
    repo.buscarAvaliacaoPorId.mockResolvedValue(avaliacao);
    const res = await fetch(`${url}/${id}/resultado?perfilId=${perfilId}`);
    expect(res.status).toBe(status);
    await res.arrayBuffer();
    expect(repo.buscarResultadoPorAvaliacaoEPerfil).not.toHaveBeenCalled();
  });

  it.each([
    `invalido/resultado?perfilId=${perfilId}`,
    `${id}/resultado?perfilId=invalido`,
    `${id}/resultado`,
  ])('recusa UUID inválido ou perfil ausente: %s', async (caminho) => {
    const res = await fetch(`${url}/${caminho}`);
    expect(res.status).toBe(400);
    await res.arrayBuffer();
    expect(repo.buscarAvaliacaoPorId).not.toHaveBeenCalled();
  });
});
