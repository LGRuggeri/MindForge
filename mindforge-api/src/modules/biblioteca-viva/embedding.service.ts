import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import { EMBEDDING_DIMENSIONS } from '../../config/embedding';

const respostaSchema = z.object({
  data: z.tuple([
    z.object({
      index: z.literal(0),
      embedding: z
        .array(z.number())
        .length(EMBEDDING_DIMENSIONS)
        .refine((vetor) => vetor.some((valor) => valor !== 0)),
    }),
  ]),
});

/**
 * Ponto único de acoplamento com o provedor de embeddings. O restante do
 * módulo só conhece este contrato — trocar de provedor (ou de modelo, o
 * que muda a dimensão do vetor) fica confinado aqui e na coluna
 * `embedding` do schema (`conteudo_chunks.schema.ts`).
 *
 * Usa a biblioteca oficial OpenAI, que também funciona com qualquer servidor
 * compatível com a API OpenAI (Ollama, Groq, etc.) via OPENAI_BASE_URL.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    // Provedor de embeddings pode ser distinto do provedor de chat — por
    // exemplo, um gateway que só serve /chat/completions (sem /embeddings)
    // precisa de EMBEDDING_API_KEY/EMBEDDING_BASE_URL apontando para um
    // provedor real (OpenAI oficial, Ollama, etc). Fallback: mesma config
    // do LlmService, para não quebrar setups que já funcionam com um único
    // provedor compatível com ambos os endpoints.
    const baseURL =
      this.config.get<string>('EMBEDDING_BASE_URL') ?? this.config.get<string>('OPENAI_BASE_URL');
    const apiKey =
      this.config.get<string>('EMBEDDING_API_KEY') ?? this.config.getOrThrow<string>('LLM_API_KEY');

    this.client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  async gerar(texto: string): Promise<number[]> {
    const model = this.config.get<string>('EMBEDDING_MODEL', 'text-embedding-3-small');

    let resposta: unknown;
    try {
      resposta = await this.client.embeddings.create({ model, input: texto });
    } catch {
      throw new BadGatewayException('Não foi possível gerar o embedding');
    }
    const validado = respostaSchema.safeParse(resposta);
    if (!validado.success) {
      throw new BadGatewayException(
        `O provedor deve retornar exatamente um vetor válido de ${EMBEDDING_DIMENSIONS} dimensões`,
      );
    }
    const embedding = validado.data.data[0].embedding;

    this.logger.debug(`Embedding gerado: modelo=${model}, dimensões=${embedding.length}`);
    return embedding;
  }
}
