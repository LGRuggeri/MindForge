import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { AgentesService } from './agentes.service';
import { ListarExecucoesQueryDto } from './dto/listar-execucoes-query.dto';

@Controller('agentes')
export class AgentesController {
  constructor(private readonly service: AgentesService) {}

  @Get('execucoes')
  listarExecucoes(@Query() query: ListarExecucoesQueryDto) {
    return this.service.listar(query);
  }

  @Get('execucoes/:id')
  buscarExecucaoPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarPorId(id);
  }
}
