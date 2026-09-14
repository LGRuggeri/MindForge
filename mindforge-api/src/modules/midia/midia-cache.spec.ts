import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { MidiaStorageService } from './midia-storage.service';

const fs = jest.requireActual<typeof import('node:fs/promises')>('node:fs/promises');
describe('Cache de mídia — integridade, metadados e arquivos permitidos', () => {
  let raiz: string;
  let diretorio: string;
  let storage: MidiaStorageService;
  beforeEach(async () => {
    raiz = await fs.mkdtemp(join(tmpdir(), 'mindforge-cache-'));
    diretorio = join(raiz, 'cache');
    storage = new MidiaStorageService(new ConfigService({ MIDIA_DIR: diretorio }));
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    const absoluto = resolve(raiz);
    if (!absoluto.startsWith(resolve(tmpdir()) + sep) || !absoluto.includes('mindforge-cache-'))
      throw new Error('Limpeza fora do diretório de teste');
    await fs.rm(absoluto, { recursive: true, force: true });
  });
  it('retorna miss quando o diretório ainda não existe', async () => {
    expect(await storage.buscar('audio', 'chave')).toBeNull();
  });
  it.each([
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['audio/mpeg', 'mp3'],
    ['audio/wav', 'wav'],
    ['audio/ogg', 'ogg'],
    ['application/octet-stream', 'bin'],
  ])('recupera %s sem sidecar', async (mime, ext) => {
    const arquivo = await storage.salvar('audio', 'chave', Buffer.from('conteudo'), mime, 'teste');
    expect(arquivo).toMatch(new RegExp('\\.' + ext + '$'));
    await fs.unlink(join(diretorio, arquivo + '.json'));
    expect(await storage.buscar('audio', 'chave')).toEqual({
      arquivo,
      mime,
      buffer: Buffer.from('conteudo'),
    });
  });
  it.each([
    'json inválido',
    'null',
    '[]',
    '{"mime":{}}',
    '{"mime":"text/html"}',
    '{"mime":"audio/mpeg","origem":7}',
  ])('ignora sidecar inválido %s', async (raw) => {
    const arquivo = await storage.salvar(
      'imagem',
      'chave',
      Buffer.from('conteudo'),
      'image/png',
      'teste',
    );
    await fs.writeFile(join(diretorio, arquivo + '.json'), raw);
    expect((await storage.obterPorNome(arquivo))?.mime).toBe('image/png');
  });
  it('ignora arquivo que desapareceu após a listagem', async () => {
    const arquivo = await storage.salvar(
      'audio',
      'chave',
      Buffer.from('audio'),
      'audio/mpeg',
      'teste',
    );
    await fs.unlink(join(diretorio, arquivo));
    jest.spyOn(fs, 'readdir').mockResolvedValue([arquivo] as never);
    expect(await storage.buscar('audio', 'chave')).toBeNull();
  });
  it.each([
    '../fora.png',
    '..\\fora.png',
    '/absoluto',
    'C:\\arquivo',
    '',
    '.',
    'arquivo.json',
    'audio-abc.mp3',
    'audio-' + 'a'.repeat(32) + '.mp3:segredo',
  ])('recusa nome não gerado %s', async (nome) => {
    expect(await storage.obterPorNome(nome)).toBeNull();
  });
  it('não serve arquivo JSON do cache ou arquivo arbitrário', async () => {
    const arquivo = await storage.salvar(
      'imagem',
      'chave',
      Buffer.from('imagem'),
      'image/png',
      'teste',
    );
    await fs.writeFile(join(diretorio, 'privado.txt'), 'SEGREDO');
    expect(await storage.obterPorNome(arquivo + '.json')).toBeNull();
    expect(await storage.obterPorNome('privado.txt')).toBeNull();
  });
  it('não considera temporários como mídia pronta', async () => {
    await fs.mkdir(diretorio);
    const hash = createHash('sha256').update('chave').digest('hex').slice(0, 32);
    await fs.writeFile(join(diretorio, 'audio-' + hash + '.mp3.tmp'), 'parcial');
    expect(await storage.buscar('audio', 'chave')).toBeNull();
  });
  it('não publica arquivo parcial quando gravar metadados falha', async () => {
    const escrita = fs.writeFile;
    jest
      .spyOn(fs, 'writeFile')
      .mockImplementationOnce(escrita)
      .mockRejectedValueOnce(new Error('Falha de disco'));
    await expect(
      storage.salvar('audio', 'chave', Buffer.from('parcial'), 'audio/mpeg', 'teste'),
    ).rejects.toThrow('Falha de disco');
    expect(await storage.buscar('audio', 'chave')).toBeNull();
    expect(await fs.readdir(diretorio)).toEqual([]);
  });
  it('preserva cache anterior quando uma nova gravação falha', async () => {
    const arquivo = await storage.salvar(
      'audio',
      'chave',
      Buffer.from('anterior'),
      'audio/mpeg',
      'teste',
    );
    const escrita = fs.writeFile;
    jest
      .spyOn(fs, 'writeFile')
      .mockImplementationOnce(escrita)
      .mockRejectedValueOnce(new Error('Falha de disco'));
    await expect(
      storage.salvar('audio', 'chave', Buffer.from('novo'), 'audio/mpeg', 'teste'),
    ).rejects.toThrow();
    expect((await storage.obterPorNome(arquivo))?.buffer.toString()).toBe('anterior');
  });
  it('recusa links simbólicos com nome de mídia', async () => {
    const arquivo = await storage.salvar(
      'audio',
      'chave',
      Buffer.from('audio'),
      'audio/mpeg',
      'teste',
    );
    jest
      .spyOn(fs, 'lstat')
      .mockResolvedValue({ isSymbolicLink: () => true, isFile: () => false } as never);
    expect(await storage.obterPorNome(arquivo)).toBeNull();
  });
});
