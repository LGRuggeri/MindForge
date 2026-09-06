import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AudioButton, textoPronunciaavel } from '@/components/audio-button';

const playMock = vi.fn().mockResolvedValue(undefined);

// Construtor mockado do Audio do browser: reprodução sempre resolve.
const AudioMock = vi.fn(function (this: Record<string, unknown>, src: string) {
  this.src = src;
  this.onended = null;
  this.onerror = null;
  this.play = playMock;
});

describe('AudioButton', () => {
  beforeEach(() => {
    playMock.mockClear();
    AudioMock.mockClear();
    vi.stubGlobal('Audio', AudioMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('deve montar a URL do endpoint de áudio com texto e idioma', () => {
    render(<AudioButton texto="Hello world" idioma="en" />);

    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    expect(playMock).toHaveBeenCalledTimes(1);
    expect(AudioMock).toHaveBeenCalledWith(expect.stringContaining('/midia/audio?texto=Hello+world'));
    expect(AudioMock).toHaveBeenCalledWith(expect.stringContaining('idioma=en'));
  });

  it('não deve incluir idioma na URL quando omitido', () => {
    render(<AudioButton texto="Olá" />);

    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    const url = AudioMock.mock.calls[0][0] as string;
    expect(url).toContain('texto=');
    expect(url).not.toContain('idioma=');
  });

  it('deve usar a voz neural informada', () => {
    render(<AudioButton texto="Bonjour" idioma="fr" voz="fr-FR-DeniseNeural" />);

    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    expect(AudioMock).toHaveBeenCalledWith(expect.stringContaining('voz=fr-FR-DeniseNeural'));
  });

  it('não deve reproduzir com texto vazio', () => {
    render(<AudioButton texto="  " />);

    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    expect(playMock).not.toHaveBeenCalled();
  });

  it('deve remover sintaxe markdown antes de enviar ao TTS', () => {
    const markdown = '## Título\n\nUse **negrito** e `código`, veja [link](https://ex.com) e ![img](https://ex.com/a.png).';
    const falado = textoPronunciaavel(markdown);
    expect(falado).toBe('Título Use negrito e código, veja link e .');

    render(<AudioButton texto={markdown} />);
    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    const url = AudioMock.mock.calls[0][0] as string;
    // URLSearchParams codifica espaço como '+', que decodeURIComponent não reverte.
    const urlDecodificada = decodeURIComponent(url).replace(/\+/g, ' ');
    expect(urlDecodificada).toContain('texto=Título Use negrito');
    expect(url).not.toContain('%23');
  });

  it('deve limitar o texto ao tamanho do endpoint', () => {
    const longo = 'a'.repeat(600);
    expect(textoPronunciaavel(longo)).toHaveLength(450);
  });
});
