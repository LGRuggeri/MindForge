import { Logger } from '@nestjs/common';
import { PgBoss } from 'pg-boss';
import { JobsService } from './jobs.service';

jest.mock('pg-boss', () => ({ PgBoss: jest.fn() }));
function pendente<T>() {
  let resolve!: (valor: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
describe('JobsService — ciclo de vida e execução', () => {
  let boss: {
    start: jest.Mock;
    stop: jest.Mock;
    createQueue: jest.Mock;
    send: jest.Mock;
    work: jest.Mock;
    getQueues: jest.Mock;
    getJobById: jest.Mock;
    cancel: jest.Mock;
    on: jest.Mock;
  };
  let service: JobsService;
  beforeEach(() => {
    boss = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      createQueue: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue('job'),
      work: jest.fn().mockResolvedValue('worker'),
      getQueues: jest.fn().mockResolvedValue([]),
      getJobById: jest.fn().mockResolvedValue(null),
      cancel: jest.fn().mockResolvedValue({ affected: 1 }),
      on: jest.fn(),
    };
    (PgBoss as unknown as jest.Mock).mockImplementation(() => boss);
    service = new JobsService('postgres://localhost/banco-teste');
  });
  afterEach(() => jest.restoreAllMocks());
  it('deduplica inicialização e criação concorrente da mesma fila', async () => {
    const inicio = pendente<void>();
    const criacao = pendente<void>();
    boss.start.mockReturnValue(inicio.promise);
    boss.createQueue.mockReturnValue(criacao.promise);
    const operacoes = [
      service.onModuleInit(),
      service.send('pesquisa', {}),
      service.work('pesquisa', async () => undefined),
    ];
    expect(boss.start).toHaveBeenCalledTimes(1);
    expect(boss.createQueue).not.toHaveBeenCalled();
    inicio.resolve();
    await new Promise(setImmediate);
    expect(boss.createQueue).toHaveBeenCalledTimes(1);
    expect(boss.send).not.toHaveBeenCalled();
    criacao.resolve();
    await Promise.all(operacoes);
    await service.send('pesquisa', {}, { retryLimit: 2, startAfter: 10 });
    expect(boss.createQueue).toHaveBeenCalledTimes(1);
    expect(boss.send).toHaveBeenLastCalledWith('pesquisa', {}, { retryLimit: 2, startAfter: 10 });
  });
  it('permite nova tentativa após falha de inicialização', async () => {
    boss.start.mockRejectedValueOnce(new Error('indisponível'));
    await expect(service.send('a', {})).rejects.toThrow('indisponível');
    expect(boss.send).not.toHaveBeenCalled();
    await expect(service.send('a', {})).resolves.toBe('job');
    expect(boss.start).toHaveBeenCalledTimes(2);
  });
  it('repete criação que falhou e permite outras filas', async () => {
    boss.createQueue.mockRejectedValueOnce(new Error('falha'));
    await expect(service.send('a', {})).rejects.toThrow('falha');
    await service.send('a', {});
    await service.send('b', {});
    expect(boss.createQueue).toHaveBeenCalledTimes(3);
  });
  it('propaga resultado do handler para conclusão de um job', async () => {
    const resultado = { moduloId: 'm', fontes: [] };
    const handler = jest.fn().mockResolvedValue(resultado);
    await service.work('pesquisa', handler);
    const argumentos = boss.work.mock.calls[0];
    const executar = argumentos.at(-1);
    expect(await executar([{ id: 'job', data: {} }])).toEqual(resultado);
    expect(argumentos[1]).toEqual(expect.objectContaining({ batchSize: 1 }));
  });
  it('propaga erro do handler para o retry do pg-boss', async () => {
    await service.work('a', async () => {
      throw new Error('falha');
    });
    await expect(boss.work.mock.calls[0].at(-1)([{ id: 'job', data: {} }])).rejects.toThrow(
      'falha',
    );
  });
  it.each(['filas', 'job', 'cancelar'])('aguarda inicialização antes de %s', async (operacao) => {
    const inicio = pendente<void>();
    boss.start.mockReturnValue(inicio.promise);
    const resultado =
      operacao === 'filas'
        ? service.getQueues(['a'])
        : operacao === 'job'
          ? service.getJobById('a', 'id')
          : service.cancelJob('a', 'id');
    expect(boss.getQueues).not.toHaveBeenCalled();
    expect(boss.getJobById).not.toHaveBeenCalled();
    expect(boss.cancel).not.toHaveBeenCalled();
    inicio.resolve();
    await resultado;
    if (operacao === 'filas') expect(boss.getQueues).toHaveBeenCalledWith(['a']);
    if (operacao === 'job') expect(boss.getJobById).toHaveBeenCalledWith('a', 'id');
    if (operacao === 'cancelar') expect(boss.cancel).toHaveBeenCalledWith('a', 'id');
  });
  it('encerra mesmo após início que falhou', async () => {
    boss.start.mockRejectedValueOnce(new Error('falha'));
    await expect(service.onModuleInit()).rejects.toThrow('falha');
    await service.onModuleDestroy();
    expect(boss.stop).toHaveBeenCalledTimes(1);
  });
  it('aguarda inicialização pendente antes de encerrar', async () => {
    const inicio = pendente<void>();
    boss.start.mockReturnValue(inicio.promise);
    const iniciar = service.onModuleInit();
    const parar = service.onModuleDestroy();
    expect(boss.stop).not.toHaveBeenCalled();
    inicio.resolve();
    await Promise.all([iniciar, parar]);
    expect(boss.stop).toHaveBeenCalledTimes(1);
  });
  it('recebe eventos de erro sem expor credenciais nos logs', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    expect(boss.on).toHaveBeenCalledWith('error', expect.any(Function));
    boss.on.mock.calls[0][1](new Error('SEGREDO'));
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('SEGREDO');
  });
});
