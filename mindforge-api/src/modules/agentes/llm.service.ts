import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface LlmResponse<T> {
  raw: string;
  parsed: T;
  modeloUsado: string;
  tokensUtilizados?: number;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private readonly client: OpenAI;

  constructor(private readonly config: ConfigService) {
    const baseURL = this.config.get<string>('OPENAI_BASE_URL');
    const apiKey = this.config.getOrThrow<string>('LLM_API_KEY');

    this.client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  async completar<T>({
    system,
    user,
    parser,
    temperature = 0.7,
  }: {
    system: string;
    user: string;
    parser: (raw: string) => T;
    temperature?: number;
  }): Promise<LlmResponse<T>> {
    const model = this.config.get<string>('LLM_MODEL', 'gpt-4o-mini');
    const inicio = Date.now();

    const resposta = await this.client.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const duracaoMs = Date.now() - inicio;
    const raw = resposta.choices[0]?.message?.content ?? '';
    const parsed = parser(raw);

    this.logger.debug(
      `LLM completar: modelo=${model}, duracao=${duracaoMs}ms, tokens=${resposta.usage?.total_tokens}`,
    );

    return {
      raw,
      parsed,
      modeloUsado: model,
      tokensUtilizados: resposta.usage?.total_tokens,
    };
  }
}
