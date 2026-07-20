import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

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

    const resposta = await this.client.embeddings.create({
      model,
      input: texto,
    });

    const embedding = resposta.data[0]?.embedding;
    if (!embedding) {
      throw new Error('Resposta do provedor de embeddings não contém vetor');
    }

    this.logger.debug(`Embedding gerado: modelo=${model}, dimensões=${embedding.length}`);
    return embedding;
  }
}
