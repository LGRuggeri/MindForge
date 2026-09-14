import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PesquisarDto } from './dto/pesquisar.dto';
import { ResearchService } from './research.service';

@Controller('research')
export class ResearchController {
  constructor(private readonly service: ResearchService) {}

  @Post('fontes')
  @HttpCode(HttpStatus.CREATED)
  pesquisar(@Body() dto: PesquisarDto) {
    return this.service.pesquisar(dto);
  }

  @Get('modulos/:moduloId/fontes')
  listarPorModulo(@Param('moduloId', ParseUUIDPipe) moduloId: string) {
    return this.service.listarPorModulo(moduloId);
  }
}
