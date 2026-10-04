import type { DrizzleDb } from '../../database/database.module';
import { resolverEscopoModulo, selecionarIndices } from './trilhas-guiadas/escopo-modulo';
import { lerJsonIa } from '../../common/ia/json-ia';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';
import { AgentesService } from '../agentes/agentes.service';
import { KnowledgeGraphService } from '../knowledge-graph/knowledge-graph.service';
import { CriarObjetivoDto } from './dto/criar-objetivo.dto';
import { PlannerRepository } from './planner.repository';
import { buscarPrograma, listarCertificacoes, listarProgramas } from './trilhas-guiadas/catalogo';
import { ProgramaTrilha } from './trilhas-guiadas/types';

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
    const dados = {
      perfilId: dto.perfilId,
      titulo: dto.titulo,
      descricao: dto.descricao,
      nivelDesejado: dto.nivelDesejado,
      prazoEstimado: dto.prazoEstimado,
    };
    if (!dto.programaCodigo) {
      if (dto.modulosIndices) throw new BadRequestException('Informe o programa da seleção.');
      return this.repo.criarObjetivo(dados);
    }
    const programa = buscarPrograma(dto.programaCodigo);
    if (!programa) throw new BadRequestException('Programa não disponível');
    const indices = selecionarIndices(programa.modulos.length, dto.modulosIndices);
    if (!(await this.repo.buscarPerfilPorId(dto.perfilId)))
      throw new NotFoundException('Perfil não encontrado');
    const resultado = await this.repo.executarEmTransacao(async (tx) => {
      const objetivo = await this.repo.criarObjetivo(dados, tx);
      const trilha = await this.persistirPlano(
        objetivo.id,
        this.montarPlanoPrograma(programa, indices),
        programa,
        indices,
        tx,
      );
      return { ...objetivo, trilhas: [trilha] };
    });
    await this.atualizarGrafo(resultado.trilhas[0].modulos);
    return resultado;
  }

  async listarObjetivosDoPerfil(perfilId: string) {
    return this.repo.listarObjetivosDoPerfil(perfilId);
  }

  async buscarModuloPorId(id: string) {
    const modulo = await this.repo.buscarModuloPorId(id);
    if (!modulo) {
      throw new NotFoundException(`Módulo ${id} não encontrado`);
    }
    return { ...modulo, escopoEstudo: resolverEscopoModulo(modulo) };
  }

  async concluirModulo(id: string, perfilId: string) {
    return this.repo.executarEmTransacao(async (tx) => {
      const modulo = await this.repo.buscarModuloPorId(id, tx);
      if (!modulo) throw new NotFoundException('Módulo não encontrado');
      if (modulo.trilha.objetivo.perfilId !== perfilId) {
        throw new ForbiddenException('Módulo não pertence ao perfil informado');
      }
      if (modulo.status === 'concluido') return modulo;
      const concluido = await this.repo.marcarModuloConcluido(id, tx);
      if (!concluido) throw new NotFoundException('Módulo não encontrado');
      await this.repo.registrarEstudoCompetencias(id, perfilId, tx);
      return { ...modulo, ...concluido };
    });
  }

  async buscarObjetivoPorId(id: string) {
    const objetivo = await this.repo.buscarObjetivoPorId(id);
    if (!objetivo) {
      throw new NotFoundException(`Objetivo ${id} não encontrado`);
    }
    return objetivo;
  }

  listarCertificacoes() {
    return listarCertificacoes();
  }

  listarProgramas() {
    return listarProgramas();
  }

  async removerObjetivo(id: string) {
    // 404 se não existir antes de tentar remover.
    await this.buscarObjetivoPorId(id);
    // Competências dos módulos deste objetivo precisam ser coletadas antes da
    // exclusão — depois dela a cascata já apagou os vínculos (modulo_competencias).
    const competenciasVinculadas = await this.repo.listarCompetenciasDosModulosDoObjetivo(id);
    await this.repo.removerObjetivo(id);
    const orfasRemovidas = await this.repo.removerCompetenciasOrfas(competenciasVinculadas);
    this.logger.log(`Objetivo removido: ${id} (${orfasRemovidas} competências órfãs removidas)`);
  }

  async gerarTrilha(objetivoId: string, programaCodigo?: string, modulosIndices?: number[]) {
    const objetivo = await this.buscarObjetivoPorId(objetivoId);

    const programa = programaCodigo ? buscarPrograma(programaCodigo) : undefined;
    if (programaCodigo && !programa) {
      throw new BadRequestException(`Trilha guiada ${programaCodigo} não disponível`);
    }

    if (!programa && modulosIndices)
      throw new BadRequestException('Informe o programa da seleção.');
    const indices = programa
      ? selecionarIndices(programa.modulos.length, modulosIndices)
      : undefined;
    const plano = programa
      ? this.montarPlanoPrograma(programa, indices)
      : await this.agentes.executar<PlanoSugerido>({
          agente: 'planner',
          system: this.montarSystemPrompt(),
          user: this.montarUserPrompt(objetivo),
          entrada: { objetivoId, titulo: objetivo.titulo },
          parser: (raw) => this.parsePlanoSugerido(raw),
          temperature: 0.7,
        });

    const trilha = await this.repo.executarEmTransacao((tx) =>
      this.persistirPlano(objetivoId, plano, programa, indices, tx),
    );
    await this.atualizarGrafo(trilha.modulos);
    this.logger.log(`Trilha gerada: ${trilha.id} com ${trilha.modulos.length} módulos`);
    return trilha;
  }

  private async persistirPlano(
    objetivoId: string,
    plano: PlanoSugerido,
    programa: ProgramaTrilha | undefined,
    indices: number[] | undefined,
    tx: DrizzleDb,
  ) {
    const trilha = await this.repo.criarTrilha(
      {
        objetivoId,
        versao: plano.versao || 1,
        status: 'ativa',
        geradoPorAgente: programa
          ? programa.tipo === 'certificacao'
            ? 'catalogo-certificacoes'
            : 'catalogo-trilhas'
          : 'planner',
        metadata: {
          tituloTrilha: plano.tituloTrilha,
          ...(programa
            ? {
                programa,
                modulosIndices: indices,
                ...(programa.tipo === 'certificacao' ? { certificacao: programa } : {}),
              }
            : {}),
        },
      },
      tx,
    );
    await this.repo.substituirTrilhasAnteriores(objetivoId, trilha.id, tx);
    const modulos = await this.repo.criarModulos(
      plano.modulos.map((m) => ({ ...m, trilhaId: trilha.id })),
      tx,
    );
    if (programa && indices && programa.modulos.some((m) => m.fontes?.length)) {
      await this.repo.criarFontesPrograma(
        modulos.flatMap((modulo) =>
          (programa.modulos[indices[modulo.ordem - 1] - 1].fontes ?? []).map((fonte) => ({
            moduloId: modulo.id,
            titulo: fonte.titulo,
            url: fonte.url,
            tipo: 'documentacao_oficial',
            origem: 'busca_web' as const,
            resumo: 'Referência da grade escolhida; consulta indicada no trecho registrado.',
            trechoConsultado: fonte.trechoConsultado,
            localizador: fonte.localizador,
            consultadoEm: new Date(fonte.consultadoEm),
          })),
        ),
        tx,
      );
    }
    return { ...trilha, modulos };
  }

  private async atualizarGrafo(modulos: Parameters<PlannerService['popularKnowledgeGraph']>[0]) {
    try {
      await this.popularKnowledgeGraph(modulos);
    } catch {
      this.logger.warn('Estudo salvo; não foi possível atualizar as competências.');
    }
  }

  private montarPlanoPrograma(
    programa: ProgramaTrilha,
    indices = selecionarIndices(programa.modulos.length),
  ): PlanoSugerido {
    return {
      tituloTrilha: `${programa.codigo} — ${programa.nome}`,
      versao: 1,
      modulos: indices.map((selecionado, indice) => {
        const modulo = programa.modulos[selecionado - 1];
        return {
          ordem: indice + 1,
          titulo: modulo.titulo,
          objetivoAprendizagem: modulo.objetivoAprendizagem,
          tempoEstimadoMin: modulo.tempoEstimadoMin,
        };
      }),
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
3. Respeite o nível do aluno no assunto (iniciante, intermediário, avançado), informado no objetivo.
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
Nível do aluno no assunto: ${objetivo.nivelDesejado ?? 'iniciante'}
Prazo estimado: ${objetivo.prazoEstimado ?? 'não informado'}

Gere a trilha de aprendizado no formato JSON especificado.`;
  }

  private parseJsonSeguro<T>(raw: string): T {
    try {
      return lerJsonIa(raw) as T;
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
