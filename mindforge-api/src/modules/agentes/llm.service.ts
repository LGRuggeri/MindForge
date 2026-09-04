import { Injectable, Logger } from '@nestjs/common';
import { LlmFallbackService } from './llm-fallback.service';

export interface LlmResponse<T> {
  raw: string;
  parsed: T;
  modeloUsado: string;
  tokensUtilizados?: number;
}

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly fallback: LlmFallbackService) {}

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
    const inicio = Date.now();

    const resposta = await this.fallback.completar({
      system,
      user,
      temperature,
    });

    const duracaoMs = Date.now() - inicio;
    const parsed = parser(resposta.raw);

    this.logger.debug(
      `LLM completar: modelo=${resposta.modeloUsado}, duracao=${duracaoMs}ms, tokens=${resposta.tokensUtilizados}`,
    );

    return {
      raw: resposta.raw,
      parsed,
      modeloUsado: resposta.modeloUsado,
      tokensUtilizados: resposta.tokensUtilizados,
    };
  }
}
