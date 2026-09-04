import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';
import { CriarAvaliacaoDto, SubmeterAvaliacaoDto } from './dto';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';

export interface ResultadoAvaliacaoCalculado {
  pontuacaoTotal: number;
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacoes: string[];
}

@Injectable()
export class AvaliacoesService {
  private readonly logger = new Logger(AvaliacoesService.name);

  constructor(
    private readonly repo: ExerciciosAvaliacoesRepository,
    private readonly revisao: RevisaoEspacadaService,
    private readonly knowledgeGraph: KnowledgeGraphService,
  ) {}

  async criar(dto: CriarAvaliacaoDto) {
    const avaliacao = await this.repo.criarAvaliacao({
      moduloId: dto.moduloId ?? null,
      trilhaId: dto.trilhaId ?? null,
      titulo: dto.titulo,
      tipo: dto.tipo,
    });

    if (dto.exerciciosIds && dto.exerciciosIds.length > 0) {
      await this.repo.adicionarExerciciosNaAvaliacao(
        dto.exerciciosIds.map((exercicioId, indice) => ({
          avaliacaoId: avaliacao.id,
          exercicioId,
          ordem: indice + 1,
        })),
      );
    }

    this.logger.log(`Avaliação criada: ${avaliacao.id}`);
    return this.repo.buscarAvaliacaoPorId(avaliacao.id);
  }

  async submeter(dto: SubmeterAvaliacaoDto) {
    const avaliacao = await this.repo.buscarAvaliacaoPorId(dto.avaliacaoId);
    if (!avaliacao) {
      throw new NotFoundException(`Avaliação ${dto.avaliacaoId} não encontrada`);
    }

    const tentativas = await Promise.all(
      dto.respostas.map((r) => this.repo.listarTentativasPorExercicio(r.exercicioId)),
    );

    const tentativasRecentes = tentativas.map((lista) =>
      lista.find((t) => dto.respostas.some((r) => r.tentativaId === t.id)),
    );

    const pontuacoes = tentativasRecentes
      .filter((t): t is NonNullable<typeof t> => t !== undefined)
      .map((t) => Number(t.pontuacao ?? 0));

    const pontuacaoTotal =
      pontuacoes.length === 0
        ? 0
        : Number((pontuacoes.reduce((soma, p) => soma + p, 0) / pontuacoes.length).toFixed(2));

    const exerciciosCorretos = avaliacao.exercicios.filter((_, i) =>
      tentativasRecentes[i] ? tentativasRecentes[i]?.correta : false,
    );
    const exerciciosErrados = avaliacao.exercicios.filter(
      (_, i) => !tentativasRecentes[i]?.correta,
    );

    const pontosFortes = exerciciosCorretos.map((e) => e.exercicio.enunciado);
    const pontosFracos = exerciciosErrados.map((e) => e.exercicio.enunciado);

    const recomendacoes: string[] = [];
    if (pontuacaoTotal < 6) {
      recomendacoes.push('Revisar conceitos dos exercícios errados antes de avançar.');
    }
    if (pontuacaoTotal >= 8) {
      recomendacoes.push(
        'Bom desempenho! Avance para o próximo módulo ou exercícios mais difíceis.',
      );
    }

    await Promise.all(
      avaliacao.exercicios.map((relacao) => {
        const tentativa = tentativasRecentes.find((t) => t?.exercicioId === relacao.exercicioId);
        const qualidade = this.calcularQualidade(tentativa ? Number(tentativa.pontuacao) : 0);
        return this.revisao.processarRevisao({
          itemTipo: 'exercicio',
          itemId: relacao.exercicioId,
          qualidade,
        });
      }),
    );

    const resultado = await this.repo.salvarResultadoAvaliacao({
      avaliacaoId: dto.avaliacaoId,
      pontuacaoTotal: String(pontuacaoTotal),
      pontosFortes: pontosFortes.join('\n') || null,
      pontosFracos: pontosFracos.join('\n') || null,
      recomendacoes: recomendacoes.join('\n') || null,
    });

    this.logger.log(`Avaliação submetida: ${dto.avaliacaoId} — nota ${pontuacaoTotal}`);

    if (dto.perfilId && pontuacaoTotal >= 7) {
      await this.atualizarProgressoPorAvaliacao(avaliacao, dto.perfilId, pontuacaoTotal);
    }

    return { ...resultado, pontosFortes, pontosFracos, recomendacoes };
  }

  private async atualizarProgressoPorAvaliacao(
    avaliacao: { moduloId: string | null; trilhaId: string | null },
    perfilId: string,
    pontuacaoTotal: number,
  ) {
    const nivel = pontuacaoTotal >= 9 ? 'dominado' : 'praticando';

    try {
      if (avaliacao.moduloId) {
        await this.knowledgeGraph.marcarProgressoPorModulo(avaliacao.moduloId, perfilId, nivel);
      }
      this.logger.log(
        `Progresso do knowledge graph atualizado para o perfil ${perfilId} pela avaliação (nota ${pontuacaoTotal}, nível ${nivel})`,
      );
    } catch (erro) {
      this.logger.error(
        `Falha ao atualizar progresso do knowledge graph pela avaliação`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
  }

  private calcularQualidade(pontuacao: number): number {
    if (pontuacao >= 9) return 5;
    if (pontuacao >= 7) return 4;
    if (pontuacao >= 5) return 3;
    if (pontuacao >= 3) return 2;
    return 1;
  }
}
