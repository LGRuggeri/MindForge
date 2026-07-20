import { Module } from '@nestjs/common';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { KnowledgeGraphService } from './knowledge-graph.service';

/**
 * TODO: implementar quando este módulo entrar em desenvolvimento —
 * ver princípio de "documentação viva" em 01-filosofia.md. Placeholder
 * mantido apenas para reservar a fronteira do módulo na árvore do projeto.
 */
@Module({
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService],
  exports: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
