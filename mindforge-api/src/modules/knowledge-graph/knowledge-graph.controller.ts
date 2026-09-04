import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { CriarCompetenciaDto } from './dto/criar-competencia.dto';
import { CriarRelacaoDto } from './dto/criar-relacao.dto';
import { AtualizarProgressoDto } from './dto/atualizar-progresso.dto';
import { CriarProgressoModuloDto } from './dto/criar-progresso-modulo.dto';

@Controller('knowledge-graph')
export class KnowledgeGraphController {
  constructor(private readonly service: KnowledgeGraphService) {}

  @Post('competencias')
  criarCompetencia(@Body() dto: CriarCompetenciaDto) {
    return this.service.criarCompetencia(dto);
  }

  @Get('competencias')
  listarCompetencias() {
    return this.service.listarCompetencias();
  }

  @Get('competencias/:id')
  buscarCompetencia(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('perfilId', new ParseUUIDPipe({ optional: true })) perfilId?: string,
  ) {
    return this.service.buscarCompetenciaPorId(id, perfilId);
  }

  @Get('competencias/:id/pre-requisitos')
  buscarPreRequisitos(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarCaminhoDePreRequisitos(id);
  }

  @Get('competencias/:id/dependentes')
  buscarDependentes(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarDependentes(id);
  }

  @Post('relacoes')
  criarRelacao(@Body() dto: CriarRelacaoDto) {
    return this.service.criarRelacao(dto);
  }

  @Get('perfis/:perfilId')
  listarGrafoDoPerfil(@Param('perfilId', ParseUUIDPipe) perfilId: string) {
    return this.service.listarGrafoDoPerfil(perfilId);
  }

  @Get('perfis/:perfilId/proximos')
  async proximosPassos(
    @Param('perfilId', ParseUUIDPipe) perfilId: string,
  ): Promise<
    Array<{ id: string; nome: string; progresso: string | null; prerequisitosPendentes: number }>
  > {
    return this.service.recomendarCompetencias(perfilId);
  }

  @Post('progresso')
  atualizarProgresso(@Body() dto: AtualizarProgressoDto) {
    return this.service.atualizarProgresso(dto);
  }

  @Post('progresso/modulo')
  marcarProgressoPorModulo(@Body() dto: CriarProgressoModuloDto) {
    return this.service.marcarProgressoPorModulo(dto.moduloId, dto.perfilId);
  }
}
