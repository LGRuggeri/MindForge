import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';
import { ExercicioGerado, GerarExercicioDto, SubmeterTentativaDto } from './dto';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';

export interface TentativaCorrigida {
  correta: boolean;
  pontuacao: number;
  feedback: string;
}

@Injectable()
export class ExerciciosAvaliacoesService {
  private readonly logger = new Logger(ExerciciosAvaliacoesService.name);

  constructor(
    private readonly repo: ExerciciosAvaliacoesRepository,
    private readonly agentes: AgentesService,
    private readonly biblioteca: BibliotecaVivaService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
  ) {}

  async gerarExercicio(dto: GerarExercicioDto): Promise<
    | { jobId: string; status: 'enfileirado'; moduloId: string }
    | (Awaited<ReturnType<ExerciciosAvaliacoesRepository['criarExercicio']>> & {
        dica?: string;
        criterios?: string[];
      })
  > {
    if (dto.async) {
      const jobId = await this.queue.send(
        'exercicios:gerar',
        dto as unknown as Record<string, unknown>,
        { retryLimit: 2 },
      );
      if (!jobId) {
        throw new Error('Falha ao enfileirar job de geração de exercício');
      }
      this.logger.log(
        `Job de geração de exercício enfileirado: ${jobId} para módulo ${dto.moduloId}`,
      );
      return { jobId, status: 'enfileirado', moduloId: dto.moduloId };
    }

    return this.gerarExercicioSincrono(dto);
  }

  private async gerarExercicioSincrono(dto: GerarExercicioDto): Promise<
    Awaited<ReturnType<ExerciciosAvaliacoesRepository['criarExercicio']>> & {
      dica?: string;
      criterios?: string[];
    }
  > {
    const consulta = [dto.tipo, dto.dificuldade, dto.instrucoesExtras].filter(Boolean).join(' ');

    let chunks: Array<{ id: string; texto: string; similaridade: number }> = [];
    try {
      chunks = await this.biblioteca.buscar({
        consulta,
        limite: 5,
      });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.warn(`Biblioteca Viva indisponível na geração de exercício: ${mensagem}`);
    }

    const gerado = await this.agentes.executar<ExercicioGerado>({
      agente: 'evaluator',
      system: this.montarSystemPromptGeracao(dto.tipo),
      user: this.montarUserPromptGeracao(dto, chunks),
      entrada: { moduloId: dto.moduloId, tipo: dto.tipo, dificuldade: dto.dificuldade },
      parser: (raw) => this.parseJsonSeguro<ExercicioGerado>(raw),
      temperature: 0.7,
    });

    const exercicio = await this.repo.criarExercicio({
      moduloId: dto.moduloId,
      tipo: dto.tipo,
      enunciado: gerado.enunciado,
      gabarito: gerado.gabarito,
      dificuldade: dto.dificuldade ?? 'medio',
    });

    this.logger.log(`Exercício gerado: ${exercicio.id} para o módulo ${dto.moduloId}`);
    return { ...exercicio, dica: gerado.dica, criterios: gerado.criterios };
  }

  async submeterTentativa(dto: SubmeterTentativaDto): Promise<
    | { jobId: string; status: 'enfileirado'; exercicioId: string }
    | (Awaited<ReturnType<ExerciciosAvaliacoesRepository['salvarTentativa']>> & {
        feedback: string;
      })
  > {
    if (dto.async) {
      const jobId = await this.queue.send(
        'exercicios:corrigir-tentativa',
        dto as unknown as Record<string, unknown>,
        { retryLimit: 2 },
      );
      if (!jobId) {
        throw new Error('Falha ao enfileirar job de correção de tentativa');
      }
      this.logger.log(
        `Job de correção de tentativa enfileirado: ${jobId} para exercício ${dto.exercicioId}`,
      );
      return { jobId, status: 'enfileirado', exercicioId: dto.exercicioId };
    }

    return this.submeterTentativaSincrona(dto);
  }

  private async submeterTentativaSincrona(
    dto: SubmeterTentativaDto,
  ): Promise<
    Awaited<ReturnType<ExerciciosAvaliacoesRepository['salvarTentativa']>> & { feedback: string }
  > {
    const exercicio = await this.repo.buscarExercicioPorId(dto.exercicioId);
    if (!exercicio) {
      throw new NotFoundException(`Exercício ${dto.exercicioId} não encontrado`);
    }

    const numeroTentativa = await this.repo.contarTentativasPorExercicio(dto.exercicioId);

    const correcao = await this.corrigirResposta(exercicio.tipo, exercicio, dto.respostaUsuario);

    const tentativa = await this.repo.salvarTentativa({
      exercicioId: dto.exercicioId,
      respostaUsuario: dto.respostaUsuario,
      correta: correcao.correta,
      pontuacao: String(correcao.pontuacao),
      feedbackIa: correcao.feedback,
      tentativaNumero: numeroTentativa + 1,
    });

    if (dto.perfilId && exercicio.moduloId) {
      await this.atualizarProgressoPorExercicio(
        exercicio.moduloId,
        dto.perfilId,
        correcao.pontuacao,
        dto.exercicioId,
      );
    }

    this.logger.log(`Tentativa salva: ${tentativa.id} para o exercício ${dto.exercicioId}`);
    return { ...tentativa, feedback: correcao.feedback };
  }

  async listarPorModulo(moduloId: string) {
    return this.repo.listarExerciciosPorModulo(moduloId);
  }

  async estatisticasPorExercicio(exercicioId: string) {
    return this.repo.calcularEstatisticasPorExercicio(exercicioId);
  }

  private async corrigirResposta(
    tipo: string,
    exercicio: { enunciado: string; gabarito: string | null },
    respostaUsuario: string,
  ): Promise<TentativaCorrigida> {
    if (tipo === 'questao_objetiva' && exercicio.gabarito) {
      const normalizado = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
      const correta = normalizado(respostaUsuario) === normalizado(exercicio.gabarito);
      return {
        correta,
        pontuacao: correta ? 10 : 0,
        feedback: correta ? 'Resposta correta!' : `Resposta incorreta. ${exercicio.gabarito}`,
      };
    }

    return this.agentes.executar<TentativaCorrigida>({
      agente: 'evaluator',
      system: this.montarSystemPromptCorrecao(tipo),
      user: this.montarUserPromptCorrecao(exercicio, respostaUsuario),
      entrada: { tipo, enunciado: exercicio.enunciado, resposta: respostaUsuario },
      parser: (raw) => this.parseJsonSeguro<TentativaCorrigida>(raw),
      temperature: 0.5,
    });
  }

  private async atualizarProgressoPorExercicio(
    moduloId: string,
    perfilId: string,
    pontuacao: number,
    exercicioId: string,
  ) {
    if (pontuacao < 7) {
      return;
    }

    const nivel = pontuacao >= 9 ? 'dominado' : 'praticando';
    try {
      await this.knowledgeGraph.marcarProgressoPorModulo(moduloId, perfilId, nivel);
      this.logger.log(
        `Progresso do knowledge graph atualizado para o perfil ${perfilId} pelo exercício ${exercicioId} (nota ${pontuacao}, nível ${nivel})`,
      );
    } catch (erro) {
      this.logger.error(
        `Falha ao atualizar progresso do knowledge graph pelo exercício ${exercicioId}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }
  }

  private montarSystemPromptGeracao(tipo: string): string {
    return `Você é o agente evaluator do MindForge. Gere um exercício de estudo no formato JSON.

Regras:
1. O exercício deve ser adequado ao tipo informado: ${tipo}.
2. Para questão objetiva, forneça uma resposta curta e exata em "gabarito".
3. Para dissertação/código/projeto, forneça critérios de avaliação em "criterios".
4. Use os materiais da Biblioteca Viva como base, mas não invente informações.
5. Retorne APENAS um objeto JSON válido, sem markdown.

Formato obrigatório:
{
  "enunciado": "string",
  "gabarito": "string (opcional)",
  "dica": "string (opcional)",
  "criterios": ["string"] (para dissertativa/código/projeto)
}`;
  }

  private montarUserPromptGeracao(
    dto: GerarExercicioDto,
    chunks: Array<{ texto: string; similaridade: number }>,
  ): string {
    const chunksTexto =
      chunks.length > 0
        ? chunks
            .map(
              (c, i) =>
                `--- Chunk ${i + 1} (similaridade ${c.similaridade.toFixed(3)}) ---\n${c.texto}`,
            )
            .join('\n\n')
        : 'Nenhum material relevante encontrado na Biblioteca Viva.';

    return `Módulo: ${dto.moduloId}
Tipo de exercício: ${dto.tipo}
Dificuldade: ${dto.dificuldade ?? 'medio'}
${dto.instrucoesExtras ? `Instruções extras: ${dto.instrucoesExtras}\n` : ''}
Materiais recuperados da Biblioteca Viva:
${chunksTexto}

Gere o exercício no formato JSON especificado.`;
  }

  private montarSystemPromptCorrecao(tipo: string): string {
    return `Você é o agente evaluator do MindForge. Corrija a resposta de um exercício do tipo "${tipo}".

Regras:
1. Avalie com base no enunciado e gabarito/critérios fornecidos.
2. Seja justo: respostas equivalentes semanticamente devem ser consideradas corretas.
3. Forneça feedback construtivo e específico.
4. Retorne APENAS um objeto JSON válido, sem markdown.

Formato obrigatório:
{
  "correta": boolean,
  "pontuacao": number (0 a 10),
  "feedback": "string"
}`;
  }

  private montarUserPromptCorrecao(
    exercicio: { enunciado: string; gabarito: string | null },
    respostaUsuario: string,
  ): string {
    return `Enunciado: ${exercicio.enunciado}
Gabarito/critérios: ${exercicio.gabarito ?? 'Não informado'}
Resposta do aluno: ${respostaUsuario}

Corrija no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    const limpo = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(limpo) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Evaluator', raw);
      throw new Error('O agente Evaluator retornou uma resposta inválida');
    }
  }
}
