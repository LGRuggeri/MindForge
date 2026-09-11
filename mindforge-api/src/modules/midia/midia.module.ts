import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AUDIO_PROVIDER, AudioService } from './audio.service';
import { ImageService } from './image.service';
import { MidiaController } from './midia.controller';
import { MidiaStorageService } from './midia-storage.service';
import { EdgeTtsProvider } from './providers/edge-tts.provider';
import type { AudioProvider } from './audio.service';

/**
 * Módulo Midia: mídias geradas por IA — imagens ilustrativas do conteúdo
 * (provedor configurável, default Gemini free tier) e áudio de pronúncia
 * (Edge-TTS). Cache em disco: cada mídia é gerada uma única vez.
 * Provedores são configuráveis por env vars (padrão ADR-016) e isolados em
 * services, para troca futura sem impacto nos consumidores.
 */
@Module({
  controllers: [MidiaController],
  providers: [
    MidiaStorageService,
    AudioService,
    ImageService,
    {
      provide: AUDIO_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): AudioProvider => {
        const nome = config.get<string>('AUDIO_PROVIDER', 'edge-tts');
        switch (nome) {
          case 'edge-tts':
            return new EdgeTtsProvider();
          default:
            throw new Error(`Provedor de áudio desconhecido: ${nome}`);
        }
      },
    },
  ],
  exports: [AudioService, ImageService],
})
export class MidiaModule {}
