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
