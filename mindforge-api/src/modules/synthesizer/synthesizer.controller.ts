import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { GerarConteudoDto } from './dto/gerar-conteudo.dto';
import { SynthesizerService } from './synthesizer.service';

@Controller('synthesizer')
export class SynthesizerController {
  constructor(private readonly service: SynthesizerService) {}

  @Post('conteudos')
  @HttpCode(HttpStatus.CREATED)
  gerar(@Body() dto: GerarConteudoDto) {
    return this.service.gerar(dto);
  }

  @Get('modulos/:moduloId/conteudos')
  listarPorModulo(@Param('moduloId') moduloId: string) {
    return this.service.listarPorModulo(moduloId);
  }
}
