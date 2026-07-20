import { Controller } from '@nestjs/common';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';

@Controller('exercicios-avaliacoes')
export class ExerciciosAvaliacoesController {
  constructor(private readonly service: ExerciciosAvaliacoesService) {}
  // TODO: implementar rotas quando este módulo entrar em desenvolvimento.
}
