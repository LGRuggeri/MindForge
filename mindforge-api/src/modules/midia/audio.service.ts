import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MidiaStorageService } from './midia-storage.service';

export const AUDIO_PROVIDER = Symbol('AUDIO_PROVIDER');

export interface GerarAudioParams {
  texto: string;
  idioma?: string;
  voz?: string;
}

export interface AudioProvider {
  readonly nome: string;
  sintetizar(params: GerarAudioParams): Promise<{ buffer: Buffer; mime: string }>;
}

/**
 * Ponto único de acoplamento com provedores de TTS (texto-fala), seguindo o
 * mesmo padrão do EmbeddingService. Provedor padrão: Edge-TTS — vozes neurais
 * do Microsoft Edge Read Aloud, gratuitas, sem chave, 322 vozes em 45+
 * idiomas (caso de uso: pronúncia em cursos de idiomas).
 *
 * Áudios são cacheados em disco pela chave (provedor + texto + voz + idioma +
 * velocidade): cada pronúncia é sintetizada uma única vez.
 *
 * Interface pronta para provedores futuros sem mudança nos consumidores
 * (ex.: 'kokoro' local, 100% offline).
 */
@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private readonly nomeProvider: string;

  constructor(
    private readonly config: ConfigService,
    private readonly storage: MidiaStorageService,
    @Inject(AUDIO_PROVIDER) private readonly provider: AudioProvider,
  ) {
    this.nomeProvider = this.provider.nome;
  }

  async gerarAudio(params: GerarAudioParams): Promise<{ buffer: Buffer; mime: string; arquivo: string }> {
    const chave = this.montarChave(params);
    const cacheado = await this.storage.buscar('audio', chave);
    if (cacheado) {
      return { buffer: cacheado.buffer, mime: cacheado.mime, arquivo: cacheado.arquivo };
    }

    let sintetizado: { buffer: Buffer; mime: string };
    try {
      sintetizado = await this.provider.sintetizar(params);
    } catch (erro) {
      this.logger.error(
        `Falha ao sintetizar áudio com provedor ${this.nomeProvider}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      throw new ServiceUnavailableException(
        `Provedor de áudio indisponível (${this.nomeProvider}). Tente novamente mais tarde.`,
      );
    }

    const arquivo = await this.storage.salvar('audio', chave, sintetizado.buffer, sintetizado.mime, this.nomeProvider);
    return { buffer: sintetizado.buffer, mime: sintetizado.mime, arquivo };
  }

  private montarChave(params: GerarAudioParams): string {
    return [
      this.nomeProvider,
      (params.idioma ?? '').toLowerCase(),
      (params.voz ?? '').toLowerCase(),
      params.texto,
    ].join('|');
  }
}
