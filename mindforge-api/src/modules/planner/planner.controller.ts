import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { CriarObjetivoDto } from './dto/criar-objetivo.dto';
import { GerarTrilhaDto } from './dto/gerar-trilha.dto';

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

  @Delete('objetivos/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removerObjetivo(@Param('id') id: string) {
    await this.service.removerObjetivo(id);
  }

  @Post('trilhas')
  @HttpCode(HttpStatus.CREATED)
  gerarTrilha(@Body() dto: GerarTrilhaDto) {
    return this.service.gerarTrilha(dto.objetivoId);
  }

  @Get('modulos/:id')
  buscarModulo(@Param('id') id: string) {
    return this.service.buscarModuloPorId(id);
  }
}
