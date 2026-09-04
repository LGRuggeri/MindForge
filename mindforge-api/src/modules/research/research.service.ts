import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JOB_QUEUE } from '../../jobs/job-queue.token';
import { JobsService } from '../../jobs/jobs.service';
import { AgentesService } from '../agentes/agentes.service';
import { PesquisarDto } from './dto/pesquisar.dto';
import { ResearchRepository } from './research.repository';
import { WebSearchResultado, WebSearchService } from './web-search.service';

export type TipoFonte = 'documentacao_oficial' | 'livro' | 'artigo' | 'video' | 'outro';

export interface FonteSugerida {
  tipo: TipoFonte;
  titulo: string;
  url?: string | null;
  autor?: string | null;
  confiabilidadeScore: number;
  resumo: string;
}

export interface ResultadoPesquisa {
  fontes: FonteSugerida[];
  estrategia: string;
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

const TIPOS_VALIDOS = new Set<TipoFonte>([
  'documentacao_oficial',
  'livro',
  'artigo',
  'video',
  'outro',
]);

@Injectable()
export class ResearchService {
  private readonly logger = new Logger(ResearchService.name);

  constructor(
    private readonly repo: ResearchRepository,
    private readonly agentes: AgentesService,
    private readonly webSearch: WebSearchService,
    @Inject(JOB_QUEUE) private readonly queue: JobsService,
  ) {}

  async pesquisar(dto: PesquisarDto): Promise<
    | { jobId: string; status: 'enfileirado'; moduloId: string; topico: string }
    | {
        moduloId: string;
        topico: string;
        estrategia: string;
        fontes: Awaited<ReturnType<ResearchRepository['criarFontes']>>;
        resultadosWeb: number;
      }
  > {
    if (dto.async) {
      const modulo = await this.repo.buscarModuloPorId(dto.moduloId);
      if (!modulo) {
        throw new NotFoundException(`Módulo ${dto.moduloId} não encontrado`);
      }

      const jobId = await this.queue.send(
        'research:pesquisar',
        dto as unknown as Record<string, unknown>,
        { retryLimit: 2 },
      );
      if (!jobId) {
        throw new Error('Falha ao enfileirar job de pesquisa');
      }

      const topico = dto.topico ?? modulo.titulo;
      this.logger.log(`Job de pesquisa enfileirado: ${jobId} para módulo ${dto.moduloId}`);
      return { jobId, status: 'enfileirado', moduloId: dto.moduloId, topico };
    }

    return this.pesquisarSincrono(dto);
  }

  private async pesquisarSincrono(dto: PesquisarDto) {
    const modulo = await this.repo.buscarModuloPorId(dto.moduloId);
    if (!modulo) {
      throw new NotFoundException(`Módulo ${dto.moduloId} não encontrado`);
    }

    const limite = dto.limite ?? 5;
    const topico = dto.topico ?? modulo.titulo;

    let resultadosWeb: WebSearchResultado[] = [];
    if (dto.webSearch) {
      resultadosWeb = await this.webSearch.buscar(topico, 10);
    }

    const resultado = await this.agentes.executar<ResultadoPesquisa>({
      agente: 'researcher',
      system: this.montarSystemPrompt(limite, resultadosWeb),
      user: this.montarUserPrompt(topico, modulo, limite, resultadosWeb),
      entrada: { moduloId: dto.moduloId, topico, limite, webSearch: dto.webSearch },
      parser: (raw) => this.normalizarResultado(this.parseJsonSeguro<ResultadoPesquisa>(raw)),
      temperature: 0.4,
    });

    const fontes = await this.repo.criarFontes(
      resultado.fontes.map((f) => ({
        moduloId: dto.moduloId,
        tipo: f.tipo,
        titulo: f.titulo,
        url: f.url ?? null,
        autor: f.autor ?? null,
        confiabilidadeScore: String(this.clampScore(f.confiabilidadeScore)),
        resumo: f.resumo,
      })),
    );

    this.logger.log(`Pesquisa concluída: ${fontes.length} fontes para o módulo ${dto.moduloId}`);

    return {
      moduloId: dto.moduloId,
      topico,
      estrategia: resultado.estrategia,
      fontes,
      resultadosWeb: resultadosWeb.length,
    };
  }

  async listarPorModulo(moduloId: string) {
    return this.repo.listarPorModulo(moduloId);
  }

  private montarSystemPrompt(limite: number, resultadosWeb: WebSearchResultado[] = []): string {
    const base = `Você é o Research Engine do MindForge, especialista em curadoria de fontes de estudo.
Sua tarefa é indicar fontes confiáveis para um módulo de aprendizagem.

Regras:
1. Priorize documentação oficial, depois livros técnicos, artigos de qualidade e vídeos didáticos.
2. Sugira entre 3 e ${limite} fontes relevantes e diversificadas.
3. Prefira fontes reais e amplamente conhecidas; se não tiver certeza de uma URL, deixe url como null.
4. Atribua confiabilidadeScore de 0.00 a 1.00 (documentação oficial tende a 0.90–1.00).
5. Cada resumo deve explicar em 1–2 frases por que a fonte serve ao módulo.
6. Retorne APENAS um objeto JSON válido, sem markdown, sem explicações adicionais.

Formato obrigatório:
{
  "estrategia": "string",
  "fontes": [
    {
      "tipo": "documentacao_oficial" | "livro" | "artigo" | "video" | "outro",
      "titulo": "string",
      "url": "string ou null",
      "autor": "string ou null",
      "confiabilidadeScore": 0.95,
      "resumo": "string"
    }
  ]
}`;

    if (resultadosWeb.length === 0) {
      return base;
    }

    const contextoWeb = resultadosWeb
      .map((r, i) => `${i + 1}. ${r.titulo}\nURL: ${r.url}\nFonte: ${r.fonte}\nResumo: ${r.resumo}`)
      .join('\n\n');

    return `${base}\n\nVocê também recebeu resultados reais de busca na web. Use-os para enriquecer a curadoria, validar URLs e escolher as fontes mais confiáveis. Não invente links que não estejam nos resultados.\n\nResultados de busca:\n${contextoWeb}`;
  }

  private montarUserPrompt(
    topico: string,
    modulo: ModuloContexto,
    limite: number,
    resultadosWeb: WebSearchResultado[] = [],
  ): string {
    const trilha = modulo.trilha?.objetivo?.titulo ?? 'Trilha';
    const descricao = modulo.trilha?.objetivo?.descricao ?? 'Sem descrição';
    const nivel = modulo.trilha?.objetivo?.perfil?.nivelAtual ?? 'iniciante';

    const secaoWeb =
      resultadosWeb.length > 0
        ? `\nResultados de busca web fornecidos:\n${resultadosWeb.map((r) => `- ${r.titulo} (${r.url})`).join('\n')}\n`
        : '';

    return `Trilha: ${trilha}
Descrição da trilha: ${descricao}
Módulo: ${modulo.titulo}
Objetivo de aprendizagem: ${modulo.objetivoAprendizagem ?? 'Não informado'}
Nível do aluno: ${nivel}
Tópico a pesquisar: ${topico}
Quantidade desejada de fontes: ${limite}${secaoWeb}

Liste as melhores fontes para este módulo no formato JSON especificado.`;
  }

  private normalizarResultado(resultado: ResultadoPesquisa): ResultadoPesquisa {
    if (!resultado?.fontes || !Array.isArray(resultado.fontes)) {
      throw new Error('O agente Researcher retornou fontes inválidas');
    }

    const fontes = resultado.fontes
      .filter((f) => f?.titulo && f?.resumo)
      .map((f) => ({
        tipo: TIPOS_VALIDOS.has(f.tipo) ? f.tipo : ('outro' as TipoFonte),
        titulo: String(f.titulo).trim(),
        url: f.url ? String(f.url).trim() : null,
        autor: f.autor ? String(f.autor).trim() : null,
        confiabilidadeScore: this.clampScore(Number(f.confiabilidadeScore) || 0.7),
        resumo: String(f.resumo).trim(),
      }));

    if (fontes.length === 0) {
      throw new Error('O agente Researcher não retornou fontes utilizáveis');
    }

    return {
      estrategia: resultado.estrategia?.trim() || 'Fontes curadas por prioridade de confiabilidade',
      fontes,
    };
  }

  private clampScore(score: number): number {
    if (Number.isNaN(score)) return 0.7;
    return Math.min(1, Math.max(0, Math.round(score * 100) / 100));
  }

  private parseJsonSeguro<T>(raw: string): T {
    const limpo = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(limpo) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Researcher', raw);
      throw new Error('O agente Researcher retornou uma resposta inválida');
    }
  }
}
