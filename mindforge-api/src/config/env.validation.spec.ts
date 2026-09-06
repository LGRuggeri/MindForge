import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgres://localhost:5433/mindforge',
  LLM_API_KEY: 'chate-key',
};

describe('validateEnv — regra de IMAGE_API_KEY', () => {
  it('aceita IMAGE_API_KEY ausente quando o provedor de chat é o Gemini', () => {
    const env = validateEnv({
      ...base,
      OPENAI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });

    expect(env.IMAGE_API_KEY).toBeUndefined();
  });

  it('aceita OPENAI_BASE_URL do Gemini com casing variado', () => {
    expect(() =>
      validateEnv({
        ...base,
        OPENAI_BASE_URL: 'https://GenerativeLanguage.GoogleApis.com/v1beta/openai/',
      }),
    ).not.toThrow();
  });

  it('rejeita IMAGE_API_KEY ausente com provedor de chat não-Gemini', () => {
    expect(() =>
      validateEnv({ ...base, OPENAI_BASE_URL: 'https://opencode.ai/zen/go/v1' }),
    ).toThrow(/IMAGE_API_KEY/);
  });

  it('rejeita IMAGE_API_KEY ausente quando OPENAI_BASE_URL não está definida', () => {
    // Sem OPENAI_BASE_URL o default do código é um gateway não-Gemini — a
    // reutilização da chave de chat ficaria insegura.
    expect(() => validateEnv({ ...base })).toThrow(/IMAGE_API_KEY/);
  });

  it('aceita provedor não-Gemini quando IMAGE_API_KEY está definida', () => {
    expect(() =>
      validateEnv({
        ...base,
        OPENAI_BASE_URL: 'https://opencode.ai/zen/go/v1',
        IMAGE_API_KEY: 'gemini-key',
      }),
    ).not.toThrow();
  });
});
