import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { BibliotecaVivaModule } from '../biblioteca-viva/biblioteca-viva.module';
import { SynthesizerController } from './synthesizer.controller';
import { SynthesizerService } from './synthesizer.service';
import { SynthesizerRepository } from './synthesizer.repository';

/**
 * Módulo Synthesizer: transforma objetivos de aprendizagem e fontes de
 * pesquisa em conteúdo didático original (Markdown), grava em `conteudos`,
 * vincula fontes e indexa chunks na Biblioteca Viva.
 */
@Module({
  imports: [AgentesModule, BibliotecaVivaModule],
  controllers: [SynthesizerController],
  providers: [SynthesizerService, SynthesizerRepository],
  exports: [SynthesizerService],
})
export class SynthesizerModule {}
