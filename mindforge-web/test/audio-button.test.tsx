import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { AudioButton, textoPronunciaavel } from '@/components/audio-button';

const playMock = vi.fn().mockResolvedValue(undefined);
const revokeObjectURL = vi.fn();
let ultimoBlobUrl = '';

// Audio mockado do browser: reprodução sempre resolve.
const AudioMock = vi.fn(function (this: Record<string, unknown>, src: string) {
  this.src = src;
  this.onended = null;
  this.onerror = null;
  this.play = playMock;
});

const fetchMock = vi.fn();

describe('AudioButton', () => {
  beforeEach(() => {
    playMock.mockClear();
    AudioMock.mockClear();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['mp3'], { type: 'audio/mpeg' }),
    });
    vi.stubGlobal('Audio', AudioMock);
    vi.stubGlobal('fetch', fetchMock);
    ultimoBlobUrl = '';
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        ultimoBlobUrl = `blob:${blob.size}`;
        return ultimoBlobUrl;
      }),
      revokeObjectURL,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('deve chamar o endpoint POST com texto e idioma', async () => {
    render(<AudioButton texto="Hello world" idioma="en" />);

    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/midia/audio'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ texto: 'Hello world', idioma: 'en', voz: undefined }),
      }),
    );
    expect(AudioMock).toHaveBeenCalledWith(ultimoBlobUrl);
  });

  it('não deve incluir idioma no body quando omitido', async () => {
    render(<AudioButton texto="Olá" />);

    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.texto).toBe('Olá');
    expect(body).not.toHaveProperty('idioma');
  });

  it('deve usar a voz neural informada', async () => {
    render(<AudioButton texto="Bonjour" idioma="fr" voz="fr-FR-DeniseNeural" />);

    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.voz).toBe('fr-FR-DeniseNeural');
  });

  it('não deve reproduzir com texto vazio', () => {
    render(<AudioButton texto="  " />);

    fireEvent.click(screen.getByRole('button', { name: /ouvir pronúncia/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(playMock).not.toHaveBeenCalled();
  });

  it('deve remover sintaxe markdown antes de enviar ao TTS', () => {
    const markdown = '## Título\n\nUse **negrito** e `código`, veja [link](https://ex.com) e ![img](https://ex.com/a.png).';
    expect(textoPronunciaavel(markdown)).toBe('Título Use negrito e código, veja link e .');
  });

  it('não deve truncar respostas longas', () => {
    const longo = 'a'.repeat(5000);
    expect(textoPronunciaavel(longo)).toHaveLength(5000);
  });
});
