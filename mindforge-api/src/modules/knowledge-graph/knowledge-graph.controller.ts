import { Controller } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';

@Controller('knowledge-graph')
export class KnowledgeGraphController {
  constructor(private readonly service: KnowledgeGraphService) {}
  // TODO: implementar rotas quando este módulo entrar em desenvolvimento.
}
