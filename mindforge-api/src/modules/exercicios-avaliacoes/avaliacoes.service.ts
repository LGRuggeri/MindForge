import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';
import { CriarAvaliacaoDto, SubmeterAvaliacaoDto, TipoAvaliacao } from './dto';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';

export interface ResultadoAvaliacaoCalculado {
  pontuacaoTotal: number;
  pontosFortes: string[];
  pontosFracos: string[];
  recomendacoes: string[];
}

const QUANTIDADE_PADRAO_SIMULADO = 10;

@Injectable()
export class AvaliacoesService {
  private readonly logger = new Logger(AvaliacoesService.name);

  constructor(
    private readonly repo: ExerciciosAvaliacoesRepository,
    private readonly revisao: RevisaoEspacadaService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async buscarPorId(id: string) {
    const avaliacao = await this.repo.buscarAvaliacaoPorId(id);
    if (!avaliacao) {
      throw new NotFoundException(`Avaliação ${id} não encontrada`);
    }
    return avaliacao;
  }

  async criar(dto: CriarAvaliacaoDto) {
    const exerciciosIds = await this.resolverExerciciosParaAvaliacao(dto);

    const { avaliacaoId } = await this.repo.criarAvaliacaoComExercicios(
      {
        moduloId: dto.moduloId ?? null,
        trilhaId: dto.trilhaId ?? null,
        titulo: dto.titulo,
        tipo: dto.tipo,
      },
      exerciciosIds,
    );

    this.logger.log(`Avaliação criada: ${avaliacaoId} (${dto.tipo})`);
    return this.repo.buscarAvaliacaoPorId(avaliacaoId);
  }

  private async resolverExerciciosParaAvaliacao(dto: CriarAvaliacaoDto): Promise<string[]> {
    if (dto.exerciciosIds && dto.exerciciosIds.length > 0) {
      return dto.exerciciosIds;
    }

    if (dto.tipo !== TipoAvaliacao.SIMULADO) {
      return [];
    }

    if (!dto.moduloId && !dto.trilhaId) {
      throw new BadRequestException(
        'Simulado deve receber exerciciosIds ou estar vinculado a um módulo/trilha com exercícios.',
      );
    }

    const candidatos = dto.moduloId
      ? await this.repo.listarExerciciosPorModulo(dto.moduloId)
      : await this.repo.listarExerciciosPorTrilha(dto.trilhaId!);

    if (candidatos.length === 0) {
      return [];
    }

    const embaralhados = [...candidatos].sort(() => Math.random() - 0.5);
    const quantidade = dto.quantidade ?? QUANTIDADE_PADRAO_SIMULADO;
    return embaralhados.slice(0, Math.min(quantidade, candidatos.length)).map((e) => e.id);
  }

  async submeter(dto: SubmeterAvaliacaoDto) {
    const avaliacao = await this.repo.buscarAvaliacaoPorId(dto.avaliacaoId);
    if (!avaliacao) {
      throw new NotFoundException(`Avaliação ${dto.avaliacaoId} não encontrada`);
    }

    const donoId =
      avaliacao.modulo?.trilha?.objetivo?.perfilId ?? avaliacao.trilha?.objetivo?.perfilId;
    if (!donoId) {
      throw new BadRequestException('Avaliação não possui perfil proprietário');
    }
    if (donoId !== dto.perfilId) {
      throw new ForbiddenException('Avaliação não pertence ao perfil informado');
    }

    const resultadoExistente = await this.repo.buscarResultadoPorAvaliacaoEPerfil(
      dto.avaliacaoId,
      dto.perfilId,
    );
    if (resultadoExistente) {
      this.logger.warn(
        `Avaliação ${dto.avaliacaoId} já foi submetida pelo perfil ${dto.perfilId}; retornando resultado existente`,
      );
      return this.normalizarResultadoExistente(resultadoExistente);
    }

    const exerciciosIdsValidos = new Set(
      avaliacao.exercicios.map((relacao) => relacao.exercicioId),
    );

    const respostasInvalidas = dto.respostas.filter(
      (r) => !exerciciosIdsValidos.has(r.exercicioId),
    );
    if (respostasInvalidas.length > 0) {
      this.logger.warn(
        `Avaliação ${dto.avaliacaoId} recebeu ${respostasInvalidas.length} resposta(s) com exercício(s) não vinculado(s)`,
      );
    }

    const tentativasPorExercicio = await Promise.all(
      avaliacao.exercicios.map((relacao) =>
        this.repo.listarTentativasPorExercicioEAvaliacao(
          relacao.exercicioId,
          dto.avaliacaoId,
          dto.perfilId!,
        ),
      ),
    );

    const mapaTentativas = new Map<string, (typeof tentativasPorExercicio)[0][0]>();
    avaliacao.exercicios.forEach((relacao, indice) => {
      const resposta = dto.respostas.find((r) => r.exercicioId === relacao.exercicioId);
      if (!resposta) {
        return;
      }
      const tentativa = tentativasPorExercicio[indice].find((t) => t.id === resposta.tentativaId);
      if (tentativa) {
        mapaTentativas.set(relacao.exercicioId, tentativa);
      }
    });

    let somaPontuacoes = 0;
    const pontosFortes: string[] = [];
    const pontosFracos: string[] = [];

    for (const relacao of avaliacao.exercicios) {
      const tentativa = mapaTentativas.get(relacao.exercicioId);
      const pontuacao = tentativa ? Number(tentativa.pontuacao ?? 0) : 0;
      somaPontuacoes += pontuacao;

      if (tentativa?.correta) {
        pontosFortes.push(relacao.exercicio.enunciado);
      } else {
        pontosFracos.push(relacao.exercicio.enunciado);
      }
    }

    const totalExercicios = avaliacao.exercicios.length;
    const pontuacaoTotal =
      totalExercicios === 0 ? 0 : Number((somaPontuacoes / totalExercicios).toFixed(2));

    const recomendacoes: string[] = [];
    if (pontuacaoTotal < 6) {
      recomendacoes.push('Revisar conceitos dos exercícios errados antes de avançar.');
    }
    if (pontuacaoTotal >= 8) {
      recomendacoes.push(
        'Bom desempenho! Avance para o próximo módulo ou exercícios mais difíceis.',
      );
    }

    const { resultado, duplicata } = await this.db.transaction(async (tx) => {
      const salvo = await this.repo.salvarResultadoAvaliacao(
        {
          perfilId: dto.perfilId!,
          avaliacaoId: dto.avaliacaoId,
          pontuacaoTotal: String(pontuacaoTotal),
          pontosFortes: this.serializarLista(pontosFortes),
          pontosFracos: this.serializarLista(pontosFracos),
          recomendacoes: this.serializarLista(recomendacoes),
        },
        tx,
      );

      if (!salvo) {
        const existente = await this.repo.buscarResultadoPorAvaliacaoEPerfil(
          dto.avaliacaoId,
          dto.perfilId,
          tx,
        );
        return { resultado: existente, duplicata: true };
      }

      await Promise.all(
        avaliacao.exercicios.map((relacao) => {
          const tentativa = mapaTentativas.get(relacao.exercicioId);
          const qualidade = this.calcularQualidade(tentativa ? Number(tentativa.pontuacao) : 0);
          return this.revisao.processarRevisao(
            {
              perfilId: dto.perfilId!,
              itemTipo: 'exercicio',
              itemId: relacao.exercicioId,
              qualidade,
            },
            tx,
          );
        }),
      );

      return { resultado: salvo, duplicata: false };
    });

    if (duplicata) {
      this.logger.warn(
        `Avaliação ${dto.avaliacaoId} já foi submetida concorrentemente pelo perfil ${dto.perfilId}; retornando resultado existente`,
      );
      if (!resultado) {
        throw new Error('Resultado da avaliação não encontrado após conflito de inserção');
      }
      return this.normalizarResultadoExistente(resultado);
    }

    this.logger.log(`Avaliação submetida: ${dto.avaliacaoId} — nota ${pontuacaoTotal}`);

    if (dto.perfilId && pontuacaoTotal >= 7) {
      await this.atualizarProgressoPorAvaliacao(avaliacao, dto.perfilId, pontuacaoTotal);
    }

    return { ...resultado, pontosFortes, pontosFracos, recomendacoes };
  }

  private async atualizarProgressoPorAvaliacao(
    avaliacao: {
      id: string;
      tipo: string;
      moduloId: string | null;
      trilhaId: string | null;
      exercicios: Array<{ exercicio: { moduloId: string | null } }>;
    },
    perfilId: string,
    pontuacaoTotal: number,
  ) {
    const nivel = pontuacaoTotal >= 9 ? 'dominado' : 'praticando';

    try {
      const moduloIds = new Set<string>();

      if (avaliacao.moduloId) {
        moduloIds.add(avaliacao.moduloId);
      }

      for (const relacao of avaliacao.exercicios) {
        if (relacao.exercicio.moduloId) {
          moduloIds.add(relacao.exercicio.moduloId);
        }
      }

      for (const moduloId of moduloIds) {
        await this.knowledgeGraph.marcarProgressoPorModulo(moduloId, perfilId, nivel);
      }

      this.logger.log(
        `Progresso do knowledge graph atualizado para o perfil ${perfilId} pela avaliação ${avaliacao.id} (nota ${pontuacaoTotal}, nível ${nivel}, módulos: ${moduloIds.size})`,
      );
    } catch (erro) {
      this.logger.error(
        `Falha ao atualizar progresso do knowledge graph pela avaliação`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
  }

  private normalizarResultadoExistente(resultado: {
    pontuacaoTotal: string | number;
    pontosFortes: string | null;
    pontosFracos: string | null;
    recomendacoes: string | null;
  }) {
    return {
      ...resultado,
      pontosFortes: this.desserializarLista(resultado.pontosFortes),
      pontosFracos: this.desserializarLista(resultado.pontosFracos),
      recomendacoes: this.desserializarLista(resultado.recomendacoes),
    };
  }

  private serializarLista(itens: string[]): string | null {
    return itens.length > 0 ? JSON.stringify(itens) : null;
  }

  private desserializarLista(valor: string | null): string[] {
    if (!valor) {
      return [];
    }
    try {
      const parsed: unknown = JSON.parse(valor);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed;
      }
    } catch {
      // Formato legado: itens separados por quebras de linha.
    }
    return valor.split('\n');
  }

  private calcularQualidade(pontuacao: number): number {
    if (pontuacao >= 9) return 5;
    if (pontuacao >= 7) return 4;
    if (pontuacao >= 5) return 3;
    if (pontuacao >= 3) return 2;
    return 1;
  }
}
