import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { PerfilService } from './perfil.service';
import { CriarPerfilDto } from './dto/criar-perfil.dto';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';

@Controller('perfis')
export class PerfilController {
  constructor(private readonly service: PerfilService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  criar(@Body() dto: CriarPerfilDto) {
    return this.service.criar(dto);
  }

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarPerfilDto) {
    return this.service.atualizar(id, dto);
  }
}
