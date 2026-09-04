import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';
import { CriarAvaliacaoDto, GerarExercicioDto } from './dto';
import { SubmeterAvaliacaoDto } from './dto/submeter-avaliacao.dto';
import { SubmeterTentativaDto } from './dto/submeter-tentativa.dto';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';

@Controller('exercicios-avaliacoes')
export class ExerciciosAvaliacoesController {
  constructor(
    private readonly service: ExerciciosAvaliacoesService,
    private readonly avaliacoesService: AvaliacoesService,
    private readonly revisaoService: RevisaoEspacadaService,
  ) {}

  @Post('avaliacoes')
  async criarAvaliacao(@Body(new ValidationPipe({ transform: true })) dto: CriarAvaliacaoDto) {
    return this.avaliacoesService.criar(dto);
  }

  @Post('avaliacoes/submeter')
  async submeterAvaliacao(
    @Body(new ValidationPipe({ transform: true })) dto: SubmeterAvaliacaoDto,
  ) {
    return this.avaliacoesService.submeter(dto);
  }

  @Get('revisao')
  async listarRevisoes(@Query('data') data?: string) {
    return this.revisaoService.listarProximasRevisoes(data);
  }

  @Post('exercicios/gerar')
  async gerarExercicio(@Body(new ValidationPipe({ transform: true })) dto: GerarExercicioDto) {
    return this.service.gerarExercicio(dto);
  }

  @Post('exercicios/:id/tentativas')
  async submeterTentativa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) dto: SubmeterTentativaDto,
  ) {
    return this.service.submeterTentativa({ ...dto, exercicioId: id });
  }

  @Get('exercicios')
  async listarPorModulo(@Query('moduloId', ParseUUIDPipe) moduloId: string) {
    return this.service.listarPorModulo(moduloId);
  }

  @Get('exercicios/:id/estatisticas')
  async estatisticas(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.estatisticasPorExercicio(id);
  }
}
