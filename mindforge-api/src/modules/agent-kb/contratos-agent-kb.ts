import { z } from 'zod';

// Contratos do CLI Python: recibos de escrita não são registros completos.
export const projetoSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    slug: z.string(),
    core_objective: z.string(),
    status: z.string(),
  })
  .transform(({ core_objective, ...projeto }) => ({ ...projeto, coreObjective: core_objective }));

export const reciboSchema = z.object({ id: z.string().min(1), status: z.literal('created') });

const itemContextoSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    level: z.string().optional(),
    type: z.string().optional(),
    node_type: z.string().optional(),
    importance: z.string().optional(),
    tokens: z.number().int().nonnegative(),
  })
  .transform(({ type, ...item }) => ({ ...item, node_type: item.node_type ?? type }));

export const contextoSchema = z.object({
  query: z.string(),
  project_id: z.string(),
  token_budget: z.number().int().nonnegative(),
  tokens_used: z.number().int().nonnegative(),
  latency_ms: z.number().nonnegative(),
  semantic_enabled: z.boolean(),
  pack: z.object({
    rules: z.array(itemContextoSchema),
    skills: z.array(itemContextoSchema),
    memory: z.array(itemContextoSchema),
    mcp_tools: z.array(itemContextoSchema),
  }),
});

export const buscaSchema = z
  .object({
    results: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        summary: z.string(),
        node_type: z.string().optional(),
        final_score: z.number(),
      }),
    ),
  })
  .transform(({ results }) =>
    results.map(({ final_score, ...item }) => ({
      ...item,
      domain: 'memory',
      score: final_score,
    })),
  );
