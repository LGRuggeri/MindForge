import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AtividadesConteudoController } from './atividades-conteudo.controller';
import { AtividadesConteudoService } from './atividades-conteudo.service';

describe('HTTP de atividades dentro da aula', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  const perfilId = '223e4567-e89b-12d3-a456-426614174000';
  const responder = jest.fn(async (_id, _chave, dto) => ({ texto: dto.resposta }));
  const listar = jest.fn().mockResolvedValue([]);
  let app: INestApplication;
  let url: string;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AtividadesConteudoController],
      providers: [{ provide: AtividadesConteudoService, useValue: { listar, responder } }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  beforeEach(() => {
    responder.mockClear();
    listar.mockClear();
  });
  afterAll(() => app.close());
  it('consulta com perfil e salva o texto com espaços normalizados', async () => {
    expect(
      (await fetch(`${url}/atividades-conteudo/conteudos/${id}?perfilId=${perfilId}`)).status,
    ).toBe(200);
    const resposta = await fetch(`${url}/atividades-conteudo/conteudos/${id}/chave`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfilId, resposta: '  Meu texto  ' }),
    });
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ texto: 'Meu texto' });
    expect(responder).toHaveBeenCalledWith(id, 'chave', { perfilId, resposta: 'Meu texto' });
  });
  it.each([
    { resposta: '   ', perfilId },
    { resposta: 'a'.repeat(10001), perfilId },
    { resposta: 'Texto', perfilId: 'inválido' },
    { resposta: 'Texto', perfilId, enunciado: 'Inventado' },
  ])('rejeita entrada inválida sem salvar', async (body) => {
    const resposta = await fetch(`${url}/atividades-conteudo/conteudos/${id}/chave`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(resposta.status).toBe(400);
    expect(responder).not.toHaveBeenCalled();
  });
  it('exige perfil na leitura e UUID no conteúdo', async () => {
    expect((await fetch(`${url}/atividades-conteudo/conteudos/${id}`)).status).toBe(400);
    expect(
      (await fetch(`${url}/atividades-conteudo/conteudos/invalido?perfilId=${perfilId}`)).status,
    ).toBe(400);
    expect(listar).not.toHaveBeenCalled();
  });
});
