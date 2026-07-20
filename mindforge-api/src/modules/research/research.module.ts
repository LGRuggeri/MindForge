import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { ResearchRepository } from './research.repository';

/**
 * Research Engine: curadoria de fontes confiáveis para um módulo de estudo.
 * Usa o agente Researcher e persiste em `fontes_pesquisa` para alimentar
 * o Synthesizer e a Biblioteca Viva.
 */
@Module({
  imports: [AgentesModule],
  controllers: [ResearchController],
  providers: [ResearchService, ResearchRepository],
  exports: [ResearchService],
})
export class ResearchModule {}
