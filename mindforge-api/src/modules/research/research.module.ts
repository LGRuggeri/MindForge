import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { ResearchController } from './research.controller';
import { ResearchService } from './research.service';
import { ResearchRepository } from './research.repository';
import { WebSearchService } from './web-search.service';
import { DuckDuckGoSearchProvider } from './providers/duckduckgo-search.provider';
import { ApiSearchProvider } from './providers/api-search.provider';
import { ResearchJobHandler, RESEARCH_SERVICE } from './research.job.handler';

/**
 * Research Engine: curadoria de fontes confiáveis para um módulo de estudo.
 * Usa o agente Researcher e persiste em `fontes_pesquisa` para alimentar
 * o Synthesizer e a Biblioteca Viva.
 */
@Module({
  imports: [AgentesModule],
  controllers: [ResearchController],
  providers: [
    ResearchService,
    ResearchRepository,
    WebSearchService,
    DuckDuckGoSearchProvider,
    ApiSearchProvider,
    {
      provide: RESEARCH_SERVICE,
      inject: [ResearchService],
      useFactory: (service: ResearchService) => ({
        pesquisar: (dto: {
          moduloId: string;
          topico?: string;
          limite?: number;
          webSearch?: boolean;
        }) => service.pesquisar(dto as never),
      }),
    },
    ResearchJobHandler,
  ],
  exports: [ResearchService],
})
export class ResearchModule {}
