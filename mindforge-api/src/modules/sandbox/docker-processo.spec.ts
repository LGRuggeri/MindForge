import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { DockerProcesso } from './docker-processo';

jest.mock('node:child_process', () => ({ spawn: jest.fn() }));

describe('Processo Docker — saída limitada e encerramento', () => {
  let filho: EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    stdin: PassThrough;
    kill: jest.Mock;
  };
  beforeEach(() => {
    jest.useFakeTimers();
    filho = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      stdin: new PassThrough(),
      kill: jest.fn(() => {
        queueMicrotask(() => filho.emit('close', null));
        return true;
      }),
    });
    jest.mocked(spawn).mockReturnValue(filho as never);
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });
  it('passa argumentos sem shell e coleta stdout/stderr com Unicode', async () => {
    const p = new DockerProcesso().executar(['start', 'nome'], 'dados');
    filho.stdout.write(Buffer.from('Olá\n'));
    filho.stderr.write('aviso');
    filho.emit('close', 0);
    expect(await p).toEqual({ codigo: 0, stdout: 'Olá\n', stderr: 'aviso', limite: null });
    expect(spawn).toHaveBeenCalledWith(
      'docker',
      ['start', 'nome'],
      expect.objectContaining({ shell: false, windowsHide: true }),
    );
    expect(jest.getTimerCount()).toBe(0);
  });
  it('encerra no limite combinado de stdout e stderr sem acumular dados novos', async () => {
    const p = new DockerProcesso().executar([], '', 100, 10);
    filho.stdout.write('123456');
    filho.stderr.write('789012345');
    filho.stdout.write('ignorado');
    await jest.runAllTimersAsync();
    expect(await p).toEqual({ codigo: null, stdout: '123456', stderr: '7890', limite: 'saida' });
    expect(filho.kill).toHaveBeenCalledTimes(1);
  });
  it('encerra processo que não termina no prazo', async () => {
    const p = new DockerProcesso().executar([], '', 100);
    await jest.advanceTimersByTimeAsync(100);
    expect(await p).toMatchObject({ limite: 'tempo' });
    expect(filho.kill).toHaveBeenCalledWith('SIGKILL');
  });
  it('propaga erro ao iniciar e tolera stdin fechado antecipadamente', async () => {
    const p = new DockerProcesso().executar([]);
    const espera = expect(p).rejects.toThrow('ENOENT');
    filho.stdin.emit('error', new Error('EPIPE'));
    filho.emit('error', new Error('ENOENT'));
    await espera;
    expect(jest.getTimerCount()).toBe(0);
  });
});
