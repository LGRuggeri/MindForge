import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';

export interface MidiaArmazenada {
  arquivo: string;
  mime: string;
  buffer: Buffer;
}

interface SidecarMetadados {
  mime: string;
  origem: string;
  criadoEm: string;
}

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

  async salvar(tipo: 'imagem' | 'audio', chave: string, buffer: Buffer, mime: string, origem: string): Promise<string> {
    const hash = createHash('sha256').update(chave).digest('hex').slice(0, 32);
    const extensao = this.extensaoPorMime(mime);
    const arquivo = `${tipo}-${hash}.${extensao}`;

    await mkdir(this.diretorio, { recursive: true });
    await writeFile(join(this.diretorio, arquivo), buffer);
    const metadados: SidecarMetadados = { mime, origem, criadoEm: new Date().toISOString() };
    await writeFile(join(this.diretorio, `${arquivo}.json`), JSON.stringify(metadados), 'utf-8');

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

    const arquivo = nomes.find((n) => n.startsWith(prefixo) && !n.endsWith('.json'));
    if (!arquivo) {
      return null;
    }

    const metadados = await this.lerMetadados(arquivo);
    const buffer = await readFile(join(this.diretorio, arquivo));
    return { arquivo, mime: metadados?.mime ?? this.mimePorExtensao(arquivo), buffer };
  }

  async obterPorNome(arquivo: string): Promise<MidiaArmazenada | null> {
    // Bloqueia path traversal: o nome deve ser um arquivo simples, sem separadores
    // nem referências de diretório.
    if (arquivo.includes('/') || arquivo.includes('\\') || arquivo.includes('..')) {
      return null;
    }

    const caminho = join(this.diretorio, arquivo);
    if (resolve(caminho) !== join(this.diretorio, arquivo) || !caminho.startsWith(this.diretorio + sep)) {
      return null;
    }

    try {
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
      return JSON.parse(raw) as SidecarMetadados;
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
