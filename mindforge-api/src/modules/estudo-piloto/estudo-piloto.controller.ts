import { Body, Controller, Get, Post } from '@nestjs/common';
import { InstalarPilotoDto } from './dto/instalar-piloto.dto';
import { EstudoPilotoService } from './estudo-piloto.service';

@Controller('estudo-piloto/libras')
export class EstudoPilotoController {
  constructor(private readonly service: EstudoPilotoService) {}

  @Get()
  apresentar() {
    return this.service.apresentar();
  }

  @Post('instalar')
  instalar(@Body() dto: InstalarPilotoDto) {
    return this.service.instalar(dto.perfilId);
  }
}
