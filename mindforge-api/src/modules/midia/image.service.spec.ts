import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { ImageService } from './image.service';
import { MidiaStorageService } from './midia-storage.service';

describe('ImageService', () => {
  let storage: jest.Mocked<MidiaStorageService>;
  let service: ImageService;
  let fetchMock: jest.Mock;
  const fetchOriginal = global.fetch;

  const respostaGemini = (base64: string) => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: 'image/png', data: base64 } }],
          },
        },
      ],
    }),
  });

  beforeEach(() => {
    storage = {
      buscar: jest.fn(),
      salvar: jest.fn(),
    } as unknown as jest.Mocked<MidiaStorageService>;

    const config = {
      get: jest.fn((key: string) => {
        const valores: Record<string, string> = {
          IMAGE_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
          IMAGE_MODEL: 'gemini-3.1-flash-image',
          IMAGE_API_KEY: 'gemini-key',
        };
        return valores[key];
      }),
      getOrThrow: jest.fn((key: string) => {
        const valores: Record<string, string> = {
          IMAGE_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
          IMAGE_MODEL: 'gemini-3.1-flash-image',
          LLM_API_KEY: 'gemini-key',
        };
        return valores[key];
      }),
    } as unknown as ConfigService;

    service = new ImageService(config, storage);
    fetchMock = jest.fn();
    (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    (global as unknown as { fetch: typeof fetchOriginal }).fetch = fetchOriginal;
  });

  it('deve chamar generateContent com responseModalities IMAGE e salvar o resultado', async () => {
    storage.buscar.mockResolvedValue(null);
    fetchMock.mockResolvedValue(respostaGemini(Buffer.from('png-fake').toString('base64')));
    storage.salvar.mockResolvedValue('imagem-abc.png');

    const resultado = await service.gerarImagem({ prompt: 'Diagram of a cell' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent');
    expect(url).toContain('key=gemini-key');
    const corpo = JSON.parse(String(init.body)) as {
      generationConfig: { responseModalities: string[] };
      contents: { parts: { text: string }[] }[];
    };
    expect(corpo.generationConfig.responseModalities).toEqual(['IMAGE']);
    expect(corpo.contents[0].parts[0].text).toContain('Diagram of a cell');
    expect(storage.salvar).toHaveBeenCalledWith(
      'imagem',
      expect.stringContaining('Diagram of a cell'),
      expect.any(Buffer),
      'image/png',
      'gemini',
    );
    expect(resultado.arquivo).toBe('imagem-abc.png');
  });

  it('deve servir do cache sem chamar a API', async () => {
    storage.buscar.mockResolvedValue({ arquivo: 'imagem-cache.png', mime: 'image/png', buffer: Buffer.from('x') });

    const resultado = await service.gerarImagem({ prompt: 'Diagram of a cell' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(storage.salvar).not.toHaveBeenCalled();
    expect(resultado.arquivo).toBe('imagem-cache.png');
  });

  it('deve lançar ServiceUnavailableException quando a API retorna erro', async () => {
    storage.buscar.mockResolvedValue(null);
    fetchMock.mockResolvedValue({ ok: false, status: 429, text: async () => 'quota' });

    await expect(service.gerarImagem({ prompt: 'x' })).rejects.toThrow(ServiceUnavailableException);
    expect(storage.salvar).not.toHaveBeenCalled();
  });

  it('deve lançar exceção quando a resposta não contém imagem', async () => {
    storage.buscar.mockResolvedValue(null);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ content: { parts: [] } }] }) });

    await expect(service.gerarImagem({ prompt: 'x' })).rejects.toThrow(ServiceUnavailableException);
  });
});
