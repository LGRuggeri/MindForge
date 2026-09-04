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
import { ProjetosService } from './projetos.service';
import { CriarProjetoDto, GerarProjetoDto, SubmeterEntregaDto } from './dto';

@Controller('projetos')
export class ProjetosController {
  constructor(private readonly service: ProjetosService) {}

  @Post()
  async criar(@Body(new ValidationPipe({ transform: true })) dto: CriarProjetoDto) {
    return this.service.criar(dto);
  }

  @Post('gerar')
  async gerar(
    @Body(new ValidationPipe({ transform: true })) dto: GerarProjetoDto,
  ) {
    return this.service.gerar(dto);
  }

  @Get()
  async listar(
    @Query('moduloId', new ParseUUIDPipe({ optional: true })) moduloId?: string,
    @Query('objetivoId', new ParseUUIDPipe({ optional: true })) objetivoId?: string,
  ) {
    return this.service.listar({ moduloId, objetivoId });
  }

  @Get(':id')
  async buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarPorId(id);
  }

  @Post(':id/entregas')
  async submeterEntrega(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) dto: SubmeterEntregaDto,
    @Query('perfilId') perfilId?: string,
  ) {
    return this.service.submeterEntrega(id, dto, perfilId);
  }

  @Post(':id/concluir')
  async concluir(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.concluir(id);
  }
}
