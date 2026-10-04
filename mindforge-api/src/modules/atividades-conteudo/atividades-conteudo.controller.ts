import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query } from '@nestjs/common';
import { AtividadesConteudoService } from './atividades-conteudo.service';
import { PerfilAtividadeDto, ResponderAtividadeDto } from './dto/responder-atividade.dto';

@Controller('atividades-conteudo/conteudos')
export class AtividadesConteudoController {
  constructor(private readonly service: AtividadesConteudoService) {}

  @Get(':conteudoId')
  listar(@Param('conteudoId', ParseUUIDPipe) id: string, @Query() query: PerfilAtividadeDto) {
    return this.service.listar(id, query.perfilId);
  }

  @Put(':conteudoId/:chave')
  responder(
    @Param('conteudoId', ParseUUIDPipe) id: string,
    @Param('chave') chave: string,
    @Body() dto: ResponderAtividadeDto,
  ) {
    return this.service.responder(id, chave, dto);
  }
}
