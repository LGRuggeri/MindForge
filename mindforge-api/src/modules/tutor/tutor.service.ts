import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AgentKbService } from '../agent-kb/agent-kb.service';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { AvaliarRespostaDto } from './dto/avaliar-resposta.dto';
import { TirarDuvidaDto } from './dto/tirar-duvida.dto';
import { TutorRepository } from './tutor.repository';

export interface RespostaTutor {
  resposta: string;
  citacoes: string[];
  proximosPassos: string[];
}

interface ModuloContexto {
  titulo: string;
  objetivoAprendizagem: string | null;
  trilha?: {
    objetivo?: {
      titulo: string;
      descricao: string | null;
      perfil?: { nivelAtual: string };
    };
  };
}

interface DuvidaAnterior {
  id: string;
  pergunta: string;
  resposta: string;
  avaliacao?: number | null;
  feedback?: string | null;
  moduloTitulo?: string;
}

@Injectable()
export class TutorService {
  private readonly logger = new Logger(TutorService.name);

  constructor(
    private readonly repo: TutorRepository,
    private readonly agentes: AgentesService,
    private readonly biblioteca: BibliotecaVivaService,
    private readonly agentKb: AgentKbService,
  ) {}

  async tirarDuvida(dto: TirarDuvidaDto) {
    const modulo = await this.repo.buscarModuloPorId(dto.moduloId);
    if (!modulo) {
      throw new NotFoundException(`Módulo ${dto.moduloId} não encontrado`);
    }

    const historico = await this.repo.listarHistoricoRecentePorPerfil(dto.perfilId, 5);
    const contextoAgentKb = await this.buscarContextoAgentKb(dto.pergunta);

    let chunks: Array<{
      id: string;
      texto: string;
      similaridade: number;
      conteudoId: string | null;
      fonteId: string | null;
    }> = [];
    try {
      chunks = await this.biblioteca.buscar({
        consulta: this.montarConsultaRag(dto.pergunta, modulo),
        limite: dto.limiteChunks ?? 5,
      });
    } catch (erro) {
      // A Biblioteca Viva pode estar indisponível (ex: embedding provider offline).
      // O Tutor continua com base no contexto do módulo, sem perder o fluxo.
      this.logger.warn(
        `Biblioteca Viva indisponível para a dúvida do perfil ${dto.perfilId}: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
    }

    const resposta = await this.agentes.executar<RespostaTutor>({
      agente: 'teacher',
      system: this.montarSystemPrompt(contextoAgentKb),
      user: this.montarUserPrompt(dto, modulo, chunks, historico),
      entrada: { perfilId: dto.perfilId, moduloId: dto.moduloId, pergunta: dto.pergunta },
      parser: (raw) => this.parseJsonSeguro<RespostaTutor>(raw),
      temperature: 0.6,
    });

    const registro = await this.repo.salvarDuvida({
      perfilId: dto.perfilId,
      moduloId: dto.moduloId,
      pergunta: dto.pergunta,
      resposta: resposta.resposta,
      citacoes: resposta.citacoes,
      proximosPassos: resposta.proximosPassos,
      chunksIds: chunks.map((c) => c.id),
    });

    this.logger.log(
      `Dúvida salva: ${registro.id} para o perfil ${dto.perfilId} no módulo ${dto.moduloId} (${chunks.length} chunks)`,
    );

    return {
      duvidaId: registro.id,
      ...resposta,
      chunksConsultados: chunks.map((c) => ({
        id: c.id,
        texto: c.texto,
        similaridade: c.similaridade,
        conteudoId: c.conteudoId,
        fonteId: c.fonteId,
      })),
    };
  }

  async avaliarResposta(dto: AvaliarRespostaDto) {
    const duvida = await this.repo.buscarDuvidaPorId(dto.duvidaId);
    if (!duvida) {
      throw new NotFoundException(`Dúvida ${dto.duvidaId} não encontrada`);
    }

    const atualizado = await this.repo.avaliarDuvida(dto.duvidaId, dto.avaliacao, dto.feedback);

    await this.salvarFeedbackComoMemoria(duvida, dto.avaliacao, dto.feedback);

    this.logger.log(`Resposta da dúvida ${dto.duvidaId} avaliada com ${dto.avaliacao} estrelas`);

    return atualizado;
  }

  async listarHistoricoPorPerfil(perfilId: string) {
    return this.repo.listarHistoricoPorPerfil(perfilId);
  }

  private async buscarContextoAgentKb(pergunta: string): Promise<string> {
    if (!this.agentKb.isAvailable()) {
      return '';
    }
    try {
      const pack = await this.agentKb.buildContextPack(pergunta, 2000);
      if (pack.tokens_used === 0) {
        return '';
      }

      const secoes: string[] = [];
      if (pack.pack.rules.length > 0) {
        secoes.push(
          `Regras relevantes:\n${pack.pack.rules
            .map((r) => `- [${r.level ?? 'rule'}] ${r.name ?? r.title ?? r.id}: ${r.summary ?? ''}`)
            .join('\n')}`,
        );
      }
      if (pack.pack.memory.length > 0) {
        secoes.push(
          `Memórias relevantes:\n${pack.pack.memory
            .map(
              (m) =>
                `- [${m.node_type ?? m.importance ?? 'memory'}] ${m.title ?? m.id}: ${m.summary ?? ''}`,
            )
            .join('\n')}`,
        );
      }

      return secoes.length > 0 ? secoes.join('\n\n') : '';
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.warn(`Falha ao buscar contexto no agent_kb: ${mensagem}`);
      return '';
    }
  }

  private async salvarFeedbackComoMemoria(
    duvida: DuvidaAnterior & { pergunta: string; resposta: string; moduloId?: string },
    avaliacao: number,
    feedback?: string,
  ) {
    if (!this.agentKb.isAvailable() || avaliacao >= 4) {
      return;
    }

    const nodeType = avaliacao <= 2 ? 'BUG_FIX' : 'PATTERN';
    const titulo = `Feedback do aluno: ${duvida.pergunta.slice(0, 60)}`;
    const resumo = `Avaliação ${avaliacao}/5 — ${feedback ?? 'sem feedback textual'}`;
    const conteudo = `Pergunta: ${duvida.pergunta}\nResposta dada: ${duvida.resposta.slice(0, 500)}\nAvaliação: ${avaliacao}/5\nFeedback: ${feedback ?? 'N/A'}\n\nAção: ajustar explicações futuras com base nesse padrão de dificuldade.`;

    try {
      await this.agentKb.addMemory({
        title: titulo,
        summary: resumo,
        content: conteudo,
        nodeType,
        importance: avaliacao <= 2 ? 'high' : 'medium',
        tags: ['tutor', 'feedback', 'aluno', nodeType.toLowerCase()],
        sourceType: 'historico_duvidas',
        sourceRef: duvida.id,
      });
      this.logger.log(`Feedback da dúvida ${duvida.id} salvo no agent_kb como ${nodeType}`);
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      this.logger.warn(`Falha ao salvar feedback no agent_kb: ${mensagem}`);
    }
  }

  private montarConsultaRag(pergunta: string, modulo: ModuloContexto): string {
    const contexto = [modulo.trilha?.objetivo?.titulo, modulo.titulo, modulo.objetivoAprendizagem]
      .filter(Boolean)
      .join(' - ');
    return `${contexto}: ${pergunta}`;
  }

  private montarSystemPrompt(contextoAgentKb: string): string {
    const contextoExtra = contextoAgentKb
      ? `\n---\nContexto relevante da base de conhecimento do MindForge:\n${contextoAgentKb}\n---\n`
      : '';

    return `Você é o Tutor IA do MindForge, um professor pessoal que responde dúvidas de estudo.${contextoExtra}

Regras:
1. Se forem fornecidos chunks da Biblioteca Viva, use-os como base principal da resposta e cite trechos relevantes.
2. Se houver contexto da base de conhecimento (ADRs, regras, padrões), priorize-o sobre conhecimento genérico do LLM.
3. Se não houver chunks disponíveis, responda com base no contexto do módulo (título, objetivo de aprendizagem, nível do aluno e trilha), explicando o conceito de forma didática e autocontida.
4. Analise o histórico de dúvidas do aluno. Se ele já perguntou algo relacionado, aprofunde ou conecte os conceitos. Se uma resposta anterior foi mal avaliada, ajuste o estilo de explicação.
5. Explique de forma clara, didática e no nível do aluno.
6. Sugira 1 a 3 próximos passos concretos (exercício, revisão, próximo conceito).
7. Retorne APENAS um objeto JSON válido, sem markdown, sem explicações adicionais.

Formato obrigatório:
{
  "resposta": "string",
  "citacoes": ["string"],
  "proximosPassos": ["string"]
}`;
  }

  private montarUserPrompt(
    dto: TirarDuvidaDto,
    modulo: ModuloContexto,
    chunks: Array<{ texto: string; similaridade: number }>,
    historico: DuvidaAnterior[],
  ): string {
    const tituloTrilha = modulo.trilha?.objetivo?.titulo ?? 'Trilha';
    const descricao = modulo.trilha?.objetivo?.descricao ?? 'Sem descrição';
    const nivelAluno = modulo.trilha?.objetivo?.perfil?.nivelAtual ?? 'iniciante';

    const chunksTexto =
      chunks.length > 0
        ? chunks
            .map(
              (c, i) =>
                `--- Chunk ${i + 1} (similaridade ${c.similaridade.toFixed(3)}) ---\n${c.texto}`,
            )
            .join('\n\n')
        : 'Nenhum material relevante encontrado na Biblioteca Viva.';

    const historicoTexto =
      historico.length > 0
        ? historico
            .map(
              (h, i) =>
                `--- Dúvida anterior ${i + 1}${h.moduloTitulo ? ` (${h.moduloTitulo})` : ''} ---\nPergunta: ${h.pergunta}\nResposta: ${h.resposta.slice(0, 300)}${h.resposta.length > 300 ? '...' : ''}${h.avaliacao ? `\nAvaliação do aluno: ${h.avaliacao}/5` : ''}${h.feedback ? `\nFeedback: ${h.feedback}` : ''}`,
            )
            .join('\n\n')
        : 'Nenhuma dúvida anterior registrada.';

    return `Trilha: ${tituloTrilha}
Descrição da trilha: ${descricao}
Módulo: ${modulo.titulo}
Objetivo de aprendizagem do módulo: ${modulo.objetivoAprendizagem ?? 'Não informado'}
Nível do aluno: ${nivelAluno}

Histórico recente de dúvidas do aluno:
${historicoTexto}

Pergunta atual do aluno: ${dto.pergunta}

Materiais recuperados da Biblioteca Viva:
${chunksTexto}

Responda a dúvida no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    const limpo = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(limpo) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Teacher (tutor)', raw);
      throw new Error('O agente Teacher retornou uma resposta inválida');
    }
  }
}
