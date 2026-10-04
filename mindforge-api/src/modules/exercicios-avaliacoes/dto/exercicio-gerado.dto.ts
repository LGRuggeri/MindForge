import type { ComentarioQuestao } from '../comentario-questao';

export interface ExercicioGerado {
  comentario?: ComentarioQuestao;
  enunciado: string;
  gabarito?: string;
  dica?: string;
  criterios?: string[];
}
