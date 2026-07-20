import { Module } from '@nestjs/common';
import { ExerciciosAvaliacoesController } from './exercicios-avaliacoes.controller';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';

/**
 * TODO: implementar quando este módulo entrar em desenvolvimento —
 * ver princípio de "documentação viva" em 01-filosofia.md. Placeholder
 * mantido apenas para reservar a fronteira do módulo na árvore do projeto.
 */
@Module({
  controllers: [ExerciciosAvaliacoesController],
  providers: [ExerciciosAvaliacoesService],
  exports: [ExerciciosAvaliacoesService],
})
export class ExerciciosAvaliacoesModule {}
