import {
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { lerJsonIa, validarRespostaIa } from '../../common/ia/json-ia';
import { exercicioGeradoSchema } from '../../common/ia/contratos-ia';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { PlannerService } from '../planner/planner.service';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';
import { ExercicioGerado, GerarExercicioDto, SubmeterTentativaDto } from './dto';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';

export interface TentativaCorrigida {
  correta: boolean;
  pontuacao: number;
  feedback: string;
}

const tentativaCorrigidaSchema = z.object({
  correta: z.boolean(),
  pontuacao: z.number().min(0).max(10),
  feedback: z.string(),
});

@Injectable()
export class ExerciciosAvaliacoesService {
  private readonly logger = new Logger(ExerciciosAvaliacoesService.name);

  constructor(
    private readonly repo: ExerciciosAvaliacoesRepository,
    private readonly agentes: AgentesService,
    private readonly biblioteca: BibliotecaVivaService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    private readonly planner: PlannerService,
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
  ) {}

  async gerarExercicio(dto: GerarExercicioDto): Promise<
    | { jobId: string; status: 'enfileirado'; moduloId: string }
    | (Awaited<ReturnType<ExerciciosAvaliacoesRepository['criarExercicio']>> & {
        dica?: string;
        criterios?: string[] | null;
      })
  > {
    if (dto.async) {
      const jobId = await this.queue.send(
        'exercicios.gerar',
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
      criterios?: string[] | null;
    }
  > {
    const modulo = await this.planner.buscarModuloPorId(dto.moduloId);

    const termos = [
      modulo.titulo,
      modulo.objetivoAprendizagem ?? '',
      dto.tipo,
      dto.dificuldade,
      dto.instrucoesExtras,
    ].filter(Boolean);
    const consulta = termos.join(' ');

    let chunks: Array<{ id: string; texto: string; similaridade: number }> = [];
    try {
      chunks = await this.biblioteca.buscar({
        consulta,
        moduloId: dto.moduloId,
        limite: 5,
      });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.warn(`Biblioteca Viva indisponível na geração de exercício: ${mensagem}`);
    }

    const gerado = await this.agentes.executar<ExercicioGerado>({
      agente: 'evaluator',
      system: this.montarSystemPromptGeracao(dto.tipo),
      user: this.montarUserPromptGeracao(dto, modulo, chunks),
      entrada: {
        moduloId: dto.moduloId,
        tituloModulo: modulo.titulo,
        objetivoModulo: modulo.objetivoAprendizagem,
        tipo: dto.tipo,
        dificuldade: dto.dificuldade,
      },
      parser: (raw) => validarRespostaIa(raw, exercicioGeradoSchema, 'Evaluator'),
      temperature: 0.7,
    });

    const exercicio = await this.repo.criarExercicio({
      moduloId: dto.moduloId,
      tipo: dto.tipo,
      enunciado: gerado.enunciado,
      gabarito: gerado.gabarito,
      criterios: gerado.criterios,
      dificuldade: dto.dificuldade ?? 'medio',
    });

    this.logger.log(`Exercício gerado: ${exercicio.id} para o módulo ${dto.moduloId}`);
    return { ...exercicio, dica: gerado.dica, criterios: gerado.criterios ?? null };
  }

  async submeterTentativa(dto: SubmeterTentativaDto): Promise<
    | { jobId: string; status: 'enfileirado'; exercicioId: string }
    | (Awaited<ReturnType<ExerciciosAvaliacoesRepository['salvarTentativa']>> & {
        feedback: string;
      })
  > {
    const exercicioId = dto.exercicioId;

    if (!exercicioId) {
      throw new BadRequestException('exercicioId é obrigatório');
    }

    await this.validarVinculosTentativa(dto, exercicioId);

    if (dto.async) {
      const jobId = await this.queue.send(
        'exercicios.corrigir-tentativa',
        dto as unknown as Record<string, unknown>,
        { retryLimit: 2 },
      );
      if (!jobId) {
        throw new Error('Falha ao enfileirar job de correção de tentativa');
      }
      this.logger.log(
        `Job de correção de tentativa enfileirado: ${jobId} para exercício ${exercicioId}`,
      );
      return { jobId, status: 'enfileirado', exercicioId };
    }

    return this.submeterTentativaSincrona(dto, exercicioId);
  }

  private async submeterTentativaSincrona(
    dto: SubmeterTentativaDto,
    exercicioId: string,
  ): Promise<
    Awaited<ReturnType<ExerciciosAvaliacoesRepository['salvarTentativa']>> & { feedback: string }
  > {
    const exercicio = await this.repo.buscarExercicioPorId(exercicioId);
    if (!exercicio) {
      throw new NotFoundException(`Exercício ${exercicioId} não encontrado`);
    }

    const modulo = await this.planner.buscarModuloPorId(exercicio.moduloId);

    const numeroTentativa = await this.repo.contarTentativasPorExercicio(exercicioId);

    const correcao = await this.corrigirResposta(
      exercicio.tipo,
      exercicio,
      dto.respostaUsuario,
      modulo,
    );

    // A correção pode demorar; revalidar se a avaliação foi finalizada nesse intervalo.
    if (dto.avaliacaoId) await this.validarVinculosTentativa(dto, exercicioId);
    const tentativa = await this.repo.salvarTentativa({
      perfilId: dto.perfilId!,
      exercicioId,
      avaliacaoId: dto.avaliacaoId ?? null,
      respostaUsuario: dto.respostaUsuario,
      correta: correcao.correta,
      pontuacao: String(correcao.pontuacao),
      feedbackIa: correcao.feedback,
      tentativaNumero: numeroTentativa + 1,
    });

    // Em simulados o progresso por módulo é agregado pela avaliação final;
    // atualizar por resposta individual marcaria competências antes da nota final.
    if (dto.perfilId && exercicio.moduloId && !dto.avaliacaoId) {
      await this.atualizarProgressoPorExercicio(
        exercicio.moduloId,
        dto.perfilId,
        correcao.pontuacao,
        exercicioId,
      );
    }

    this.logger.log(`Tentativa salva: ${tentativa.id} para o exercício ${exercicioId}`);

    // Em simulados o feedback detalhado (que pode conter o gabarito) só é
    // revelado após a finalização; o feedback completo fica persistido em feedbackIa.
    const feedbackResposta = dto.avaliacaoId
      ? 'Resposta registrada. O feedback detalhado será disponibilizado após a finalização.'
      : correcao.feedback;
    return dto.avaliacaoId
      ? {
          ...tentativa,
          correta: null,
          pontuacao: null,
          feedbackIa: null,
          feedback: feedbackResposta,
        }
      : { ...tentativa, feedback: feedbackResposta };
  }

  private async validarVinculosTentativa(dto: SubmeterTentativaDto, exercicioId: string) {
    const exercicio = await this.repo.buscarExercicioPorId(exercicioId);
    if (!exercicio) throw new NotFoundException(`Exercício ${exercicioId} não encontrado`);
    const modulo = await this.planner.buscarModuloPorId(exercicio.moduloId);
    if (!dto.perfilId || modulo.trilha?.objetivo?.perfilId !== dto.perfilId) {
      throw new ForbiddenException('Exercício não pertence ao perfil informado');
    }
    if (!dto.avaliacaoId) return;
    const avaliacao = await this.repo.buscarAvaliacaoPorId(dto.avaliacaoId);
    if (!avaliacao) throw new NotFoundException('Avaliação não encontrada');
    const dono =
      avaliacao.modulo?.trilha?.objetivo?.perfilId ?? avaliacao.trilha?.objetivo?.perfilId;
    if (
      dono !== dto.perfilId ||
      !avaliacao.exercicios.some((item) => item.exercicioId === exercicioId)
    ) {
      throw new ForbiddenException(
        'Exercício ou avaliação não pertence ao perfil e avaliação informados',
      );
    }
    if (await this.repo.buscarResultadoPorAvaliacaoEPerfil(dto.avaliacaoId, dto.perfilId)) {
      throw new ConflictException('Avaliação já finalizada');
    }
  }

  async listarPorModulo(moduloId: string) {
    return this.repo.listarExerciciosPublicosPorModulo(moduloId);
  }

  async estatisticasPorExercicio(exercicioId: string) {
    return this.repo.calcularEstatisticasPorExercicio(exercicioId);
  }

  private async corrigirResposta(
    tipo: string,
    exercicio: { enunciado: string; gabarito: string | null; criterios: string[] | null },
    respostaUsuario: string,
    modulo: { titulo: string; objetivoAprendizagem: string | null },
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
      user: this.montarUserPromptCorrecao(exercicio, respostaUsuario, modulo),
      entrada: { tipo, enunciado: exercicio.enunciado, resposta: respostaUsuario },
      parser: (raw) => this.parseTentativaCorrigida(raw),
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
    modulo: { titulo: string; objetivoAprendizagem: string | null },
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

    return `Módulo: ${modulo.titulo}
Objetivo de aprendizagem: ${modulo.objetivoAprendizagem ?? 'não informado'}
Tipo de exercício: ${dto.tipo}
Dificuldade: ${dto.dificuldade ?? 'medio'}
${dto.instrucoesExtras ? `Instruções extras: ${dto.instrucoesExtras}\n` : ''}
Materiais recuperados da Biblioteca Viva (escopo deste módulo):
${chunksTexto}

Gere o exercício no formato JSON especificado, alinhado ao objetivo de aprendizagem do módulo.`;
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
    exercicio: { enunciado: string; gabarito: string | null; criterios: string[] | null },
    respostaUsuario: string,
    modulo: { titulo: string; objetivoAprendizagem: string | null },
  ): string {
    const criteriosTexto =
      exercicio.criterios && exercicio.criterios.length > 0
        ? exercicio.criterios.map((c) => `- ${c}`).join('\n')
        : (exercicio.gabarito ?? 'Não informado');

    return `Módulo: ${modulo.titulo}
Objetivo de aprendizagem: ${modulo.objetivoAprendizagem ?? 'não informado'}
Enunciado: ${exercicio.enunciado}
Gabarito/critérios:
${criteriosTexto}
Resposta do aluno: ${respostaUsuario}

Corrija no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    try {
      return lerJsonIa(raw) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Evaluator');
      throw new Error('O agente Evaluator retornou uma resposta inválida');
    }
  }

  private parseTentativaCorrigida(raw: string): TentativaCorrigida {
    const parsed = this.parseJsonSeguro<unknown>(raw);
    const resultado = tentativaCorrigidaSchema.safeParse(parsed);
    if (!resultado.success) {
      const detalhes = resultado.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      this.logger.error(`Resposta do Evaluator fora do formato esperado (${detalhes})`);
      throw new BadRequestException(`Resposta do Evaluator inválida: ${detalhes}`);
    }
    return resultado.data;
  }
}
