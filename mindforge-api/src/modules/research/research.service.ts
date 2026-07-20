import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
import { PesquisarDto } from './dto/pesquisar.dto';
import { ResearchRepository } from './research.repository';

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
  ) {}

  async pesquisar(dto: PesquisarDto) {
    const modulo = await this.repo.buscarModuloPorId(dto.moduloId);
    if (!modulo) {
      throw new NotFoundException(`Módulo ${dto.moduloId} não encontrado`);
    }

    const limite = dto.limite ?? 5;
    const topico = dto.topico ?? modulo.titulo;

    const resultado = await this.agentes.executar<ResultadoPesquisa>({
      agente: 'researcher',
      system: this.montarSystemPrompt(limite),
      user: this.montarUserPrompt(topico, modulo, limite),
      entrada: { moduloId: dto.moduloId, topico, limite },
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
    };
  }

  async listarPorModulo(moduloId: string) {
    return this.repo.listarPorModulo(moduloId);
  }

  private montarSystemPrompt(limite: number): string {
    return `Você é o Research Engine do MindForge, especialista em curadoria de fontes de estudo.
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
  }

  private montarUserPrompt(topico: string, modulo: ModuloContexto, limite: number): string {
    const trilha = modulo.trilha?.objetivo?.titulo ?? 'Trilha';
    const descricao = modulo.trilha?.objetivo?.descricao ?? 'Sem descrição';
    const nivel = modulo.trilha?.objetivo?.perfil?.nivelAtual ?? 'iniciante';

    return `Trilha: ${trilha}
Descrição da trilha: ${descricao}
Módulo: ${modulo.titulo}
Objetivo de aprendizagem: ${modulo.objetivoAprendizagem ?? 'Não informado'}
Nível do aluno: ${nivel}
Tópico a pesquisar: ${topico}
Quantidade desejada de fontes: ${limite}

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
