import { lerJsonIa } from '../../common/ia/json-ia';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { RegistrarDiarioDto } from './dto/registrar-diario.dto';
import { DiarioRepository } from './diario.repository';

export interface RecomendacoesIa {
  recomendacoes: string;
  proximoFoco: string;
  ajustesSugeridos: string[];
}

@Injectable()
export class DiarioService {
  private readonly logger = new Logger(DiarioService.name);

  constructor(
    private readonly repo: DiarioRepository,
    private readonly agentes: AgentesService,
  ) {}

  async registrar(dto: RegistrarDiarioDto) {
    const data = dto.data ?? new Date().toISOString().split('T')[0];
    const moduloIds = [...new Set(dto.moduloIds ?? [])];

    if (moduloIds.length > 0) {
      const modulosDoPerfil = await this.repo.contarModulosDoPerfil(dto.perfilId, moduloIds);
      if (modulosDoPerfil !== moduloIds.length) {
        throw new BadRequestException('Um ou mais módulos não pertencem ao perfil informado');
      }
    }

    const registro = await this.repo.criar(
      {
        perfilId: dto.perfilId,
        data,
        tempoInvestidoMin: dto.tempoInvestidoMin ?? 0,
        dificuldades: dto.dificuldades ?? null,
        conquistas: dto.conquistas ?? null,
      },
      moduloIds,
    );

    if (!registro) {
      throw new Error('Falha ao criar registro diário');
    }

    const recomendacoes = await this.gerarRecomendacoes({ ...dto, data, moduloIds });
    await this.repo.atualizarRecomendacoes(registro.id, recomendacoes.recomendacoes);

    this.logger.log(`Diário registrado: ${registro.id} para perfil ${dto.perfilId}`);

    return {
      ...registro,
      recomendacoesIa: recomendacoes.recomendacoes,
      proximoFoco: recomendacoes.proximoFoco,
      ajustesSugeridos: recomendacoes.ajustesSugeridos,
    };
  }

  async listarPorPerfil(perfilId: string) {
    return this.repo.listarPorPerfil(perfilId);
  }

  private async gerarRecomendacoes(dto: RegistrarDiarioDto): Promise<RecomendacoesIa> {
    return this.agentes.executar<RecomendacoesIa>({
      agente: 'teacher',
      system: this.montarSystemPrompt(),
      user: this.montarUserPrompt(dto),
      entrada: { perfilId: dto.perfilId, data: dto.data },
      parser: (raw) => this.normalizarRecomendacoes(this.parseJsonSeguro(raw)),
      temperature: 0.7,
    });
  }

  private montarSystemPrompt(): string {
    return `Você é o Tutor IA do MindForge, responsável por acompanhar a evolução do aluno.
Analise o registro diário de estudo e produza recomendações personalizadas.

Regras:
1. Seja encorajador, mas honesto sobre o que precisa melhorar.
2. Sugira um próximo foco concreto para a próxima sessão de estudos.
3. Liste ajustes práticos (ex: técnicas, tempo, tópicos) quando fizerem sentido.
4. Retorne APENAS um objeto JSON válido, sem markdown, sem explicações adicionais.

Formato obrigatório:
{
  "recomendacoes": "string",
  "proximoFoco": "string",
  "ajustesSugeridos": ["string"]
}`;
  }

  private montarUserPrompt(dto: RegistrarDiarioDto): string {
    return `Registro diário de estudo:
- Data: ${dto.data ?? new Date().toISOString().split('T')[0]}
- Tempo investido (minutos): ${dto.tempoInvestidoMin ?? 0}
- Dificuldades: ${dto.dificuldades ?? 'Nenhuma registrada'}
- Conquistas: ${dto.conquistas ?? 'Nenhuma registrada'}
- Módulos estudados: ${this.listarModulosDoPrompt(dto.moduloIds)}

Gere recomendações no formato JSON especificado.`;
  }

  private listarModulosDoPrompt(moduloIds?: string[]): string {
    // Array vazio (deduplicação de "sem módulos") deve cair no mesmo
    // fallback de "Nenhum" que um moduloIds omitido (review Codex P2).
    return moduloIds && moduloIds.length > 0 ? moduloIds.join(', ') : 'Nenhum';
  }

  private parseJsonSeguro(raw: string): unknown {
    try {
      return lerJsonIa(raw);
    } catch {
      this.logger.error('Falha ao parsear JSON do Teacher (diário)');
      throw new Error('O agente Teacher retornou uma resposta inválida');
    }
  }

  /**
   * Sanitiza a resposta do LLM antes de usá-la: recomendacoes é obrigatória;
   * proximoFoco e ajustesSugeridos são normalizados para não derrubarem o
   * cliente quando o Teacher omite os campos (AGENTS.md §9 — validar dados
   * externos, incluindo respostas de LLM).
   */
  private normalizarRecomendacoes(parsed: unknown): RecomendacoesIa {
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('O agente Teacher retornou uma resposta inválida');
    }
    const resposta = parsed as Record<string, unknown>;
    if (typeof resposta.recomendacoes !== 'string' || resposta.recomendacoes.trim() === '') {
      throw new Error('O agente Teacher retornou uma resposta inválida');
    }
    return {
      recomendacoes: resposta.recomendacoes,
      proximoFoco: typeof resposta.proximoFoco === 'string' ? resposta.proximoFoco : '',
      ajustesSugeridos: Array.isArray(resposta.ajustesSugeridos)
        ? resposta.ajustesSugeridos.filter((ajuste): ajuste is string => typeof ajuste === 'string')
        : [],
    };
  }
}
