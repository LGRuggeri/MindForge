import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AudioService } from './audio.service';
import { ImageService } from './image.service';
import { MidiaStorageService } from './midia-storage.service';

describe('Mídia — falhas dos provedores', () => {
  const storage = { buscar: jest.fn(), salvar: jest.fn() };
  const config = new ConfigService({
    IMAGE_BASE_URL: 'https://imagem.invalid',
    IMAGE_MODEL: 'modelo-teste',
    IMAGE_API_KEY: 'CHAVE_PRIVADA',
  });
  let imagem: ImageService;
  const resposta = (inlineData: unknown) => ({
    candidates: [{ content: { parts: [{ inlineData }] } }],
  });
  beforeEach(() => {
    jest.resetAllMocks();
    storage.buscar.mockResolvedValue(null);
    imagem = new ImageService(config, storage as unknown as MidiaStorageService);
    jest.spyOn(global, 'fetch');
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  it.each([
    null,
    { candidates: {} },
    { candidates: [null] },
    { candidates: [{ content: { parts: 'PRIVADO' } }] },
    resposta({ mimeType: 'image/png', data: '!!!' }),
    resposta({ mimeType: 'image/png', data: '' }),
    resposta({ mimeType: 'text/html', data: 'aHRtbA==' }),
    resposta({ mimeType: 'image/png', data: 42 }),
  ])('rejeita resposta de imagem inválida sem persistir (%j)', async (dados) => {
    jest.mocked(fetch).mockResolvedValue({ ok: true, json: async () => dados } as Response);
    await expect(imagem.gerarImagem({ prompt: 'PRIVADO' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(storage.salvar).not.toHaveBeenCalled();
  });

  it.each(['transporte', 'json', 'http'])(
    'não vaza prompt, credencial ou erro bruto na falha de %s',
    async (tipo) => {
      if (tipo === 'transporte')
        jest.mocked(fetch).mockRejectedValue(new Error('CHAVE_PRIVADA CONTEUDO_PRIVADO'));
      else
        jest.mocked(fetch).mockResolvedValue({
          ok: tipo !== 'http',
          status: 429,
          text: async () => 'CHAVE_PRIVADA CONTEUDO_PRIVADO',
          json: async () => {
            throw new Error('CHAVE_PRIVADA CONTEUDO_PRIVADO');
          },
        } as unknown as Response);
      await expect(imagem.gerarImagem({ prompt: 'CONTEUDO_PRIVADO' })).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(storage.salvar).not.toHaveBeenCalled();
      expect(JSON.stringify(jest.mocked(Logger.prototype.error).mock.calls)).not.toMatch(/PRIVAD/);
    },
  );

  it('mantém tamanho e MIME JPEG na gravação de imagem válida', async () => {
    jest
      .mocked(fetch)
      .mockResolvedValue({
        ok: true,
        json: async () => resposta({ mimeType: 'image/jpeg', data: 'anBlZw==' }),
      } as Response);
    storage.salvar.mockResolvedValue('imagem-teste.jpg');
    expect(await imagem.gerarImagem({ prompt: 'Diagrama', tamanho: '2K' })).toEqual({
      arquivo: 'imagem-teste.jpg',
      prompt: 'Diagrama',
    });
    expect(storage.salvar).toHaveBeenCalledWith(
      'imagem',
      'modelo-teste|2K|Diagrama',
      Buffer.from('jpeg'),
      'image/jpeg',
      'gemini',
    );
    expect(JSON.parse(String(jest.mocked(fetch).mock.calls[0][1]?.body))).toMatchObject({
      generationConfig: { imageConfig: { imageSize: '2K' } },
    });
  });

  it('oculta texto privado na falha de síntese de áudio', async () => {
    const provider = {
      nome: 'edge-tts',
      sintetizar: jest.fn().mockRejectedValue(new Error('CONTEUDO_PRIVADO')),
    };
    const audio = new AudioService(config, storage as unknown as MidiaStorageService, provider);
    await expect(audio.gerarAudio({ texto: 'CONTEUDO_PRIVADO' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(storage.salvar).not.toHaveBeenCalled();
    expect(JSON.stringify(jest.mocked(Logger.prototype.error).mock.calls)).not.toContain(
      'CONTEUDO_PRIVADO',
    );
  });

  it('preserva o erro HTTP 503 mesmo se o descarte do corpo falhar', async () => {
    const cancel = jest.fn().mockRejectedValue(new Error('CONTEUDO_PRIVADO'));
    jest
      .mocked(fetch)
      .mockResolvedValue({ ok: false, status: 500, body: { cancel } } as unknown as Response);
    await expect(imagem.gerarImagem({ prompt: 'Diagrama' })).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(storage.salvar).not.toHaveBeenCalled();
  });
});
