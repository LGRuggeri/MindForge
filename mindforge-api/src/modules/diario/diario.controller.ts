import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RegistrarDiarioDto } from './dto/registrar-diario.dto';
import { DiarioService } from './diario.service';

@Controller('diario')
export class DiarioController {
  constructor(private readonly service: DiarioService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  registrar(@Body() dto: RegistrarDiarioDto) {
    return this.service.registrar(dto);
  }

  @Get('perfis/:perfilId')
  listarPorPerfil(@Param('perfilId') perfilId: string) {
    return this.service.listarPorPerfil(perfilId);
  }
}
