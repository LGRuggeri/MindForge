import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { MidiaController } from './midia.controller';
import { AudioService } from './audio.service';
import { MidiaStorageService } from './midia-storage.service';

describe('MidiaController', () => {
  let audioService: jest.Mocked<AudioService>;
  let storage: jest.Mocked<MidiaStorageService>;
  let controller: MidiaController;

  const resMock = () => {
    const res = { set: jest.fn(), send: jest.fn() };
    return res as unknown as Response & { set: jest.Mock; send: jest.Mock };
  };

  beforeEach(() => {
    audioService = { gerarAudio: jest.fn() } as unknown as jest.Mocked<AudioService>;
    storage = { obterPorNome: jest.fn() } as unknown as jest.Mocked<MidiaStorageService>;
    controller = new MidiaController(audioService, storage);
  });

  it('deve responder o áudio com content-type e cache imutável', async () => {
    audioService.gerarAudio.mockResolvedValue({ buffer: Buffer.from('mp3'), mime: 'audio/mpeg', arquivo: 'audio-x.mp3' });
    const res = resMock();

    await controller.gerarAudio({ texto: 'Hello', idioma: 'en', voz: undefined }, res);

    expect(audioService.gerarAudio).toHaveBeenCalledWith({ texto: 'Hello', idioma: 'en', voz: undefined });
    expect(res.set).toHaveBeenCalledWith(
      expect.objectContaining({ 'Content-Type': 'audio/mpeg', 'Cache-Control': expect.stringContaining('immutable') }),
    );
    expect(res.send).toHaveBeenCalledWith(Buffer.from('mp3'));
  });

  it('deve servir imagem do cache', async () => {
    storage.obterPorNome.mockResolvedValue({ arquivo: 'imagem-x.png', mime: 'image/png', buffer: Buffer.from('png') });
    const res = resMock();

    await controller.obterImagem('imagem-x.png', res);

    expect(storage.obterPorNome).toHaveBeenCalledWith('imagem-x.png');
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': 'image/png' }));
    expect(res.send).toHaveBeenCalledWith(Buffer.from('png'));
  });

  it('deve lançar NotFoundException para imagem inexistente', async () => {
    storage.obterPorNome.mockResolvedValue(null);
    await expect(controller.obterImagem('nao-existe.png', resMock())).rejects.toThrow(NotFoundException);
  });
});
