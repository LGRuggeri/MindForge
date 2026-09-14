import { ConfigService } from '@nestjs/config';
import { DockerExecutor } from './docker-executor';
import { DockerProcesso } from './docker-processo';

describe('Executor Docker — limites e limpeza', () => {
  const processo = { executar: jest.fn() };
  const config = new ConfigService({ SANDBOX_TEMPO_MS: 5000 });
  const entrada = { linguagem: 'python', codigo: 'print("Olá")', entrada: '' } as const;
  let executor: DockerExecutor;
  beforeEach(() => {
    processo.executar.mockReset();
    executor = new DockerExecutor(config, processo as unknown as DockerProcesso);
    processo.executar.mockImplementation(async (args: string[]) => ({
      codigo: 0,
      stdout:
        args[0] === 'inspect'
          ? '{"ExitCode":0,"OOMKilled":false}'
          : args[0] === 'start'
            ? 'Olá\n'
            : 'id',
      stderr: '',
      limite: null,
    }));
  });
  it('isola rede, arquivos, privilégios e recursos e envia o código apenas por stdin', async () => {
    expect(await executor.executar(entrada)).toMatchObject({
      status: 'concluido',
      stdout: 'Olá\n',
    });
    const args: string[] = processo.executar.mock.calls[0][0];
    for (const flag of [
      '--network=none',
      '--read-only',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges',
      '--user=0:0',
      '--cap-add=SETUID',
      '--cap-add=SETGID',
      '--cap-add=KILL',
      '--memory=128m',
      '--memory-swap=128m',
      '--cpus=0.5',
      '--pids-limit=32',
      '--pull=never',
      '--log-driver=none',
    ])
      expect(args).toContain(flag);
    expect(args).not.toContain(entrada.codigo);
    expect(args.some((arg) => arg.startsWith('--volume') || arg.startsWith('--mount'))).toBe(false);
    expect(processo.executar.mock.calls[1][1]).toBe(JSON.stringify(entrada));
    expect(processo.executar.mock.calls.at(-1)[0].slice(0, 2)).toEqual(['rm', '--force']);
  });
  it.each([
    [1, false, 'erro'],
    [124, false, 'limite_tempo'],
    [137, false, 'limite_tempo'],
    [137, true, 'limite_memoria'],
    [200, false, 'limite_memoria'],
  ])('classifica saída %s e OOM %s', async (codigo, oom, status) => {
    processo.executar.mockImplementation(async (args: string[]) => ({
      codigo: args[0] === 'start' ? codigo : 0,
      stdout: args[0] === 'inspect' ? JSON.stringify({ ExitCode: codigo, OOMKilled: oom }) : '',
      stderr: '',
      limite: null,
    }));
    expect(await executor.executar(entrada)).toMatchObject({ status, codigoSaida: codigo });
  });
  it.each(['saida', 'tempo'])('interrompe e limpa ao atingir limite de %s', async (limite) => {
    processo.executar.mockImplementation(async (args: string[]) => ({
      codigo: 0,
      stdout: 'parcial',
      stderr: '',
      limite: args[0] === 'start' ? limite : null,
    }));
    expect(await executor.executar(entrada)).toMatchObject({
      status: `limite_${limite}`,
      stdout: 'parcial',
    });
    expect(processo.executar.mock.calls.at(-1)[0][0]).toBe('rm');
  });
  it.each(['create', 'start', 'inspect'])(
    'oculta falhas de infraestrutura em %s e sempre limpa',
    async (etapa) => {
      processo.executar.mockImplementation(async (args: string[]) => {
        if (args[0] === etapa) throw new Error('host secreto');
        return { codigo: 0, stdout: '', stderr: '', limite: null };
      });
      await expect(executor.executar(entrada)).rejects.toMatchObject({ status: 503 });
      expect(processo.executar.mock.calls.at(-1)[0][0]).toBe('rm');
    },
  );
  it('recusa novas execuções se não puder confirmar a limpeza', async () => {
    processo.executar.mockImplementation(async () => ({
      codigo: 1,
      stdout: '',
      stderr: 'falha',
      limite: null,
    }));
    await expect(executor.executar(entrada)).rejects.toMatchObject({ status: 503 });
    const chamadas = processo.executar.mock.calls.length;
    await expect(executor.executar(entrada)).rejects.toMatchObject({ status: 503 });
    expect(processo.executar).toHaveBeenCalledTimes(chamadas);
  });
});
