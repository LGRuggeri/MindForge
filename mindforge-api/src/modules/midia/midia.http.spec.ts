import { Global, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { MidiaModule } from './midia.module';
import { MidiaStorageService } from './midia-storage.service';
import { EdgeTtsProvider } from './providers/edge-tts.provider';

const config = new ConfigService({
  IMAGE_BASE_URL: 'https://imagem.invalid',
  IMAGE_MODEL: 'teste',
  IMAGE_API_KEY: 'teste',
});
@Global()
@Module({ providers: [{ provide: ConfigService, useValue: config }], exports: [ConfigService] })
class ConfigTesteModule {}

describe('Mídia — HTTP, composição e cache', () => {
  let app: INestApplication;
  let url: string;
  let diretorio: string;
  let sintetizar: jest.SpyInstance;
  beforeAll(async () => {
    diretorio = await mkdtemp(join(tmpdir(), 'mindforge-midia-http-'));
    config.set('MIDIA_DIR', diretorio);
    const modulo = await Test.createTestingModule({
      imports: [ConfigTesteModule, MidiaModule],
    }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });
  beforeEach(() => {
    sintetizar = jest
      .spyOn(EdgeTtsProvider.prototype, 'sintetizar')
      .mockResolvedValue({ buffer: Buffer.from('audio de teste'), mime: 'audio/mpeg' });
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
    const alvo = resolve(diretorio);
    if (!alvo.startsWith(join(resolve(tmpdir()), 'mindforge-midia-http-')))
      throw new Error('Diretório de teste inválido');
    await rm(alvo, { recursive: true, force: true });
  });
  const postar = (dados: object) =>
    fetch(url + '/midia/audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });

  it('devolve áudio binário e reutiliza cache para a mesma voz/idioma', async () => {
    const params = { texto: 'Hello', idioma: 'en-US', voz: 'en-US-AriaNeural' };
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const resposta = await postar(params);
      expect(resposta.status).toBe(201);
      expect(resposta.headers.get('content-type')).toBe('audio/mpeg');
      expect(resposta.headers.get('cache-control')).toContain('immutable');
      expect(Buffer.from(await resposta.arrayBuffer())).toEqual(Buffer.from('audio de teste'));
    }
    expect(sintetizar).toHaveBeenCalledTimes(1);
    const outraVoz = await postar({ ...params, voz: 'en-US-GuyNeural' });
    await outraVoz.arrayBuffer();
    expect(outraVoz.status).toBe(201);
    expect(sintetizar).toHaveBeenCalledTimes(2);
  });

  it.each([
    { texto: '' },
    { texto: 'a'.repeat(10001) },
    { texto: 'Olá', idioma: 'x' },
    { texto: 'Olá', voz: '<voice>' },
    { texto: 'Olá', extra: true },
  ])('rejeita DTO inválido antes do provider (%j)', async (params) => {
    const resposta = await postar(params);
    expect(resposta.status).toBe(400);
    await resposta.arrayBuffer();
    expect(sintetizar).not.toHaveBeenCalled();
  });

  it('serve imagem persistida e recusa exposição do sidecar', async () => {
    const arquivo = await app
      .get(MidiaStorageService)
      .salvar('imagem', 'diagrama', Buffer.from('imagem teste'), 'image/png', 'teste');
    const resposta = await fetch(url + '/midia/imagem/' + arquivo);
    expect(resposta.status).toBe(200);
    expect(resposta.headers.get('content-type')).toBe('image/png');
    expect(Buffer.from(await resposta.arrayBuffer())).toEqual(Buffer.from('imagem teste'));
    const sidecar = await fetch(url + '/midia/imagem/' + arquivo + '.json');
    expect(sidecar.status).toBe(404);
    await sidecar.arrayBuffer();
  });

  it('falha na composição quando o provider de áudio não é suportado', async () => {
    const configuracao = new ConfigService({
      AUDIO_PROVIDER: 'inexistente',
      IMAGE_BASE_URL: 'https://imagem.invalid',
      IMAGE_MODEL: 'teste',
      IMAGE_API_KEY: 'teste',
      MIDIA_DIR: diretorio,
    });
    await expect(
      Test.createTestingModule({ imports: [ConfigTesteModule, MidiaModule] })
        .overrideProvider(ConfigService)
        .useValue(configuracao)
        .compile(),
    ).rejects.toThrow('Provedor de áudio desconhecido');
  });
});
