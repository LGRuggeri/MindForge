import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';

export interface MidiaArmazenada {
  arquivo: string;
  mime: string;
  buffer: Buffer;
}

const metadadosSchema = z.object({
  mime: z.string(),
  origem: z.string(),
  criadoEm: z.string().datetime(),
});
type SidecarMetadados = z.infer<typeof metadadosSchema>;
const NOME_MIDIA = /^(imagem|audio)-[a-f0-9]{32}\.(png|jpg|mp3|wav|ogg|bin)$/;

/**
 * Cache de mídias geradas (imagens e áudios) em disco.
 *
 * Cada mídia é identificada por um hash SHA-256 do provedor + parâmetros de
 * geração, então a mesma palavra/frase/ilustração é gerada uma única vez e
 * servida do disco para sempre — o provedor externo quase nunca é tocado.
 *
 * Metadados (mime, origem) ficam em um sidecar JSON ao lado do arquivo.
 * Sem banco de dados de propósito: projeto local, usuário único.
 */
@Injectable()
export class MidiaStorageService {
  private readonly logger = new Logger(MidiaStorageService.name);
  private readonly diretorio: string;

  constructor(private readonly config: ConfigService) {
    const configurado = this.config.get<string>('MIDIA_DIR') ?? './data/midias';
    this.diretorio = resolve(process.cwd(), configurado);
  }

  async salvar(
    tipo: 'imagem' | 'audio',
    chave: string,
    buffer: Buffer,
    mime: string,
    origem: string,
  ): Promise<string> {
    const hash = createHash('sha256').update(chave).digest('hex').slice(0, 32);
    const extensao = this.extensaoPorMime(mime);
    const arquivo = `${tipo}-${hash}.${extensao}`;

    await mkdir(this.diretorio, { recursive: true });
    const metadados: SidecarMetadados = { mime, origem, criadoEm: new Date().toISOString() };
    const temporario = join(this.diretorio, `${arquivo}.${randomUUID()}.tmp`);
    const temporarioJson = `${temporario}.json`;
    try {
      await writeFile(temporario, buffer, { flag: 'wx' });
      await writeFile(temporarioJson, JSON.stringify(metadados), { encoding: 'utf-8', flag: 'wx' });
      // O arquivo de mídia só fica visível depois das escritas completas.
      await rename(temporarioJson, join(this.diretorio, `${arquivo}.json`));
      await rename(temporario, join(this.diretorio, arquivo));
    } finally {
      await Promise.all(
        [temporario, temporarioJson].map(async (caminho) => {
          await unlink(caminho).catch(() => undefined);
        }),
      );
    }

    this.logger.debug(`Mídia salva em cache: ${arquivo} (${buffer.length} bytes)`);
    return arquivo;
  }

  async buscar(tipo: 'imagem' | 'audio', chave: string): Promise<MidiaArmazenada | null> {
    const hash = createHash('sha256').update(chave).digest('hex').slice(0, 32);
    const prefixo = `${tipo}-${hash}.`;

    let nomes: string[];
    try {
      nomes = await readdir(this.diretorio);
    } catch {
      return null;
    }

    const arquivo = nomes.find((n) => n.startsWith(prefixo) && NOME_MIDIA.test(n));
    if (!arquivo) {
      return null;
    }

    return this.obterPorNome(arquivo);
  }

  async obterPorNome(arquivo: string): Promise<MidiaArmazenada | null> {
    // Aceita somente arquivos gerados; sidecars, temporários e caminhos são recusados.
    if (!NOME_MIDIA.test(arquivo)) return null;
    const caminho = join(this.diretorio, arquivo);
    try {
      const info = await lstat(caminho);
      if (info.isSymbolicLink() || !info.isFile()) return null;
      const buffer = await readFile(caminho);
      const metadados = await this.lerMetadados(arquivo);
      return { arquivo, mime: metadados?.mime ?? this.mimePorExtensao(arquivo), buffer };
    } catch {
      return null;
    }
  }

  private async lerMetadados(arquivo: string): Promise<SidecarMetadados | null> {
    try {
      const raw = await readFile(join(this.diretorio, `${arquivo}.json`), 'utf-8');
      const resultado = metadadosSchema.safeParse(JSON.parse(raw));
      return resultado.success && resultado.data.mime === this.mimePorExtensao(arquivo)
        ? resultado.data
        : null;
    } catch {
      return null;
    }
  }

  private extensaoPorMime(mime: string): string {
    switch (mime) {
      case 'image/png':
        return 'png';
      case 'image/jpeg':
        return 'jpg';
      case 'audio/mpeg':
        return 'mp3';
      case 'audio/wav':
        return 'wav';
      case 'audio/ogg':
        return 'ogg';
      default:
        return 'bin';
    }
  }

  private mimePorExtensao(arquivo: string): string {
    if (arquivo.endsWith('.png')) return 'image/png';
    if (arquivo.endsWith('.jpg')) return 'image/jpeg';
    if (arquivo.endsWith('.mp3')) return 'audio/mpeg';
    if (arquivo.endsWith('.wav')) return 'audio/wav';
    if (arquivo.endsWith('.ogg')) return 'audio/ogg';
    return 'application/octet-stream';
  }
}
