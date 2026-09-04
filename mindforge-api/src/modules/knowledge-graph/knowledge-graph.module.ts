import { Module } from '@nestjs/common';
import { KnowledgeGraphController } from './knowledge-graph.controller';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { KnowledgeGraphRepository } from './knowledge-graph.repository';

@Module({
  controllers: [KnowledgeGraphController],
  providers: [KnowledgeGraphService, KnowledgeGraphRepository],
  exports: [KnowledgeGraphService],
})
export class KnowledgeGraphModule {}
