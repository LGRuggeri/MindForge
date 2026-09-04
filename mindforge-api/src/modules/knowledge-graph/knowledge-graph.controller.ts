import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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
  buscarCompetencia(@Param('id') id: string) {
    return this.service.buscarCompetenciaPorId(id);
  }

  @Get('competencias/:id/pre-requisitos')
  buscarPreRequisitos(@Param('id') id: string) {
    return this.service.buscarCaminhoDePreRequisitos(id);
  }

  @Get('competencias/:id/dependentes')
  buscarDependentes(@Param('id') id: string) {
    return this.service.buscarDependentes(id);
  }

  @Post('relacoes')
  criarRelacao(@Body() dto: CriarRelacaoDto) {
    return this.service.criarRelacao(dto);
  }

  @Get('perfis/:perfilId')
  listarGrafoDoPerfil(@Param('perfilId') perfilId: string) {
    return this.service.listarGrafoDoPerfil(perfilId);
  }

  @Get('perfis/:perfilId/grafo')
  listarGrafoVisualDoPerfil(@Param('perfilId') perfilId: string) {
    return this.service.listarGrafoVisualDoPerfil(perfilId);
  }

  @Get('perfis/:perfilId/proximos')
  async proximosPassos(@Param('perfilId') perfilId: string) {
    const grafo = await this.service.listarGrafoDoPerfil(perfilId);
    const naoDominados = grafo.filter((c) => c.progresso?.nivelAtual !== 'dominado');
    return naoDominados.slice(0, 10);
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
