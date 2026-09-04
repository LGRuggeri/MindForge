import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { AgentesService } from '../agentes/agentes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { CriarObjetivoDto } from './dto/criar-objetivo.dto';
import { PlannerRepository } from './planner.repository';

export interface ModuloSugerido {
  ordem: number;
  titulo: string;
  objetivoAprendizagem: string;
  tempoEstimadoMin: number;
}

export interface PlanoSugerido {
  tituloTrilha: string;
  versao: number;
  modulos: ModuloSugerido[];
}

const moduloSugeridoSchema = z.object({
  ordem: z.number().int().positive(),
  titulo: z.string().min(1),
  objetivoAprendizagem: z.string().min(1),
  tempoEstimadoMin: z.number().int().positive(),
});

const planoSugeridoSchema = z.object({
  tituloTrilha: z.string().min(1),
  versao: z.number().int().optional(),
  modulos: z.array(moduloSugeridoSchema).min(3).max(8),
});

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private readonly repo: PlannerRepository,
    private readonly agentes: AgentesService,
    private readonly knowledgeGraph: KnowledgeGraphService,
  ) {}

  async criarObjetivo(dto: CriarObjetivoDto) {
    return this.repo.criarObjetivo({
      perfilId: dto.perfilId,
      titulo: dto.titulo,
      descricao: dto.descricao,
      nivelDesejado: dto.nivelDesejado,
      prazoEstimado: dto.prazoEstimado,
    });
  }

  async listarObjetivosDoPerfil(perfilId: string) {
    return this.repo.listarObjetivosDoPerfil(perfilId);
  }

  async buscarModuloPorId(id: string) {
    const modulo = await this.repo.buscarModuloPorId(id);
    if (!modulo) {
      throw new NotFoundException(`Módulo ${id} não encontrado`);
    }
    return modulo;
  }

  async buscarObjetivoPorId(id: string) {
    const objetivo = await this.repo.buscarObjetivoPorId(id);
    if (!objetivo) {
      throw new NotFoundException(`Objetivo ${id} não encontrado`);
    }
    return objetivo;
  }

  async gerarTrilha(objetivoId: string) {
    const objetivo = await this.buscarObjetivoPorId(objetivoId);

    const plano = await this.agentes.executar<PlanoSugerido>({
      agente: 'planner',
      system: this.montarSystemPrompt(),
      user: this.montarUserPrompt(objetivo),
      entrada: { objetivoId, titulo: objetivo.titulo },
      parser: (raw) => this.parsePlanoSugerido(raw),
      temperature: 0.7,
    });

    const { trilha, modulos } = await this.repo.executarEmTransacao(async (tx) => {
      const trilha = await this.repo.criarTrilha(
        {
          objetivoId,
          versao: plano.versao || 1,
          status: 'ativa',
          geradoPorAgente: 'planner',
          metadata: { tituloTrilha: plano.tituloTrilha },
        },
        tx,
      );

      await this.repo.substituirTrilhasAnteriores(objetivoId, trilha.id, tx);

      const modulos = await this.repo.criarModulos(
        plano.modulos.map((m) => ({
          trilhaId: trilha.id,
          ordem: m.ordem,
          titulo: m.titulo,
          objetivoAprendizagem: m.objetivoAprendizagem,
          tempoEstimadoMin: m.tempoEstimadoMin,
        })),
        tx,
      );

      return { trilha, modulos };
    });

    await this.popularKnowledgeGraph(modulos);

    this.logger.log(`Trilha gerada: ${trilha.id} com ${modulos.length} módulos`);

    return {
      ...trilha,
      modulos,
    };
  }

  private async popularKnowledgeGraph(
    modulos: Array<{
      id: string;
      ordem: number;
      titulo: string;
      objetivoAprendizagem: string | null;
    }>,
  ) {
    const competenciasPorModulo: Array<{ moduloId: string; competenciaId: string; nome: string }> =
      [];

    for (const modulo of modulos) {
      const nomeCompetencia = modulo.objetivoAprendizagem || modulo.titulo;
      const competencia = await this.knowledgeGraph.criarCompetencia({
        nome: nomeCompetencia,
        descricao: `Competência derivada do módulo "${modulo.titulo}"`,
        categoria: 'planner',
      });
      await this.knowledgeGraph.vincularCompetenciasAoModulo(modulo.id, [
        {
          nome: competencia.nome,
          descricao: competencia.descricao ?? undefined,
          categoria: 'planner',
        },
      ]);
      competenciasPorModulo.push({
        moduloId: modulo.id,
        competenciaId: competencia.id,
        nome: competencia.nome,
      });
    }

    for (let i = 1; i < competenciasPorModulo.length; i++) {
      const anterior = competenciasPorModulo[i - 1];
      const atual = competenciasPorModulo[i];
      await this.knowledgeGraph.criarRelacaoSeNaoExistir({
        competenciaOrigemId: anterior.competenciaId,
        competenciaDestinoId: atual.competenciaId,
        tipoRelacao: 'pre_requisito',
      });
    }
  }

  private montarSystemPrompt(): string {
    return `Você é o Planner do MindForge, um assistente de ensino personalizado.
Sua tarefa é transformar um objetivo de estudo em uma trilha de aprendizado estruturada.

Regras:
1. Analise o objetivo e crie de 3 a 8 módulos sequenciais.
2. Cada módulo deve ter um título claro, um objetivo de aprendizagem mensurável e tempo estimado em minutos.
3. Respeite o nível desejado do aluno (iniciante, intermediário, avançado).
4. Retorne APENAS um objeto JSON válido, sem markdown, sem explicações adicionais.

Formato obrigatório:
{
  "tituloTrilha": "string",
  "versao": 1,
  "modulos": [
    {
      "ordem": 1,
      "titulo": "string",
      "objetivoAprendizagem": "string",
      "tempoEstimadoMin": 60
    }
  ]
}`;
  }

  private montarUserPrompt(objetivo: {
    titulo: string;
    descricao: string | null;
    nivelDesejado: string | null;
    prazoEstimado: string | null;
  }): string {
    return `Objetivo de estudo: ${objetivo.titulo}
Descrição: ${objetivo.descricao ?? 'Não informada'}
Nível desejado: ${objetivo.nivelDesejado ?? 'iniciante'}
Prazo estimado: ${objetivo.prazoEstimado ?? 'não informado'}

Gere a trilha de aprendizado no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    const limpo = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(limpo) as T;
    } catch {
      this.logger.error('Falha ao parsear JSON do Planner');
      throw new Error('O agente Planner retornou uma resposta inválida');
    }
  }

  private parsePlanoSugerido(raw: string): PlanoSugerido {
    const parsed = this.parseJsonSeguro<unknown>(raw);
    const resultado = planoSugeridoSchema.safeParse(parsed);
    if (!resultado.success) {
      const detalhes = resultado.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      this.logger.error(`Resposta do Planner fora do formato esperado (${detalhes})`);
      throw new Error(`O agente Planner retornou um plano inválido: ${detalhes}`);
    }
    return resultado.data as PlanoSugerido;
  }
}
