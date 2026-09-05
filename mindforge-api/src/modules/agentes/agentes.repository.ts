import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, getTableColumns, type SQL } from 'drizzle-orm';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { agentesExecucoes, type AgenteExecucao, type NovaAgenteExecucao } from '../../database/schema';

export type AgenteTipo =
  'planner' | 'researcher' | 'synthesizer' | 'teacher' | 'evaluator' | 'reviewer';

export type ExecucaoStatus = 'sucesso' | 'erro';

/** Listagem sem os payloads (entrada/saida) — redação de payload conforme AGENTS.md §9. */
export type AgenteExecucaoResumo = Omit<AgenteExecucao, 'entrada' | 'saida'>;

export interface FiltrosExecucoes {
  agente?: AgenteTipo;
  status?: ExecucaoStatus;
  limite: number;
  offset: number;
}

@Injectable()
export class AgentesRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async registrar(dados: Omit<NovaAgenteExecucao, 'id' | 'criadoEm'>): Promise<void> {
    await this.db.insert(agentesExecucoes).values(dados);
  }

  async listar(filtros: FiltrosExecucoes): Promise<AgenteExecucaoResumo[]> {
    const { entrada: _entrada, saida: _saida, ...colunas } = getTableColumns(agentesExecucoes);
    const condicoes: SQL[] = [];
    if (filtros.agente) {
      condicoes.push(eq(agentesExecucoes.agente, filtros.agente));
    }
    if (filtros.status) {
      condicoes.push(eq(agentesExecucoes.status, filtros.status));
    }

    return this.db
      .select(colunas)
      .from(agentesExecucoes)
      .where(condicoes.length > 0 ? and(...condicoes) : undefined)
      .orderBy(desc(agentesExecucoes.criadoEm))
      .limit(filtros.limite)
      .offset(filtros.offset);
  }

  async buscarPorId(id: string): Promise<AgenteExecucao | undefined> {
    const [execucao] = await this.db
      .select()
      .from(agentesExecucoes)
      .where(eq(agentesExecucoes.id, id))
      .limit(1);
    return execucao;
  }
}
