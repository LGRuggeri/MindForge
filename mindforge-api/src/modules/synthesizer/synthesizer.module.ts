import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { BibliotecaVivaModule } from '../biblioteca-viva/biblioteca-viva.module';
import { KnowledgeGraphModule } from '../knowledge-graph/knowledge-graph.module';
import { MidiaModule } from '../midia/midia.module';
import { ReviewerService } from './reviewer.service';
import { SynthesizerController } from './synthesizer.controller';
import { SynthesizerService } from './synthesizer.service';
import { SynthesizerRepository } from './synthesizer.repository';

/**
 * Módulo Synthesizer: transforma objetivos de aprendizagem e fontes de
 * pesquisa em conteúdo didático original (Markdown), grava em `conteudos`,
 * vincula fontes, indexa chunks na Biblioteca Viva e alimenta o grafo de
 * competências do módulo. Ilustrações didáticas são geradas via MidiaModule
 * e injetadas no Markdown (degradação graciosa se o provedor falhar).
 */
@Module({
  imports: [AgentesModule, BibliotecaVivaModule, KnowledgeGraphModule, MidiaModule],
  controllers: [SynthesizerController],
  providers: [SynthesizerService, ReviewerService, SynthesizerRepository],
  exports: [SynthesizerService],
})
export class SynthesizerModule {}
