import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MidiaStorageService } from './midia-storage.service';

describe('MidiaStorageService', () => {
  let service: MidiaStorageService;
  let diretorio: string;

  beforeEach(async () => {
    diretorio = await mkdtemp(join(tmpdir(), 'midia-test-'));
    const config = { get: jest.fn((key: string) => (key === 'MIDIA_DIR' ? diretorio : undefined)) };
    service = new MidiaStorageService(config as unknown as ConfigService);
  });

  afterEach(async () => {
    await rm(diretorio, { recursive: true, force: true });
  });

  it('deve salvar e recuperar uma mídia pelo mesmo conteúdo', async () => {
    const arquivo = await service.salvar('audio', 'chave-1', Buffer.from('mp3-fake'), 'audio/mpeg', 'edge-tts');

    expect(arquivo).toMatch(/^audio-[a-f0-9]{32}\.mp3$/);

    const buscada = await service.buscar('audio', 'chave-1');
    expect(buscada).not.toBeNull();
    expect(buscada!.buffer.toString()).toBe('mp3-fake');
    expect(buscada!.mime).toBe('audio/mpeg');
  });

  it('deve retornar null ao buscar chave inexistente', async () => {
    const resultado = await service.buscar('imagem', 'chave-inexistente');
    expect(resultado).toBeNull();
  });

  it('deve distinguir áudio de imagem na mesma chave', async () => {
    await service.salvar('audio', 'mesma-chave', Buffer.from('som'), 'audio/mpeg', 'edge-tts');
    const imagem = await service.buscar('imagem', 'mesma-chave');
    expect(imagem).toBeNull();
  });

  it('deve recuperar mídia pelo nome do arquivo', async () => {
    const arquivo = await service.salvar('imagem', 'chave-img', Buffer.from('png-fake'), 'image/png', 'gemini');

    const obtida = await service.obterPorNome(arquivo);
    expect(obtida).not.toBeNull();
    expect(obtida!.mime).toBe('image/png');
  });

  it('deve recusar nomes com path traversal', async () => {
    expect(await service.obterPorNome('../.env')).toBeNull();
    expect(await service.obterPorNome('..\\package.json')).toBeNull();
    expect(await service.obterPorNome('pasta/arquivo.png')).toBeNull();
  });

  it('deve retornar null para arquivo que não existe', async () => {
    expect(await service.obterPorNome('imagem-naoexiste.png')).toBeNull();
  });
});
