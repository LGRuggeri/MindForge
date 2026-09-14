import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { SandboxService } from './sandbox.service';
import { ExecutarCodigoDto } from './dto/executar-codigo.dto';

@Controller('sandbox')
export class SandboxController {
  constructor(
    private readonly service: SandboxService,
    private readonly config: ConfigService,
  ) {}

  @Post('exercicios/:id/executar')
  @HttpCode(200)
  executar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecutarCodigoDto,
    @Req() req: Request,
  ) {
    // Usa o socket real, nunca X-Forwarded-For. É uma restrição local, não autenticação.
    const locais = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const hostLocal = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(req.headers.host ?? '');
    const origin = req.headers.origin;
    const esperado = new URL(this.config.get('FRONTEND_URL', 'http://localhost:3001')).origin;
    if (
      !locais.includes(req.socket.remoteAddress ?? '') ||
      !hostLocal ||
      (origin && origin !== esperado)
    ) {
      throw new ForbiddenException(
        'O sandbox está disponível apenas no ambiente local do MindForge',
      );
    }
    return this.service.executar(id, dto);
  }
}
