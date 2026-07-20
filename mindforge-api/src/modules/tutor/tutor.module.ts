import { Module } from '@nestjs/common';
import { AgentesModule } from '../agentes/agentes.module';
import { BibliotecaVivaModule } from '../biblioteca-viva/biblioteca-viva.module';
import { TutorController } from './tutor.controller';
import { TutorService } from './tutor.service';
import { TutorRepository } from './tutor.repository';

/**
 * Módulo Tutor: professor pessoal com RAG sobre a Biblioteca Viva.
 * Responde dúvidas do aluno usando chunks vetoriais dos conteúdos e fontes
 * indexados, mantendo o contexto do módulo e do nível do aluno.
 */
@Module({
  imports: [AgentesModule, BibliotecaVivaModule],
  controllers: [TutorController],
  providers: [TutorService, TutorRepository],
  exports: [TutorService],
})
export class TutorModule {}
