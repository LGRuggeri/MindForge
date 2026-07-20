import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AgentesService } from '../agentes/agentes.service';
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

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private readonly repo: PlannerRepository,
    private readonly agentes: AgentesService,
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
      parser: (raw) => this.parseJsonSeguro<PlanoSugerido>(raw),
      temperature: 0.7,
    });

    const trilha = await this.repo.criarTrilha({
      objetivoId,
      versao: plano.versao || 1,
      status: 'ativa',
      geradoPorAgente: 'planner',
      metadata: { tituloTrilha: plano.tituloTrilha },
    });

    const modulos = await this.repo.criarModulos(
      plano.modulos.map((m) => ({
        trilhaId: trilha.id,
        ordem: m.ordem,
        titulo: m.titulo,
        objetivoAprendizagem: m.objetivoAprendizagem,
        tempoEstimadoMin: m.tempoEstimadoMin,
      })),
    );

    this.logger.log(`Trilha gerada: ${trilha.id} com ${modulos.length} módulos`);

    return {
      ...trilha,
      modulos,
    };
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
      this.logger.error('Falha ao parsear JSON do Planner', raw);
      throw new Error('O agente Planner retornou uma resposta inválida');
    }
  }
}
