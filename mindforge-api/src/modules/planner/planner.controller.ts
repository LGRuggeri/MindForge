import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PlannerService } from './planner.service';
import { CriarObjetivoDto } from './dto/criar-objetivo.dto';
import { GerarTrilhaDto } from './dto/gerar-trilha.dto';
import { ConcluirModuloDto } from './dto/concluir-modulo.dto';

@Controller('planner')
export class PlannerController {
  constructor(private readonly service: PlannerService) {}

  @Post('objetivos')
  @HttpCode(HttpStatus.CREATED)
  criarObjetivo(@Body() dto: CriarObjetivoDto) {
    return this.service.criarObjetivo(dto);
  }

  @Get('objetivos/:id')
  buscarObjetivo(@Param('id') id: string) {
    return this.service.buscarObjetivoPorId(id);
  }

  @Get('perfis/:perfilId/objetivos')
  listarObjetivosDoPerfil(@Param('perfilId') perfilId: string) {
    return this.service.listarObjetivosDoPerfil(perfilId);
  }

  @Get('certificacoes')
  listarCertificacoes() {
    return this.service.listarCertificacoes();
  }

  @Get('programas')
  listarProgramas() {
    return this.service.listarProgramas();
  }

  @Delete('objetivos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removerObjetivo(@Param('id') id: string) {
    await this.service.removerObjetivo(id);
  }

  @Post('trilhas')
  @HttpCode(HttpStatus.CREATED)
  gerarTrilha(@Body() dto: GerarTrilhaDto) {
    if (dto.programaCodigo && dto.certificacaoCodigo) {
      throw new BadRequestException('Informe apenas um código de trilha guiada');
    }
    const codigo = dto.programaCodigo ?? dto.certificacaoCodigo;
    return dto.modulosIndices
      ? this.service.gerarTrilha(dto.objetivoId, codigo, dto.modulosIndices)
      : this.service.gerarTrilha(dto.objetivoId, codigo);
  }

  @Get('modulos/:id')
  buscarModulo(@Param('id') id: string) {
    return this.service.buscarModuloPorId(id);
  }

  @Post('modulos/:id/concluir')
  @HttpCode(HttpStatus.OK)
  concluirModulo(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConcluirModuloDto) {
    return this.service.concluirModulo(id, dto.perfilId);
  }
}
