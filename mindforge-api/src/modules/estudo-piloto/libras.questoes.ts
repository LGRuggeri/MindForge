import type { ComentarioQuestao } from '../exercicios-avaliacoes/comentario-questao';
import type { FonteLibras } from './libras.fontes';

export interface QuestaoPiloto {
  enunciado: string;
  gabarito: string;
  comentario: ComentarioQuestao;
}
export interface QuestaoAvaliacao extends QuestaoPiloto {
  itemEdital: string;
  aulaCodigo: string;
}
export interface AulaBase {
  titulo: string;
  objetivoAprendizagem: string;
  tempoEstimadoMin: number;
  corpoMarkdown: string;
  fontes: FonteLibras[];
  questoes: QuestaoPiloto[];
}
export interface AulaPiloto extends AulaBase {
  codigo: string;
  itensEdital: string[];
  questoesAvaliacao: QuestaoAvaliacao[];
}

export function questao(
  pergunta: string,
  opcoes: string[],
  gabarito: string,
  explicacao: string,
  comentarios: string[],
  fonte: string,
  topicoRevisao: string,
): QuestaoPiloto {
  return {
    enunciado: `${pergunta}\n\n${opcoes.map((opcao, indice) => `${'ABCD'[indice]}. ${opcao}`).join('\n\n')}`,
    gabarito,
    comentario: {
      explicacao,
      alternativas: comentarios.map((texto, indice) => ({
        alternativa: 'ABCD'[indice],
        explicacao: texto,
      })),
      fontes: [fonte],
      topicoRevisao,
    },
  };
}
