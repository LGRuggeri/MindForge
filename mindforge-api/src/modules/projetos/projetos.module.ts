import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { BibliotecaVivaModule } from '../biblioteca-viva/biblioteca-viva.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { ProjetosController } from './projetos.controller';
import { ProjetosService } from './projetos.service';
import { ProjetosRepository } from './projetos.repository';

@Module({
  imports: [AgentesModule, KnowledgeGraphModule, BibliotecaVivaModule],
  controllers: [ProjetosController],
  providers: [ProjetosService, ProjetosRepository],
  exports: [ProjetosService],
})
export class ProjetosModule {}
