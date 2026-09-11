import WebSocket from 'ws';
import { EdgeTtsProvider } from './edge-tts.provider';

jest.mock('ws', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    terminate: jest.fn(),
  })),
}));

describe('EdgeTtsProvider', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it.each([
    [100, 30_000],
    [10_000, 100_000],
  ])('deve encerrar síntese de %i caracteres após %i ms', async (tamanho, limite) => {
    const pendente = new EdgeTtsProvider().sintetizar({ texto: 'a'.repeat(tamanho) });
    const rejeicao = expect(pendente).rejects.toThrow('Timeout ao sintetizar áudio');
    const ws = jest.mocked(WebSocket).mock.results[0].value as { terminate: jest.Mock };

    jest.advanceTimersByTime(limite - 1);
    expect(ws.terminate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(ws.terminate).toHaveBeenCalledTimes(1);
    await rejeicao;
  });
});
