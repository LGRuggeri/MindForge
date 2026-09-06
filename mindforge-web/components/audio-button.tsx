'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Volume2 } from 'lucide-react';

interface AudioButtonProps {
  /** Texto a ser pronunciado (palavra, frase ou resposta inteira). */
  texto: string;
  /** Código do idioma (ex.: 'en', 'pt-br', 'es'). Opcional. */
  idioma?: string;
  /** Voz neural específica (ex.: 'en-US-AriaNeural'). Opcional. */
  voz?: string;
  /** Rótulo acessível e de tooltip. */
  label?: string;
  /** Variante visual: ícone só ou com texto. */
  variante?: 'icone' | 'texto';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
// O endpoint limita o texto a 500 caracteres; ficamos abaixo para a URL.
const LIMITE_CARACTERES = 450;

/**
 * Converte markdown em texto falável: remove sintaxe (títulos, ênfase,
 * links, imagens, blocos de código) que o TTS leria literalmente, e limita
 * o tamanho para caber no endpoint.
 */
export function textoPronunciaavel(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_>|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LIMITE_CARACTERES);
}

/**
 * Botão de pronúncia: pede o áudio ao endpoint /midia/audio da API e toca.
 * O áudio é cacheado no servidor (cada texto é sintetizado uma única vez),
 * então repetições são instantâneas.
 */
export function AudioButton({ texto, idioma, voz, label, variante = 'icone' }: AudioButtonProps) {
  const [tocando, setTocando] = useState(false);

  const montarUrl = () => {
    const params = new URLSearchParams({ texto: textoPronunciaavel(texto) });
    if (idioma) params.set('idioma', idioma);
    if (voz) params.set('voz', voz);
    return `${API_URL}/midia/audio?${params.toString()}`;
  };

  const reproduzir = async () => {
    if (tocando || !textoPronunciaavel(texto)) return;
    setTocando(true);
    try {
      const audio = new Audio(montarUrl());
      audio.onended = () => setTocando(false);
      audio.onerror = () => {
        setTocando(false);
        toast.error('Não foi possível carregar o áudio. Tente novamente.');
      };
      await audio.play();
    } catch {
      setTocando(false);
      toast.error('Não foi possível reproduzir o áudio.');
    }
  };

  const ariaLabel = label ?? `Ouvir pronúncia de "${texto.slice(0, 40)}"`;

  return (
    <Button
      type="button"
      variant="outline"
      size={variante === 'icone' ? 'icon' : 'sm'}
      onClick={reproduzir}
      disabled={tocando}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {tocando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
      {variante === 'texto' && <span className="ml-2">Ouvir</span>}
    </Button>
  );
}
