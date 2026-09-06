import { Controller, Get, NotFoundException, Param, Query, Res, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { AudioService } from './audio.service';
import { GerarAudioQueryDto } from './dto/midia.dto';
import { MidiaStorageService } from './midia-storage.service';

/**
 * Rotas de mídia gerada: áudio de pronúncia (TTS) e servir imagens ilustrativas
 * do cache. Ambas são públicas por natureza (conteúdo didático, projeto local
 * de uso pessoal — ver decisão em AGENTS.md sobre autenticação).
 */
@Controller('midia')
export class MidiaController {
  constructor(
    private readonly audioService: AudioService,
    private readonly storage: MidiaStorageService,
  ) {}

  @Get('audio')
  async gerarAudio(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) dto: GerarAudioQueryDto,
    @Res() res: Response,
  ) {
    const { buffer, mime } = await this.audioService.gerarAudio({
      texto: dto.texto,
      idioma: dto.idioma,
      voz: dto.voz,
    });
    res.set({ 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.send(buffer);
  }

  @Get('imagem/:arquivo')
  async obterImagem(@Param('arquivo') arquivo: string, @Res() res: Response) {
    const midia = await this.storage.obterPorNome(arquivo);
    if (!midia) {
      throw new NotFoundException(`Imagem não encontrada: ${arquivo}`);
    }
    res.set({ 'Content-Type': midia.mime, 'Cache-Control': 'public, max-age=31536000, immutable' });
    res.send(midia.buffer);
  }
}
