import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { BibliotecaVivaModule } from '../biblioteca-viva/biblioteca-viva.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { PlannerModule } from '../planner/planner.module';
import { AvaliacoesService } from './avaliacoes.service';
import { ExerciciosAvaliacoesController } from './exercicios-avaliacoes.controller';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';
import { RevisaoEspacadaRepository } from './revisao-espacada.repository';

@Module({
  imports: [AgentesModule, BibliotecaVivaModule, KnowledgeGraphModule, PlannerModule],
  controllers: [ExerciciosAvaliacoesController],
  providers: [
    ExerciciosAvaliacoesService,
    AvaliacoesService,
    RevisaoEspacadaService,
    RevisaoEspacadaRepository,
    ExerciciosAvaliacoesRepository,
  ],
  exports: [ExerciciosAvaliacoesService, AvaliacoesService, RevisaoEspacadaService],
})
export class ExerciciosAvaliacoesModule {}
