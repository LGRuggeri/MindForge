import { ConfigService } from '@nestjs/config';
import { SandboxController } from './sandbox.controller';

describe('Sandbox — restrição à conexão local', () => {
  const service = { executar: jest.fn() };
  beforeEach(() => jest.clearAllMocks());
  function requisicao(remoteAddress: string, host: string, origin?: string) {
    return { socket: { remoteAddress }, headers: { host, origin, 'x-forwarded-for': '127.0.0.1' } };
  }
  it.each([
    ['192.168.1.20', 'localhost:3000', undefined],
    ['127.0.0.1', 'localhost.externo.example', undefined],
    ['127.0.0.1', '127.0.0.1:3000', 'null'],
    ['127.0.0.1', '', undefined],
  ])('recusa conexão %s Host %s Origin %s', (ip, host, origin) => {
    const controller = new SandboxController(service as never, new ConfigService());
    expect(() =>
      controller.executar('id', {} as never, requisicao(ip, host, origin) as never),
    ).toThrow('apenas no ambiente local');
    expect(service.executar).not.toHaveBeenCalled();
  });
  it.each([
    ['::1', '[::1]:3000'],
    ['::ffff:127.0.0.1', 'localhost:3000'],
  ])('aceita loopback %s', (ip, host) => {
    const controller = new SandboxController(service as never, new ConfigService());
    controller.executar('id', {} as never, requisicao(ip, host, 'http://localhost:3001') as never);
    expect(service.executar).toHaveBeenCalledTimes(1);
  });
});
