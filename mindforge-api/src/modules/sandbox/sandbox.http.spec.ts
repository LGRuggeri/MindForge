import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ProblemDetailsFilter } from '../../common/filters/problem-details.filter';
import { SandboxController } from './sandbox.controller';
import { SandboxService } from './sandbox.service';
import { SandboxRepository } from './sandbox.repository';
import { DockerExecutor } from './docker-executor';

describe('Sandbox — contrato HTTP e isolamento de perfil', () => {
  const id = '123e4567-e89b-42d3-a456-426614174000';
  const perfilId = '223e4567-e89b-42d3-a456-426614174000';
  const repo = { buscarExercicio: jest.fn() };
  const executor = { executar: jest.fn() };
  const config = new ConfigService({ SANDBOX_ENABLED: 'true' });
  const corpo = { perfilId, linguagem: 'python', codigo: 'print(input())', entrada: 'Olá' };
  const resultado = {
    status: 'concluido',
    stdout: 'Olá\n',
    stderr: '',
    codigoSaida: 0,
    duracaoMs: 20,
  };
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [SandboxController],
      providers: [
        SandboxService,
        { provide: ConfigService, useValue: config },
        { provide: SandboxRepository, useValue: repo },
        { provide: DockerExecutor, useValue: executor },
      ],
    }).compile();
    app = modulo.createNestApplication({ logger: false });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new ProblemDetailsFilter());
    await app.listen(0, '127.0.0.1');
    url = `${await app.getUrl()}/sandbox/exercicios/${id}/executar`;
  });
  beforeEach(() => {
    jest.resetAllMocks();
    config.set('SANDBOX_ENABLED', 'true');
    repo.buscarExercicio.mockResolvedValue({ tipo: 'codigo', perfilId });
    executor.executar.mockResolvedValue(resultado);
  });
  afterAll(async () => {
    await app.close();
  });
  async function enviar(body: unknown = corpo, headers: Record<string, string> = {}) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  }
  it('executa com stdin sem criar uma tentativa ou retornar gabarito', async () => {
    const res = await enviar(corpo, { Origin: 'http://localhost:3001' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(resultado);
    expect(executor.executar).toHaveBeenCalledWith(corpo);
  });
  it.each([
    { ...corpo, linguagem: 'bash' },
    { ...corpo, codigo: '   ' },
    { ...corpo, codigo: 'x'.repeat(16001) },
    { ...corpo, entrada: 'x'.repeat(4001) },
    { ...corpo, perfilId: 'invalido' },
    { ...corpo, imagem: 'alpine' },
    { ...corpo, codigo: 1 },
  ])('recusa dados inválidos antes de executar', async (body) => {
    const res = await enviar(body);
    expect(res.status).toBe(400);
    await res.arrayBuffer();
    expect(executor.executar).not.toHaveBeenCalled();
  });
  it.each([
    [undefined, 404],
    [{ tipo: 'codigo', perfilId: 'outro' }, 403],
    [{ tipo: 'codigo', perfilId: null }, 403],
    [{ tipo: 'dissertativa', perfilId }, 400],
  ])('recusa exercício inexistente, de outro perfil ou outro tipo', async (registro, status) => {
    repo.buscarExercicio.mockResolvedValue(registro);
    const res = await enviar();
    expect(res.status).toBe(status);
    await res.arrayBuffer();
    expect(executor.executar).not.toHaveBeenCalled();
  });
  it('recusa Origin externo mesmo com corpo válido', async () => {
    const res = await enviar(corpo, { Origin: 'https://site-externo.example' });
    expect(res.status).toBe(403);
    await res.arrayBuffer();
    expect(repo.buscarExercicio).not.toHaveBeenCalled();
  });
  it('fica desativado sem configuração explícita', async () => {
    config.set('SANDBOX_ENABLED', 'false');
    const res = await enviar();
    expect(res.status).toBe(503);
    await res.arrayBuffer();
    expect(executor.executar).not.toHaveBeenCalled();
  });
  it('limita concorrência e libera vagas após concluir e falhar', async () => {
    let liberar!: (value: typeof resultado) => void;
    executor.executar.mockReturnValue(
      new Promise((resolve) => {
        liberar = resolve;
      }),
    );
    const service = app.get(SandboxService);
    const a = service.executar(id, corpo as never);
    const b = service.executar(id, corpo as never);
    await Promise.resolve();
    await expect(service.executar(id, corpo as never)).rejects.toMatchObject({ status: 429 });
    liberar(resultado);
    await Promise.all([a, b]);
    executor.executar.mockRejectedValueOnce(new Error('falha simulada'));
    await expect(service.executar(id, corpo as never)).rejects.toThrow();
    executor.executar.mockResolvedValue(resultado);
    await expect(service.executar(id, corpo as never)).resolves.toEqual(resultado);
  });
});
