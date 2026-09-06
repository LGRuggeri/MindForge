import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { PerfilModule } from './modules/perfil/perfil.module';
import { PlannerModule } from './modules/planner/planner.module';
import { ResearchModule } from './modules/research/research.module';
import { SynthesizerModule } from './modules/synthesizer/synthesizer.module';
import { TutorModule } from './modules/tutor/tutor.module';
import { ExerciciosAvaliacoesModule } from './modules/exercicios-avaliacoes/exercicios-avaliacoes.module';
import { BibliotecaVivaModule } from './modules/biblioteca-viva/biblioteca-viva.module';
import { DiarioModule } from './modules/diario/diario.module';
import { KnowledgeGraphModule } from './modules/knowledge-graph/knowledge-graph.module';
import { MidiaModule } from './modules/midia/midia.module';
import { AgentesModule } from './modules/agentes/agentes.module';
import { AgentKbModule } from './modules/agent-kb/agent-kb.module';
import { ProjetosModule } from './modules/projetos/projetos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    JobsModule,
    PerfilModule,
    PlannerModule,
    ResearchModule,
    SynthesizerModule,
    TutorModule,
    ExerciciosAvaliacoesModule,
    BibliotecaVivaModule,
    DiarioModule,
    KnowledgeGraphModule,
    MidiaModule,
    AgentesModule,
    AgentKbModule,
    ProjetosModule,
  ],
})
export class AppModule {}
