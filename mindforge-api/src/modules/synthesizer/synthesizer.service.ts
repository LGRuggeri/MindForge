import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AtualizacaoFontes } from '../../database/schema/conteudos.schema';
import { ResearchService } from '../research/research.service';
import { PesquisaIndisponivelException } from '../../common/filters/pesquisa-indisponivel.exception';
import { ConfigService } from '@nestjs/config';
import { validarRespostaIa } from '../../common/ia/json-ia';
import { conteudoGeradoSchema } from '../../common/ia/contratos-ia';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { ImageService } from '../midia/image.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';
import { GerarConteudoDto } from './dto/gerar-conteudo.dto';
import { ReviewerService } from './reviewer.service';
import { SynthesizerRepository } from './synthesizer.repository';
import {
  aplicarEscopoEstudo,
  avaliarAprovacao,
  montarRequisitosEstudo,
  FonteEstudo,
} from './requisitos-estudo';

export interface ConteudoGerado {
  titulo: string;
  corpoMarkdown: string;
  resumo: string;
  palavrasChave: string[];
  ilustracoes?: { prompt: string }[];
}

interface ModuloContexto {
  ordem?: number;
  titulo: string;
  objetivoAprendizagem: string | null;
  trilha?: {
    metadata?: unknown;
    objetivo?: {
      titulo: string;
      descricao: string | null;
      nivelDesejado: string | null;
    };
  };
}

interface FonteContexto extends FonteEstudo {
  origem?: string;
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
    private readonly imageService: ImageService,
    private readonly config: ConfigService,
    private readonly research: ResearchService,
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

    dto = aplicarEscopoEstudo(dto, modulo);
    const { fontes, atualizacaoFontes } = await this.atualizarFontes(dto);
    const contexto = this.montarContextoReview(dto, modulo, fontes);

    let conteudoGerado = await this.sintetizar(dto, modulo, fontes);
    let avaliacao = await this.reviewer.revisar(conteudoGerado, contexto);

    let tentativasRevisao = 0;
    while (!avaliarAprovacao(avaliacao, dto.modoEstudo ?? 'completo') && tentativasRevisao < 2) {
      this.logger.warn(
        `Conteúdo ${conteudoGerado.titulo} rejeitado pelo reviewer (nota ${avaliacao.nota}). Reescrevendo...`,
      );
      conteudoGerado = await this.sintetizar(dto, modulo, fontes, avaliacao);
      avaliacao = await this.reviewer.revisar(conteudoGerado, contexto);
      tentativasRevisao++;
    }

    const status = avaliarAprovacao(avaliacao, dto.modoEstudo ?? 'completo')
      ? 'revisado'
      : 'rascunho';

    conteudoGerado.corpoMarkdown = await this.injetarIlustracoes(conteudoGerado);

    const conteudo = await this.repo.criarConteudo({
      moduloId: dto.moduloId,
      titulo: conteudoGerado.titulo,
      corpoMarkdown: conteudoGerado.corpoMarkdown,
      versao: 1,
      status,
      atualizacaoFontes,
    });

    if (fontes.length > 0) {
      await this.repo.vincularFontes(
        conteudo.id,
        fontes.map((f) => f.id),
      );
    }

    let chunksIndexados = 0;
    if (status === 'revisado') {
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
    }

    this.logger.log(
      `Conteúdo gerado: ${conteudo.id} para o módulo ${dto.moduloId} (${chunksIndexados} chunks, nota reviewer ${avaliacao.nota})`,
    );

    if (status === 'revisado')
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

  private async atualizarFontes(dto: GerarConteudoDto) {
    const salvas = await this.repo.listarFontesPorModulo(dto.moduloId);
    let atuais: typeof salvas = [];
    let atualizacaoFontes: AtualizacaoFontes = {
      tipo: 'fontes_salvas',
      realizadaEm: null,
      resultadosWeb: 0,
      fontesEncontradas: 0,
    };
    if (dto.atualizarFontes !== false) {
      try {
        const pesquisa = await this.research.pesquisarAtualizado({
          moduloId: dto.moduloId,
          topico: [dto.topico, ...(dto.topicosObrigatorios ?? []).slice(0, 2)]
            .join(' ')
            .slice(0, 800),
          limite: 8,
        });
        atuais = pesquisa.fontes;
        atualizacaoFontes = {
          tipo: 'busca_web',
          realizadaEm: new Date().toISOString(),
          resultadosWeb: pesquisa.resultadosWeb,
          fontesEncontradas: atuais.length,
        };
      } catch {
        throw new PesquisaIndisponivelException();
      }
    }
    // Resultados desta busca primeiro; referências anteriores complementam sem duplicar URLs.
    const urlsAtuais = new Set(atuais.map((fonte) => fonte.url).filter(Boolean));
    const complementares = salvas.filter((fonte) => !fonte.url || !urlsAtuais.has(fonte.url));
    return { fontes: [...atuais, ...complementares].slice(0, 20), atualizacaoFontes };
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

  /**
   * Gera as imagens pedidas pelo LLM e substitui os placeholders
   * `[[imagem:N]]` do corpoMarkdown por `![descrição](url)`. Falha na geração
   * de uma imagem não derruba a síntese: o placeholder é removido e o conteúdo
   * segue sem aquela ilustração (degradação graciosa, padrão ADR-017).
   */
  private async injetarIlustracoes(conteudo: ConteudoGerado): Promise<string> {
    let corpo = conteudo.corpoMarkdown;
    // O contrato normaliza ilustrações opcionais inválidas. Antes de qualquer
    // chamada externa (cada uma pode demorar até 60s), normalizamos com
    // Array.isArray, validamos cada prompt e limitamos a 3 por conteúdo.
    const brutas = Array.isArray(conteudo.ilustracoes) ? conteudo.ilustracoes : [];
    if (!Array.isArray(conteudo.ilustracoes) && conteudo.ilustracoes != null) {
      this.logger.warn(
        `Conteúdo "${conteudo.titulo}": ilustracoes veio com shape inválido ` +
          `(${typeof conteudo.ilustracoes}) — seguindo sem ilustrações`,
      );
    }
    // O índice original de cada entrada precisa sobreviver ao filtro: é ele
    // que casa com o placeholder [[imagem:N]] escrito pelo LLM no corpo. Um
    // filter simples compactaria o array e trocaria as ilustrações de seção.
    const ilustracoes = brutas
      .map((item, indiceOriginal) => ({ item, indiceOriginal }))
      .filter(
        ({ item, indiceOriginal }) =>
          typeof item?.prompt === 'string' &&
          item.prompt.trim().length > 0 &&
          corpo.includes(`[[imagem:${indiceOriginal}]]`),
      )
      .slice(0, 3);
    if (brutas.length > ilustracoes.length) {
      this.logger.warn(
        `Conteúdo "${conteudo.titulo}": ${brutas.length} ilustrações informadas pelo LLM, ` +
          `${ilustracoes.length} usadas (inválidas/órfãs descartadas; limite: 3)`,
      );
    }
    const apiPublica = this.config.get<string>('API_PUBLIC_URL', 'http://localhost:3000');

    // Geração sequencial de propósito: respeita o rate limit do free tier do
    // provedor de imagem (no máx. 3 ilustrações por conteúdo).
    for (const { item, indiceOriginal: i } of ilustracoes) {
      const placeholder = `[[imagem:${i}]]`;
      try {
        const { arquivo } = await this.imageService.gerarImagem({ prompt: item.prompt });
        // Sanitização: o prompt vem do LLM — caracteres de markdown no alt
        // quebrariam a sintaxe ![...](...) persistida em corpoMarkdown.
        const alt =
          item.prompt
            .replace(/[[\]()]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 80) || 'Ilustração';
        // replaceAll: se o LLM repetir o mesmo placeholder no corpo, todas as
        // ocorrências apontam para a mesma ilustração (cache por prompt).
        corpo = corpo.replaceAll(placeholder, `![${alt}](${apiPublica}/midia/imagem/${arquivo})`);
      } catch (erro) {
        this.logger.error(
          `Falha ao gerar ilustração ${i} do conteúdo "${conteudo.titulo}" — seguindo sem imagem`,
          erro instanceof Error ? erro.stack : String(erro),
        );
        corpo = corpo.replaceAll(placeholder, '');
      }
    }

    // Remove placeholders órfãos (ex.: LLM pediu mais ilustrações do que gerou).
    return corpo.replace(/\[\[imagem:\d+\]\]/g, '');
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
      parser: (raw: string) => validarRespostaIa(raw, conteudoGeradoSchema, 'Synthesizer'),
      temperature: 0.6,
    });
  }

  private montarContextoReview(
    dto: GerarConteudoDto,
    modulo: ModuloContexto,
    fontes: FonteContexto[],
  ): string {
    return montarRequisitosEstudo(dto, modulo, fontes);
  }

  private montarSystemPrompt(): string {
    return `Você é o Synthesizer do MindForge, um especialista em didática e clareza.
Sua tarefa é transformar fontes de pesquisa em um material de estudo original, didático e bem estruturado em Markdown.

Regras:
1. O conteúdo deve ser autocontido: um aluno pode aprender o tema só lendo o texto.
2. Use Markdown semântico: títulos (#), listas, blocos de código, tabelas e negrito quando útil.
3. Inclua exemplos concretos e, quando aplicável, um exercício mental ou pequeno desafio no final.
4. Respeite o nível do aluno (iniciante, intermediário, avançado).
5. Resumos de fontes são gerados pela IA; trechos do buscador não comprovam leitura da página nem vigência de normas. Use as fontes na ordem fornecida, priorizando as recém-pesquisadas. Não trate sugestões ou links encontrados como fatos verificados. Não copie textos das fontes; reescreva com suas próprias palavras e organize didaticamente.
6. SUGIRA de 0 a 3 ilustrações didáticas quando o tema se beneficiar de figura (diagrama, esquema, mapa conceitual, fluxo, anatomia de algo). Temas abstratos sem representação visual clara NÃO devem ter ilustração. Cada ilustração tem um "prompt" descritivo em inglês (estilo didático, rótulos na língua do conteúdo) e o corpoMarkdown deve conter o placeholder [[imagem:N]] (N = índice, começando em 0) exatamente no ponto onde a imagem deve aparecer, em linha própria.
7. Retorne APENAS um objeto JSON válido, sem markdown ao redor, sem explicações adicionais.

Formato obrigatório:
{
  "titulo": "string",
  "corpoMarkdown": "string (com placeholders [[imagem:N]] quando houver ilustrações)",
  "resumo": "string",
  "palavrasChave": ["string"],
  "ilustracoes": [{ "prompt": "descrição em inglês da ilustração didática" }]
}`;
  }

  private montarUserPrompt(
    dto: GerarConteudoDto,
    modulo: ModuloContexto,
    fontes: FonteContexto[],
    feedbackReview?: { pontosFracos: string[]; sugestoes: string[]; nota: number },
  ): string {
    const feedbackTexto = feedbackReview
      ? `\n---\nFeedback do reviewer anterior (nota ${feedbackReview.nota}):\nPontos fracos: ${feedbackReview.pontosFracos.join('; ')}\nSugestões: ${feedbackReview.sugestoes.join('; ')}\nUse esse feedback para melhorar o conteúdo.\n---\n`
      : '';

    return `${montarRequisitosEstudo(dto, modulo, fontes)}${feedbackTexto}

Gere o conteúdo didático no formato JSON especificado.`;
  }
}
