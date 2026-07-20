import { Body, Controller, Post } from '@nestjs/common';
import { BibliotecaVivaService } from './biblioteca-viva.service';
import { BuscarSemanticaDto } from './dto/buscar-semantica.dto';

@Controller('biblioteca-viva')
export class BibliotecaVivaController {
  constructor(private readonly service: BibliotecaVivaService) {}

  @Post('buscar')
  buscar(@Body() dto: BuscarSemanticaDto) {
    return this.service.buscar(dto);
  }
}
