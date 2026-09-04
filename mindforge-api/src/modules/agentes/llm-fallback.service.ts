import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface LlmProviderConfig {
  baseURL?: string;
  apiKey: string;
  model: string;
}

export interface LlmFallbackResponse {
  raw: string;
  modeloUsado: string;
  tokensUtilizados?: number;
  provedorIndex: number;
}

/**
 * Wrapper que permite fallback entre múltiplos provedores compatíveis
 * com a API OpenAI. Útil quando o provedor principal atinge limite de uso
 * ou fica indisponível.
 */
@Injectable()
export class LlmFallbackService {
  private readonly logger = new Logger(LlmFallbackService.name);

  constructor(private readonly config: ConfigService) {}

  private get providers(): LlmProviderConfig[] {
    const baseURLs = this.parseLista(this.config.get<string>('LLM_FALLBACK_BASE_URLS'));
    const apiKeys = this.parseLista(this.config.get<string>('LLM_FALLBACK_API_KEYS'));
    const models = this.parseLista(this.config.get<string>('LLM_FALLBACK_MODELS'));

    const primario: LlmProviderConfig = {
      baseURL: this.config.get<string>('OPENAI_BASE_URL') ?? undefined,
      apiKey: this.config.getOrThrow<string>('LLM_API_KEY'),
      model: this.config.get<string>('LLM_MODEL', 'gpt-4o-mini'),
    };

    const fallback: LlmProviderConfig[] = [];
    const count = Math.max(baseURLs.length, apiKeys.length, models.length);
    for (let i = 0; i < count; i++) {
      const apiKey = apiKeys[i];
      if (!apiKey) continue;
      fallback.push({
        baseURL: baseURLs[i] || undefined,
        apiKey,
        model: models[i] || primario.model,
      });
    }

    return [primario, ...fallback];
  }

  async completar({
    system,
    user,
    temperature = 0.7,
  }: {
    system: string;
    user: string;
    temperature?: number;
  }): Promise<LlmFallbackResponse> {
    const providers = this.providers;
    const erros: string[] = [];

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      try {
        const client = new OpenAI({
          apiKey: provider.apiKey,
          ...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
        });

        const inicio = Date.now();
        const resposta = await client.chat.completions.create({
          model: provider.model,
          temperature,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        });
        const duracaoMs = Date.now() - inicio;

        const raw = resposta.choices[0]?.message?.content ?? '';
        this.logger.debug(
          `LLM provedor ${i}: modelo=${provider.model}, duracao=${duracaoMs}ms, tokens=${resposta.usage?.total_tokens}`,
        );

        return {
          raw,
          modeloUsado: provider.model,
          tokensUtilizados: resposta.usage?.total_tokens,
          provedorIndex: i,
        };
      } catch (erro) {
        const mensagem = erro instanceof Error ? erro.message : String(erro);
        erros.push(`provedor ${i} (${provider.model}): ${mensagem}`);
        this.logger.warn(`Falha no provedor LLM ${i} (${provider.model}): ${mensagem}`);

        if (!this.isRetryable(erro)) {
          this.logger.warn(`Erro não recuperável no provedor ${i}; pulando fallbacks`);
          break;
        }
      }
    }

    throw new Error(`Todos os provedores LLM falharam. Detalhes: ${erros.join('; ')}`);
  }

  private parseLista(valor?: string): string[] {
    if (!valor) return [];
    return valor
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private isRetryable(erro: unknown): boolean {
    if (!(erro instanceof Error)) return false;
    const msg = erro.message.toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('timeout') ||
      msg.includes('connect') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('504') ||
      msg.includes('429') ||
      msg.includes('fetch failed')
    );
  }
}
