import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';
import { CriarCompetenciaDto } from './dto/criar-competencia.dto';
import { CriarRelacaoDto } from './dto/criar-relacao.dto';
import { AtualizarProgressoDto } from './dto/atualizar-progresso.dto';

export interface CompetenciaExtraida {
  nome: string;
  descricao?: string;
  categoria?: string;
}

export interface GrafoVisualNode {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  nivelAtual: string;
}

export interface GrafoVisualEdge {
  id: string;
  source: string;
  target: string;
  tipo: string;
}

export interface GrafoVisual {
  nodes: GrafoVisualNode[];
  edges: GrafoVisualEdge[];
}

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(private readonly repo: KnowledgeGraphRepository) {}

  async criarCompetencia(dto: CriarCompetenciaDto) {
    const existente = await this.repo.buscarCompetenciaPorNome(dto.nome);
    if (existente) {
      this.logger.debug(`Competência já existe: ${existente.id} (${existente.nome})`);
      return existente;
    }
    const competencia = await this.repo.criarCompetencia(dto);
    this.logger.log(`Competência criada: ${competencia.id} (${competencia.nome})`);
    return competencia;
  }

  async criarRelacao(dto: CriarRelacaoDto) {
    const relacao = await this.repo.criarRelacao(dto);
    this.logger.log(
      `Relação ${relacao.id}: ${relacao.competenciaOrigemId} --[${relacao.tipoRelacao}]--> ${relacao.competenciaDestinoId}`,
    );
    return relacao;
  }

  async listarCompetencias() {
    return this.repo.listarCompetencias();
  }

  async buscarCompetenciaPorId(id: string) {
    const competencia = await this.repo.buscarCompetenciaPorId(id);
    if (!competencia) {
      throw new NotFoundException(`Competência ${id} não encontrada`);
    }
    return competencia;
  }

  async listarGrafoDoPerfil(perfilId: string) {
    const competencias = await this.repo.listarCompetenciasDoPerfil(perfilId);
    return competencias.map((c) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      categoria: c.categoria,
      progresso: c.progresso?.[0] ?? null,
      modulos: c.modulos.map((m) => m.modulo),
    }));
  }

  async listarGrafoVisualDoPerfil(perfilId: string): Promise<GrafoVisual> {
    const competencias = await this.repo.listarCompetenciasDoPerfilComRelacoes(perfilId);

    const nodes: GrafoVisualNode[] = competencias.map((c) => ({
      id: c.id,
      nome: c.nome,
      descricao: c.descricao,
      categoria: c.categoria,
      nivelAtual: c.progresso?.[0]?.nivelAtual ?? 'nao_iniciado',
    }));

    const edgeIds = new Set<string>();
    const edges: GrafoVisualEdge[] = [];

    for (const competencia of competencias) {
      for (const relacao of competencia.relacoesOrigem) {
        const source = competencia.id;
        const target = relacao.destino.id;
        const edgeId = `${source}->${target}`;
        if (!edgeIds.has(edgeId)) {
          edgeIds.add(edgeId);
          edges.push({
            id: edgeId,
            source,
            target,
            tipo: relacao.tipoRelacao,
          });
        }
      }
    }

    return { nodes, edges };
  }

  async buscarCaminhoDePreRequisitos(competenciaId: string) {
    return this.repo.buscarCaminhoDePreRequisitos(competenciaId);
  }

  async buscarDependentes(competenciaId: string) {
    return this.repo.buscarDependentes(competenciaId);
  }

  async atualizarProgresso(dto: AtualizarProgressoDto) {
    return this.repo.atualizarProgresso(dto.competenciaId, dto.perfilId, dto.nivel, dto.evidencia);
  }

  async marcarProgressoPorModulo(
    moduloId: string,
    perfilId: string,
    nivel: 'nao_iniciado' | 'aprendendo' | 'praticando' | 'dominado' = 'aprendendo',
  ) {
    const vinculos = await this.repo.listarCompetenciasDoModulo(moduloId);
    if (vinculos.length === 0) {
      this.logger.warn(`Nenhuma competência vinculada ao módulo ${moduloId}`);
      return { atualizados: 0 };
    }

    let atualizados = 0;
    for (const v of vinculos) {
      await this.repo.atualizarProgresso(
        v.competencia.id,
        perfilId,
        nivel,
        `Módulo ${v.moduloId} concluído/estudado`,
      );
      atualizados++;
    }

    this.logger.log(`Progresso atualizado para ${atualizados} competências do perfil ${perfilId}`);
    return { atualizados, moduloId };
  }

  async vincularCompetenciasAoModulo(
    moduloId: string,
    competenciasExtraidas: CompetenciaExtraida[],
  ) {
    if (competenciasExtraidas.length === 0) {
      return { vinculados: 0 };
    }

    const competenciasCriadas = await Promise.all(
      competenciasExtraidas.map((c) =>
        this.criarCompetencia({
          nome: c.nome,
          descricao: c.descricao,
          categoria: c.categoria ?? 'synthesizer',
        }),
      ),
    );

    const vinculos = await this.repo.vincularModuloCompetencias(
      competenciasCriadas.map((c) => ({ moduloId, competenciaId: c.id })),
    );

    this.logger.log(`${vinculos.length} competências vinculadas ao módulo ${moduloId}`);
    return { vinculados: vinculos.length, competenciaIds: competenciasCriadas.map((c) => c.id) };
  }

  async criarCadeiaDePreRequisitos(
    moduloId: string,
    competenciasModulo: CompetenciaExtraida[],
    competenciasAnteriores: { id: string; nome: string }[],
  ) {
    if (competenciasAnteriores.length === 0 || competenciasModulo.length === 0) {
      return { relacoes: 0 };
    }

    const relacoes: Array<{
      competenciaOrigemId: string;
      competenciaDestinoId: string;
      tipoRelacao: string;
    }> = [];
    for (const anterior of competenciasAnteriores) {
      for (const atual of competenciasModulo) {
        const compAtual = await this.criarCompetencia({
          nome: atual.nome,
          descricao: atual.descricao,
          categoria: atual.categoria ?? 'planner',
        });
        relacoes.push({
          competenciaOrigemId: anterior.id,
          competenciaDestinoId: compAtual.id,
          tipoRelacao: 'pre_requisito',
        });
      }
    }

    const criadas = await Promise.all(relacoes.map((r) => this.repo.criarRelacao(r)));
    return { relacoes: criadas.length };
  }
}
