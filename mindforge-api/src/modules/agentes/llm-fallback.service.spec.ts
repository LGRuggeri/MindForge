import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmFallbackService } from './llm-fallback.service';

jest.mock('openai');

const criarConfigService = (vals: Record<string, string | undefined>) =>
  ({
    get: jest.fn((key: string, defaultValue?: string) => vals[key] ?? defaultValue),
    getOrThrow: jest.fn((key: string) => {
      const value = vals[key];
      if (!value) throw new Error(`Missing ${key}`);
      return value;
    }),
  }) as unknown as ConfigService;

const criarMockClient = (response: { content?: string; usage?: { total_tokens?: number } }) => ({
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{ message: { content: response.content ?? '' } }],
        usage: response.usage,
      }),
    },
  },
});

describe('LlmFallbackService', () => {
  let service: LlmFallbackService;
  const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

  beforeEach(() => {
    MockedOpenAI.mockClear();
  });

  it('deve usar o provedor primário quando ele funciona', async () => {
    const config = criarConfigService({
      LLM_API_KEY: 'primary-key',
      OPENAI_BASE_URL: 'https://primary.com/v1',
      LLM_MODEL: 'primary-model',
    });
    service = new LlmFallbackService(config);

    const mockClient = criarMockClient({
      content: 'resposta primária',
      usage: { total_tokens: 10 },
    });
    MockedOpenAI.mockImplementation(() => mockClient as unknown as OpenAI);

    const resposta = await service.completar({ system: 'sys', user: 'usr' });

    expect(resposta.modeloUsado).toBe('primary-model');
    expect(resposta.raw).toBe('resposta primária');
    expect(MockedOpenAI).toHaveBeenCalledTimes(1);
  });

  it('deve fazer fallback quando o provedor primário falha com erro recuperável', async () => {
    const config = criarConfigService({
      LLM_API_KEY: 'primary-key',
      LLM_MODEL: 'primary-model',
      LLM_FALLBACK_BASE_URLS: 'https://fallback.com/v1',
      LLM_FALLBACK_API_KEYS: 'fallback-key',
      LLM_FALLBACK_MODELS: 'fallback-model',
    });
    service = new LlmFallbackService(config);

    const primaryClient = criarMockClient({ content: '' });
    primaryClient.chat.completions.create.mockRejectedValueOnce(new Error('rate limit exceeded'));

    const fallbackClient = criarMockClient({
      content: 'resposta fallback',
      usage: { total_tokens: 5 },
    });

    MockedOpenAI.mockImplementation((config) => {
      if ((config as { baseURL?: string }).baseURL === 'https://fallback.com/v1') {
        return fallbackClient as unknown as OpenAI;
      }
      return primaryClient as unknown as OpenAI;
    });

    const resposta = await service.completar({ system: 'sys', user: 'usr' });

    expect(resposta.modeloUsado).toBe('fallback-model');
    expect(resposta.raw).toBe('resposta fallback');
    expect(MockedOpenAI).toHaveBeenCalledTimes(2);
  });

  it('deve lançar erro quando todos os provedores falham', async () => {
    const config = criarConfigService({
      LLM_API_KEY: 'primary-key',
      LLM_MODEL: 'primary-model',
    });
    service = new LlmFallbackService(config);

    const client = criarMockClient({ content: '' });
    client.chat.completions.create.mockRejectedValue(new Error('timeout'));
    MockedOpenAI.mockImplementation(() => client as unknown as OpenAI);

    await expect(service.completar({ system: 'sys', user: 'usr' })).rejects.toThrow(
      'Todos os provedores LLM falharam',
    );
  });
});
