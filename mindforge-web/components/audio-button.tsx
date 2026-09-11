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

/**
 * Converte markdown em texto falável: remove sintaxe (títulos, ênfase,
 * links, imagens, blocos de código) que o TTS leria literalmente.
 * Não há truncamento — o endpoint aceita a resposta completa.
 */
export function textoPronunciaavel(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[ \t]*(?:>[ \t]?)+/gm, '')
    .replace(/^[ \t]*-[ \t]+/gm, '')
    .replace(/[*_|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Botão de pronúncia: pede o áudio ao endpoint /midia/audio da API (POST —
 * textos longos não caberiam numa query string) e toca. O áudio é cacheado
 * no servidor (cada texto é sintetizado uma única vez), então repetições são
 * rápidas mesmo sem cache de browser.
 */
export function AudioButton({ texto, idioma, voz, label, variante = 'icone' }: AudioButtonProps) {
  const [tocando, setTocando] = useState(false);

  const reproduzir = async () => {
    const textoLimpo = textoPronunciaavel(texto);
    if (tocando || !textoLimpo) return;
    setTocando(true);
    try {
      const resposta = await fetch(`${API_URL}/midia/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoLimpo, idioma, voz }),
      });
      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setTocando(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
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
