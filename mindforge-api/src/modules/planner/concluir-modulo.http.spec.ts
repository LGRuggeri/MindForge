import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PlannerController } from './planner.controller';
import { PlannerService } from './planner.service';

describe('HTTP de conclusão de módulo', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  const perfilId = '223e4567-e89b-12d3-a456-426614174000';
  const concluirModulo = jest.fn().mockResolvedValue({ id, status: 'concluido' });
  let app: INestApplication;
  let url: string;
  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [PlannerController],
      providers: [{ provide: PlannerService, useValue: { concluirModulo } }],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  beforeEach(() => concluirModulo.mockClear());
  afterAll(async () => {
    await app?.close();
  });

  it('expõe a rota de conclusão com o perfil e responde 200', async () => {
    const resposta = await fetch(`${url}/planner/modulos/${id}/concluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ perfilId }),
    });
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ id, status: 'concluido' });
    expect(concluirModulo).toHaveBeenCalledWith(id, perfilId);
  });
  it.each([
    { moduloId: 'invalido', body: { perfilId } },
    { moduloId: id, body: {} },
  ])('rejeita entrada inválida sem concluir: %j', async ({ moduloId, body }) => {
    const resposta = await fetch(`${url}/planner/modulos/${moduloId}/concluir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(resposta.status).toBe(400);
    expect(concluirModulo).not.toHaveBeenCalled();
  });
});
