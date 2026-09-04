import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE, DrizzleDb } from '../../database/database.module';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';
import { CriarCompetenciaDto } from './dto/criar-competencia.dto';
import { CriarRelacaoDto } from './dto/criar-relacao.dto';
import { AtualizarProgressoDto } from './dto/atualizar-progresso.dto';

export interface CompetenciaExtraida {
  nome: string;
  descricao?: string;
  categoria?: string;
}

@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(
    private readonly repo: KnowledgeGraphRepository,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
  ) {}

  async criarCompetencia(dto: CriarCompetenciaDto) {
    return this.criarCompetenciaInterno(dto);
  }

  private async criarCompetenciaTx(dto: CriarCompetenciaDto, tx: DrizzleDb) {
    return this.criarCompetenciaInterno(dto, tx);
  }

  private async criarCompetenciaInterno(dto: CriarCompetenciaDto, tx?: DrizzleDb) {
    const existente = await this.repo.buscarCompetenciaPorNome(dto.nome, tx);
    if (existente) {
      this.logger.debug(`Competência já existe: ${existente.id} (${existente.nome})`);
      return existente;
    }
    const competencia = await this.repo.criarCompetencia(dto, tx);
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

  async criarRelacaoSeNaoExistir(dto: CriarRelacaoDto) {
    return this.criarRelacaoSeNaoExistirInterno(dto);
  }

  private async criarRelacaoSeNaoExistirTx(dto: CriarRelacaoDto, tx: DrizzleDb) {
    return this.criarRelacaoSeNaoExistirInterno(dto, tx);
  }

  private async criarRelacaoSeNaoExistirInterno(dto: CriarRelacaoDto, tx?: DrizzleDb) {
    const relacao = await this.repo.criarRelacaoSeNaoExistir(dto, tx);
    if (relacao) {
      this.logger.log(
        `Relação ${relacao.id}: ${relacao.competenciaOrigemId} --[${relacao.tipoRelacao}]--> ${relacao.competenciaDestinoId}`,
      );
    }
    return relacao;
  }

  async listarCompetencias() {
    return this.repo.listarCompetencias();
  }

  async buscarCompetenciaPorId(id: string, perfilId?: string) {
    const competencia = await this.repo.buscarCompetenciaPorId(id, perfilId);
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

  async recomendarCompetencias(
    perfilId: string,
  ): Promise<
    Array<{ id: string; nome: string; progresso: string | null; prerequisitosPendentes: number }>
  > {
    return this.repo.recomendarCompetencias(perfilId);
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
  ): Promise<{ vinculados: number; competenciaIds: string[] }> {
    if (competenciasExtraidas.length === 0) {
      return { vinculados: 0, competenciaIds: [] };
    }

    return this.db.transaction(async (tx) => {
      const competenciasCriadas = await Promise.all(
        competenciasExtraidas.map((c) =>
          this.criarCompetenciaTx(
            {
              nome: c.nome,
              descricao: c.descricao,
              categoria: c.categoria ?? 'synthesizer',
            },
            tx,
          ),
        ),
      );

      const vinculos = await this.repo.vincularModuloCompetencias(
        competenciasCriadas.map((c) => ({ moduloId, competenciaId: c.id })),
        tx,
      );

      this.logger.log(`${vinculos.length} competências vinculadas ao módulo ${moduloId}`);
      return { vinculados: vinculos.length, competenciaIds: competenciasCriadas.map((c) => c.id) };
    });
  }

  async criarCadeiaDePreRequisitos(
    moduloId: string,
    competenciasModulo: CompetenciaExtraida[],
    competenciasAnteriores: { id: string; nome: string }[],
  ) {
    if (competenciasAnteriores.length === 0 || competenciasModulo.length === 0) {
      return { relacoes: 0 };
    }

    return this.db.transaction(async (tx) => {
      const relacoes: CriarRelacaoDto[] = [];
      for (const anterior of competenciasAnteriores) {
        for (const atual of competenciasModulo) {
          const compAtual = await this.criarCompetenciaTx(
            {
              nome: atual.nome,
              descricao: atual.descricao,
              categoria: atual.categoria ?? 'planner',
            },
            tx,
          );
          relacoes.push({
            competenciaOrigemId: anterior.id,
            competenciaDestinoId: compAtual.id,
            tipoRelacao: 'pre_requisito',
          });
        }
      }

      const criadas = await Promise.all(
        relacoes.map((r) => this.criarRelacaoSeNaoExistirTx(r, tx)),
      );
      return { relacoes: criadas.filter(Boolean).length };
    });
  }
}
