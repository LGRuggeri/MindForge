import { Inject, Injectable, Logger } from '@nestjs/common';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { agentesExecucoes, NovaAgenteExecucao } from '../../database/schema';
import { LlmService } from './llm.service';

export type AgenteTipo =
  'planner' | 'researcher' | 'synthesizer' | 'teacher' | 'evaluator' | 'reviewer';

export interface ExecutarAgenteOptions<T> {
  agente: AgenteTipo;
  system: string;
  user: string;
  entrada: Record<string, unknown>;
  parser: (raw: string) => T;
  temperature?: number;
}

@Injectable()
export class AgentesService {
  private readonly logger = new Logger(AgentesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly llm: LlmService,
  ) {}

  /**
   * Executa um agente no LLM, registra a execução em `agentes_execucoes` e
   * retorna o resultado parseado. Qualquer erro é convertido para registro de
   * falha e relançado — o chamador decide como tratar.
   */
  async executar<T>(options: ExecutarAgenteOptions<T>): Promise<T> {
    const { agente, system, user, entrada, parser, temperature } = options;
    const inicio = Date.now();

    try {
      const resposta = await this.llm.completar({
        system,
        user,
        parser,
        temperature,
      });

      const duracaoMs = Date.now() - inicio;

      await this.registrar({
        agente,
        entrada,
        saida: { resultado: resposta.parsed, raw: resposta.raw },
        modeloUsado: resposta.modeloUsado,
        tokensUtilizados: resposta.tokensUtilizados,
        duracaoMs,
        status: 'sucesso',
      });

      return resposta.parsed;
    } catch (erro) {
      const duracaoMs = Date.now() - inicio;
      const mensagem = erro instanceof Error ? erro.message : String(erro);

      this.logger.error(
        `Agente ${agente} falhou: ${mensagem}`,
        erro instanceof Error ? erro.stack : undefined,
      );

      await this.registrar({
        agente,
        entrada,
        saida: undefined,
        modeloUsado: undefined,
        tokensUtilizados: undefined,
        duracaoMs,
        status: 'erro',
        erroMensagem: mensagem,
      });

      throw erro;
    }
  }

  private async registrar(dados: Omit<NovaAgenteExecucao, 'id' | 'criadoEm'>): Promise<void> {
    await this.db.insert(agentesExecucoes).values(dados);
  }
}
