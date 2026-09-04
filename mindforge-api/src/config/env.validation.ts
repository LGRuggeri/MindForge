import { z } from 'zod';

/**
 * Toda variável de ambiente é validada na borda, na inicialização do
 * processo — falhar rápido e alto em vez de deixar um `undefined` se
 * propagar silenciosamente até uma query.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  LLM_API_KEY: z.string().min(1),
  OPENAI_BASE_URL: z.string().url().optional(),
  LLM_MODEL: z.string().default('gpt-4o-mini'),
  // Provedor de embeddings pode ser diferente do provedor de chat (ex:
  // OPENAI_BASE_URL aponta para um gateway que só serve chat completions).
  // Se omitidos, caem em LLM_API_KEY / sem baseURL (OpenAI oficial).
  EMBEDDING_API_KEY: z.string().min(1).optional(),
  EMBEDDING_BASE_URL: z.string().url().optional(),
  // Caminho para o script agent_kb.py e slug do projeto de contexto.
  // Opcional: quando ausente, o agent_kb não é consultado.
  AGENT_KB_SCRIPT_PATH: z.string().min(1).optional(),
  AGENT_KB_PROJECT_ID: z.string().min(1).optional(),
  AGENT_KB_ENABLED: z.enum(['true', 'false']).default('false'),
  // Provedor de busca web: 'duckduckgo' (scraping gratuito) ou 'api' (Serper, Tavily, Brave, etc).
  SEARCH_PROVIDER: z.enum(['duckduckgo', 'api']).default('duckduckgo'),
  SEARCH_API_KEY: z.string().min(1).optional(),
  SEARCH_API_URL: z.string().url().optional(),
  // Fallback de provedores LLM compatíveis com OpenAI. Listas separadas por vírgula,
  // na mesma ordem: primeiro endpoint, depois apiKey, depois model.
  LLM_FALLBACK_BASE_URLS: z.string().optional(),
  LLM_FALLBACK_API_KEYS: z.string().optional(),
  LLM_FALLBACK_MODELS: z.string().optional(),
  // URL do frontend para configuração de CORS. Opcional; default é http://localhost:3001.
  FRONTEND_URL: z.string().url().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new Error(
      `Configuração de ambiente inválida:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}
