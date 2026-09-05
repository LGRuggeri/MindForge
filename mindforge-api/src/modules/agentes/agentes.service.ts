import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AgentesRepository,
  type AgenteExecucaoResumo,
  type AgenteTipo,
  type FiltrosExecucoes,
} from './agentes.repository';
import { LlmService } from './llm.service';

export type { AgenteTipo } from './agentes.repository';

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
    private readonly repo: AgentesRepository,
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

      await this.repo.registrar({
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

      await this.repo.registrar({
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

  listar(filtros: FiltrosExecucoes): Promise<AgenteExecucaoResumo[]> {
    return this.repo.listar(filtros);
  }

  async buscarPorId(id: string) {
    const execucao = await this.repo.buscarPorId(id);
    if (!execucao) {
      throw new NotFoundException(`Execução ${id} não encontrada`);
    }
    return execucao;
  }
}
