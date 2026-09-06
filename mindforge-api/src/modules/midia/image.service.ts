import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MidiaStorageService } from './midia-storage.service';

export interface GerarImagemParams {
  prompt: string;
  tamanho?: '1K' | '2K' | '4K';
}

interface GeminiContent {
  parts?: { inlineData?: { mimeType?: string; data?: string } }[];
}

/**
 * Provedor de geração de imagens via API Gemini (família de imagem, ex.:
 * gemini-3.1-flash-image), seguindo o padrão do EmbeddingService: um único
 * ponto de acoplamento, model ID configurável por env var (a Google renomeia
 * modelos com frequência — o default pode ser ajustado sem mudar código).
 *
 * Usa o endpoint nativo generateContent (não o OpenAI-compatible), que é o
 * único que expõe geração de imagem: o modelo de chat (gemini-3.6-flash) é
 * texto-only. Autenticação por query param `key` (padrão da API Gemini).
 *
 * Imagens são cacheadas em disco pela chave (modelo + prompt): cada
 * ilustração é gerada uma única vez. Falhas propagam exceção — a degradação
 * graciosa (conteúdo sem imagem) fica a cargo do Synthesizer.
 */
@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly storage: MidiaStorageService,
  ) {
    this.baseUrl = this.config.getOrThrow<string>('IMAGE_BASE_URL');
    this.model = this.config.getOrThrow<string>('IMAGE_MODEL');
    this.apiKey =
      this.config.get<string>('IMAGE_API_KEY') ?? this.config.getOrThrow<string>('LLM_API_KEY');
  }

  async gerarImagem(params: GerarImagemParams): Promise<{ arquivo: string; prompt: string }> {
    const chave = `${this.model}|${params.tamanho ?? '1K'}|${params.prompt}`;
    const cacheada = await this.storage.buscar('imagem', chave);
    if (cacheada) {
      return { arquivo: cacheada.arquivo, prompt: params.prompt };
    }

    let resposta: Response;
    try {
      resposta = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(60_000),
          body: JSON.stringify({
            contents: [{ parts: [{ text: this.enriquecerPrompt(params.prompt) }] }],
            generationConfig: {
              responseModalities: ['IMAGE'],
              imageConfig: {
                imageSize: params.tamanho ?? '1K',
                aspectRatio: '16:9',
              },
            },
          }),
        },
      );
    } catch (erro) {
      // Timeout ou falha de transporte (DNS, socket reset): mesmo contrato
      // do erro HTTP — provedor indisponível, nunca 500 genérico.
      this.logger.error(
        'Falha de transporte na geração de imagem',
        erro instanceof Error ? erro.stack : String(erro),
      );
      throw new ServiceUnavailableException('Provedor de imagem indisponível. Tente novamente.');
    }

    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '');
      this.logger.error(
        `Falha na geração de imagem (${resposta.status}): ${corpo.slice(0, 300)}`,
      );
      throw new ServiceUnavailableException(
        `Provedor de imagem indisponível (HTTP ${resposta.status}). ` +
          'Verifique IMAGE_MODEL — a Google renomeia modelos de imagem com frequência.',
      );
    }

    const dados = (await resposta.json()) as { candidates?: { content?: GeminiContent }[] };
    const parte = dados.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    const inline = parte?.inlineData;
    if (!inline?.data || !inline.mimeType) {
      throw new ServiceUnavailableException(
        'O provedor de imagem não retornou dados de imagem na resposta.',
      );
    }

    const buffer = Buffer.from(inline.data, 'base64');
    const arquivo = await this.storage.salvar('imagem', chave, buffer, inline.mimeType, 'gemini');
    return { arquivo, prompt: params.prompt };
  }

  /**
   * Prompts do Synthesizer já descrevem a ilustração didática; aqui só
   * adicionamos diretrizes de estilo consistentes para material educacional.
   */
  private enriquecerPrompt(prompt: string): string {
    return (
      `${prompt}. Clean educational illustration, didactic diagram style, ` +
      'labels in the same language as the concept, no watermark, no photorealistic people.'
    );
  }
}
