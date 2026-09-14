import { validateEnv } from './env.validation';

const base = {
  DATABASE_URL: 'postgres://localhost:5433/mindforge',
  LLM_API_KEY: 'chate-key',
};

describe('validateEnv — sandbox local', () => {
  const valido = { ...base, IMAGE_API_KEY: 'imagem-teste' };
  it('fica desativado por padrão com cinco segundos de limite', () => {
    expect(validateEnv(valido)).toMatchObject({ SANDBOX_ENABLED: 'false', SANDBOX_TEMPO_MS: 5000 });
    expect(
      validateEnv({ ...valido, SANDBOX_ENABLED: 'true', SANDBOX_TEMPO_MS: '2000' }),
    ).toMatchObject({ SANDBOX_ENABLED: 'true', SANDBOX_TEMPO_MS: 2000 });
  });
  it.each([0, 499, 10001, 1.5, 'inválido'])('recusa timeout %s', (tempo) => {
    expect(() => validateEnv({ ...valido, SANDBOX_TEMPO_MS: tempo })).toThrow('SANDBOX_TEMPO_MS');
  });
  it.each(['--privileged', 'imagem; comando', ' imagem', ''])(
    'recusa referência de imagem inválida %s',
    (imagem) => {
      expect(() => validateEnv({ ...valido, SANDBOX_PYTHON_IMAGE: imagem })).toThrow(
        'SANDBOX_PYTHON_IMAGE',
      );
    },
  );
});

describe('validateEnv — timeout de busca', () => {
  const valido = { ...base, IMAGE_API_KEY: 'imagem-teste' };
  it('usa dez segundos por padrão e aceita valores configurados', () => {
    expect(validateEnv(valido).SEARCH_TIMEOUT_MS).toBe(10000);
    expect(validateEnv({ ...valido, SEARCH_TIMEOUT_MS: '2500' }).SEARCH_TIMEOUT_MS).toBe(2500);
  });
  it.each([0, -1, 60001, 1.5, 'inválido'])('rejeita timeout inválido %s', (tempo) => {
    expect(() => validateEnv({ ...valido, SEARCH_TIMEOUT_MS: tempo })).toThrow('SEARCH_TIMEOUT_MS');
  });
});

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
