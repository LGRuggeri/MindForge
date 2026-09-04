import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { PlannerController } from './planner.controller';
import { PlannerService } from './planner.service';
import { PlannerRepository } from './planner.repository';

@Module({
  imports: [AgentesModule, KnowledgeGraphModule],
  controllers: [PlannerController],
  providers: [PlannerService, PlannerRepository],
  exports: [PlannerService],
})
export class PlannerModule {}
