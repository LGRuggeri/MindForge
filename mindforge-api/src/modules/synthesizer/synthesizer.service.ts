import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';
import { GerarConteudoDto } from './dto/gerar-conteudo.dto';
import { ReviewerService } from './reviewer.service';
import { SynthesizerRepository } from './synthesizer.repository';

export interface ConteudoGerado {
  titulo: string;
  corpoMarkdown: string;
  resumo: string;
  palavrasChave: string[];
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

interface FonteContexto {
  id?: string;
  titulo: string;
  resumo: string | null;
  url: string | null;
  tipo: string;
}

@Injectable()
export class SynthesizerService {
  private readonly logger = new Logger(SynthesizerService.name);

  constructor(
    private readonly repo: SynthesizerRepository,
    private readonly agentes: AgentesService,
    private readonly biblioteca: BibliotecaVivaService,
    private readonly reviewer: ReviewerService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
  ) {}

  async gerar(dto: GerarConteudoDto): Promise<
    | { jobId: string; status: 'enfileirado'; moduloId: string }
    | (Awaited<ReturnType<SynthesizerRepository['criarConteudo']>> & {
        resumo: string;
        palavrasChave: string[];
        chunksIndexados: number;
        avaliacaoReviewer: { nota: number };
      })
  > {
    if (dto.async) {
      const jobId = await this.queue.send(
        'synthesizer.gerar-conteudo',
        dto as unknown as Record<string, unknown>,
        {
          retryLimit: 2,
        },
      );
      if (!jobId) {
        throw new Error('Falha ao enfileirar job de síntese');
      }
      this.logger.log(`Job de síntese enfileirado: ${jobId} para módulo ${dto.moduloId}`);
      return { jobId, status: 'enfileirado', moduloId: dto.moduloId };
    }

    return this.gerarSincrono(dto);
  }

  private async gerarSincrono(dto: GerarConteudoDto): Promise<
    Awaited<ReturnType<SynthesizerRepository['criarConteudo']>> & {
      resumo: string;
      palavrasChave: string[];
      chunksIndexados: number;
      avaliacaoReviewer: { nota: number };
    }
  > {
    const modulo = await this.repo.buscarModuloPorId(dto.moduloId);
    if (!modulo) {
      throw new NotFoundException(`Módulo ${dto.moduloId} não encontrado`);
    }

    const fontes = await this.repo.listarFontesPorModulo(dto.moduloId);
    const contexto = this.montarContextoReview(dto, modulo, fontes);

    let conteudoGerado = await this.sintetizar(dto, modulo, fontes);
    let avaliacao = await this.reviewer.revisar(conteudoGerado, contexto);

    let tentativasRevisao = 0;
    while (avaliacao.nota < 3 && tentativasRevisao < 2) {
      this.logger.warn(
        `Conteúdo ${conteudoGerado.titulo} rejeitado pelo reviewer (nota ${avaliacao.nota}). Reescrevendo...`,
      );
      conteudoGerado = await this.sintetizar(dto, modulo, fontes, avaliacao);
      avaliacao = await this.reviewer.revisar(conteudoGerado, contexto);
      tentativasRevisao++;
    }

    const status = avaliacao.nota >= 3 ? 'revisado' : 'rascunho';

    const conteudo = await this.repo.criarConteudo({
      moduloId: dto.moduloId,
      titulo: conteudoGerado.titulo,
      corpoMarkdown: conteudoGerado.corpoMarkdown,
      versao: 1,
      status,
    });

    if (fontes.length > 0) {
      await this.repo.vincularFontes(
        conteudo.id,
        fontes.map((f) => f.id),
      );
    }

    let chunksIndexados = 0;
    try {
      const chunks = await this.biblioteca.indexarTexto({
        texto: conteudoGerado.corpoMarkdown,
        conteudoId: conteudo.id,
      });
      chunksIndexados = Array.isArray(chunks) ? chunks.length : 0;
    } catch (erro) {
      // Conteúdo já foi salvo — indexação não deve apagar o ganho da síntese.
      this.logger.error(
        `Falha ao indexar conteúdo ${conteudo.id} na Biblioteca Viva`,
        erro instanceof Error ? erro.stack : String(erro),
      );
    }

    this.logger.log(
      `Conteúdo gerado: ${conteudo.id} para o módulo ${dto.moduloId} (${chunksIndexados} chunks, nota reviewer ${avaliacao.nota})`,
    );

    await this.extrairEVincularCompetencias(dto.moduloId, conteudoGerado);

    return {
      ...conteudo,
      resumo: conteudoGerado.resumo,
      palavrasChave: conteudoGerado.palavrasChave,
      chunksIndexados,
      avaliacaoReviewer: avaliacao,
    };
  }

  async listarPorModulo(moduloId: string) {
    return this.repo.listarConteudosPorModulo(moduloId);
  }

  private async extrairEVincularCompetencias(moduloId: string, conteudo: ConteudoGerado) {
    const termos = conteudo.palavrasChave?.length
      ? conteudo.palavrasChave
      : this.extrairTermosPorHeuristica(conteudo.corpoMarkdown);

    if (termos.length === 0) {
      this.logger.warn(`Nenhuma palavra-chave extraída do conteúdo para o módulo ${moduloId}`);
      return { vinculados: 0 };
    }

    const competencias = termos.map((nome) => ({
      nome: this.normalizarTermo(nome),
      descricao: `Competência extraída do conteúdo: ${conteudo.titulo}`,
      categoria: 'synthesizer',
    }));

    try {
      return await this.knowledgeGraph.vincularCompetenciasAoModulo(moduloId, competencias);
    } catch (erro) {
      // O conteúdo já foi salvo; o grafo não deve impedir a resposta da síntese.
      this.logger.error(
        `Falha ao vincular competências do conteúdo ao módulo ${moduloId}`,
        erro instanceof Error ? erro.stack : String(erro),
      );
      return { vinculados: 0 };
    }
  }

  private extrairTermosPorHeuristica(corpo: string): string[] {
    const titulos = corpo.match(/^#{2,3}\s+(.+)$/gm) ?? [];
    if (titulos.length > 0) {
      return titulos.slice(0, 5).map((linha) => linha.replace(/^#+\s+/, ''));
    }
    return [];
  }

  private normalizarTermo(termo: string): string {
    return termo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private async sintetizar(
    dto: GerarConteudoDto,
    modulo: ModuloContexto,
    fontes: FonteContexto[],
    feedbackReview?: { pontosFracos: string[]; sugestoes: string[]; nota: number },
  ): Promise<ConteudoGerado> {
    return this.agentes.executar<ConteudoGerado>({
      agente: 'synthesizer',
      system: this.montarSystemPrompt(),
      user: this.montarUserPrompt(dto, modulo, fontes, feedbackReview),
      entrada: { moduloId: dto.moduloId, topico: dto.topico, reescrita: !!feedbackReview },
      parser: (raw: string) => this.parseJsonSeguro<ConteudoGerado>(raw),
      temperature: 0.6,
    });
  }

  private montarContextoReview(
    dto: GerarConteudoDto,
    modulo: ModuloContexto,
    fontes: FonteContexto[],
  ): string {
    const tituloTrilha = modulo.trilha?.objetivo?.titulo ?? 'Trilha';
    const nivelAluno = dto.nivelAlvo ?? modulo.trilha?.objetivo?.perfil?.nivelAtual ?? 'iniciante';
    return `Trilha: ${tituloTrilha}\nMódulo: ${modulo.titulo}\nNível: ${nivelAluno}\nTópico: ${dto.topico}\nFontes: ${fontes.length}`;
  }

  private montarSystemPrompt(): string {
    return `Você é o Synthesizer do MindForge, um especialista em didática e clareza.
Sua tarefa é transformar fontes de pesquisa em um material de estudo original, didático e bem estruturado em Markdown.

Regras:
1. O conteúdo deve ser autocontido: um aluno pode aprender o tema só lendo o texto.
2. Use Markdown semântico: títulos (#), listas, blocos de código, tabelas e negrito quando útil.
3. Inclua exemplos concretos e, quando aplicável, um exercício mental ou pequeno desafio no final.
4. Respeite o nível do aluno (iniciante, intermediário, avançado).
5. Não copie textos das fontes; reescreva com suas próprias palavras e organize didaticamente.
6. Retorne APENAS um objeto JSON válido, sem markdown ao redor, sem explicações adicionais.

Formato obrigatório:
{
  "titulo": "string",
  "corpoMarkdown": "string",
  "resumo": "string",
  "palavrasChave": ["string"]
}`;
  }

  private montarUserPrompt(
    dto: GerarConteudoDto,
    modulo: ModuloContexto,
    fontes: FonteContexto[],
    feedbackReview?: { pontosFracos: string[]; sugestoes: string[]; nota: number },
  ): string {
    const tituloTrilha = modulo.trilha?.objetivo?.titulo ?? 'Trilha';
    const descricao = modulo.trilha?.objetivo?.descricao ?? 'Sem descrição';
    const nivelAluno = dto.nivelAlvo ?? modulo.trilha?.objetivo?.perfil?.nivelAtual ?? 'iniciante';

    const fontesTexto =
      fontes.length > 0
        ? fontes
            .map(
              (f) =>
                `- ${f.titulo} (${f.tipo})${f.url ? ` [${f.url}]` : ''}${f.resumo ? `: ${f.resumo}` : ''}`,
            )
            .join('\n')
        : 'Nenhuma fonte registrada. Gere o conteúdo com base no tópico e no objetivo de aprendizagem.';

    const feedbackTexto = feedbackReview
      ? `\n---\nFeedback do reviewer anterior (nota ${feedbackReview.nota}):\nPontos fracos: ${feedbackReview.pontosFracos.join('; ')}\nSugestões: ${feedbackReview.sugestoes.join('; ')}\nUse esse feedback para melhorar o conteúdo.\n---\n`
      : '';

    return `Trilha: ${tituloTrilha}
Descrição da trilha: ${descricao}
Módulo: ${modulo.titulo}
Objetivo de aprendizagem do módulo: ${modulo.objetivoAprendizagem ?? 'Não informado'}
Nível do aluno: ${nivelAluno}
Tópico solicitado: ${dto.topico}
Instruções extras: ${dto.instrucoesExtras ?? 'Nenhuma'}${feedbackTexto}

Fontes de pesquisa:
${fontesTexto}

Gere o conteúdo didático no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    const limpo = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(limpo) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Synthesizer', raw);
      throw new Error('O agente Synthesizer retornou uma resposta inválida');
    }
  }
}
