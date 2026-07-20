import { Body, Controller, Get, Param, ParseUUIDPipe, Post, ValidationPipe } from '@nestjs/common';
import { AvaliarRespostaDto } from './dto/avaliar-resposta.dto';
import { TirarDuvidaDto } from './dto/tirar-duvida.dto';
import { TutorService } from './tutor.service';

@Controller('tutor')
export class TutorController {
  constructor(private readonly tutorService: TutorService) {}

  @Post('duvidas')
  async tirarDuvida(@Body(new ValidationPipe({ transform: true })) dto: TirarDuvidaDto) {
    return this.tutorService.tirarDuvida(dto);
  }

  @Post('duvidas/:id/avaliar')
  async avaliarResposta(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ transform: true })) dto: AvaliarRespostaDto,
  ) {
    return this.tutorService.avaliarResposta({ ...dto, duvidaId: id });
  }

  @Get('perfis/:perfilId/historico')
  async listarHistorico(@Param('perfilId', ParseUUIDPipe) perfilId: string) {
    return this.tutorService.listarHistoricoPorPerfil(perfilId);
  }
}
