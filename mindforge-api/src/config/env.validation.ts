import { z } from 'zod';

/**
 * Toda variável de ambiente é validada na borda, na inicialização do
 * processo — falhar rápido e alto em vez de deixar um `undefined` se
 * propagar silenciosamente até uma query.
 */
export const envSchema = z
  .object({
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
    // Provedor de busca web: 'duckduckgo' (scraping gratuito), 'api' (Bearer generico) ou 'serper' (header X-API-KEY).
    SEARCH_PROVIDER: z.enum(['duckduckgo', 'api', 'serper']).default('duckduckgo'),
    SEARCH_API_KEY: z.string().min(1).optional(),
    SEARCH_API_URL: z.string().url().optional(),
    SEARCH_TIMEOUT_MS: z.coerce.number().int().min(1).max(60000).default(10000),
    // Fallback de provedores LLM compatíveis com OpenAI. Listas separadas por vírgula,
    // na mesma ordem: primeiro endpoint, depois apiKey, depois model.
    LLM_FALLBACK_BASE_URLS: z.string().optional(),
    LLM_FALLBACK_API_KEYS: z.string().optional(),
    LLM_FALLBACK_MODELS: z.string().optional(),
    // URL do frontend para configuração de CORS. Opcional; default é http://localhost:3001.
    FRONTEND_URL: z.string().url().optional(),
    // Provedor de geração de imagens (módulo midia). Modelo, chave e URL podem ser
    // distintos do chat — gemini-3.6-flash é texto-only e a família de imagem tem
    // model ID próprio (verificado via endpoint de models, pode ser renomeado pela
    // Google). A regra de quando IMAGE_API_KEY é opcional está no superRefine do
    // schema abaixo (e reforçada em ImageService.resolverChave).
    IMAGE_MODEL: z.string().default('gemini-3.1-flash-image'),
    IMAGE_API_KEY: z.string().min(1).optional(),
    IMAGE_BASE_URL: z.string().url().default('https://generativelanguage.googleapis.com/v1beta'),
    // Provedor de TTS do módulo midia. 'edge-tts' usa as vozes neurais do
    // Microsoft Edge Read Aloud (gratuito, sem chave). Interface pronta para
    // provedores futuros (ex.: 'kokoro' local).
    AUDIO_PROVIDER: z.string().default('edge-tts'),
    // Diretório do cache de mídias geradas (imagens e áudios).
    MIDIA_DIR: z.string().default('./data/midias'),
    SANDBOX_ENABLED: z.enum(['true', 'false']).default('false'),
    SANDBOX_TEMPO_MS: z.coerce.number().int().min(500).max(10000).default(5000),
    SANDBOX_PYTHON_IMAGE: z
      .string()
      .regex(/^[a-z0-9][a-z0-9/_.:@-]+$/)
      .default('python:3.13-slim-bookworm'),
    SANDBOX_JAVASCRIPT_IMAGE: z
      .string()
      .regex(/^[a-z0-9][a-z0-9/_.:@-]+$/)
      .default('node:22-bookworm-slim'),
    // URL pública da API, usada para montar links de imagem no Markdown do conteúdo.
    API_PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  })
  .superRefine((env, ctx) => {
    // IMAGE_API_KEY só pode ser omitida quando o provedor de chat já é o Gemini
    // (mesma chave serve para a API de imagem); com qualquer outro provedor,
    // reutilizar LLM_API_KEY enviaria a chave de terceiros ao Google (ver ADR do
    // módulo midia e ImageService.resolverChave, que reforça a mesma regra).
    const chatEhGemini = (env.OPENAI_BASE_URL ?? '')
      .toLowerCase()
      .includes('generativelanguage.googleapis.com');
    if (!env.IMAGE_API_KEY && !chatEhGemini) {
      ctx.addIssue({
        code: 'custom',
        path: ['IMAGE_API_KEY'],
        message:
          'obrigatória quando o provedor de chat não é o Gemini ' +
          '(OPENAI_BASE_URL não aponta para generativelanguage.googleapis.com)',
      });
    }
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
