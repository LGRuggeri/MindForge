import { Controller } from '@nestjs/common';
import { AgentesService } from './agentes.service';

@Controller('agentes')
export class AgentesController {
  constructor(private readonly service: AgentesService) {}
  // TODO: implementar rotas quando este módulo entrar em desenvolvimento.
}
