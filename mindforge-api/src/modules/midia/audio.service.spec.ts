import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { AUDIO_PROVIDER, AudioService, type AudioProvider } from './audio.service';
import { MidiaStorageService } from './midia-storage.service';

describe('AudioService', () => {
  let storage: jest.Mocked<MidiaStorageService>;
  let provider: jest.Mocked<AudioProvider>;
  let service: AudioService;

  beforeEach(() => {
    storage = {
      buscar: jest.fn(),
      salvar: jest.fn(),
    } as unknown as jest.Mocked<MidiaStorageService>;

    provider = {
      nome: 'edge-tts',
      sintetizar: jest.fn(),
    };

    const config = { get: jest.fn(() => undefined) } as unknown as ConfigService;
    service = new AudioService(config, storage, provider);
  });

  it('deve sintetizar e cachear quando não há cache', async () => {
    storage.buscar.mockResolvedValue(null);
    provider.sintetizar.mockResolvedValue({ buffer: Buffer.from('audio'), mime: 'audio/mpeg' });
    storage.salvar.mockResolvedValue('audio-abc.mp3');

    const resultado = await service.gerarAudio({ texto: 'Hello', idioma: 'en' });

    expect(provider.sintetizar).toHaveBeenCalledWith({ texto: 'Hello', idioma: 'en', voz: undefined });
    expect(storage.salvar).toHaveBeenCalled();
    expect(resultado.mime).toBe('audio/mpeg');
  });

  it('deve servir do cache sem chamar o provedor', async () => {
    storage.buscar.mockResolvedValue({ arquivo: 'audio-abc.mp3', mime: 'audio/mpeg', buffer: Buffer.from('cache') });

    const resultado = await service.gerarAudio({ texto: 'Hello', idioma: 'en' });

    expect(provider.sintetizar).not.toHaveBeenCalled();
    expect(storage.salvar).not.toHaveBeenCalled();
    expect(resultado.buffer.toString()).toBe('cache');
  });

  it('deve lançar ServiceUnavailableException quando o provedor falha', async () => {
    storage.buscar.mockResolvedValue(null);
    provider.sintetizar.mockRejectedValue(new Error('websocket falhou'));

    await expect(service.gerarAudio({ texto: 'Hello' })).rejects.toThrow(ServiceUnavailableException);
    expect(storage.salvar).not.toHaveBeenCalled();
  });

  it('deve gerar chaves distintas para textos diferentes', async () => {
    storage.buscar.mockResolvedValue(null);
    provider.sintetizar.mockResolvedValue({ buffer: Buffer.from('a'), mime: 'audio/mpeg' });
    storage.salvar.mockResolvedValue('audio-x.mp3');

    await service.gerarAudio({ texto: 'Hello' });
    await service.gerarAudio({ texto: 'World' });

    const chaves = storage.salvar.mock.calls.map((c) => c[1]);
    expect(chaves[0]).not.toBe(chaves[1]);
    expect(chaves[0]).toContain('edge-tts');
  });
});
