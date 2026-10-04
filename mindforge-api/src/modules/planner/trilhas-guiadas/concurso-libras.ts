import { aulasLibras } from '../../estudo-piloto/libras.catalogo';
import { matrizLibras } from '../../estudo-piloto/libras.matriz';
import { ProgramaTrilha } from './types';
import { modulosNucleoComumEducacao } from './nucleo-comum-educacao';

// Compartilha somente a grade e as referências: cada perfil gera suas próprias aulas.
export const programaConcursoLibras = {
  codigo: 'CONCURSO-LIBRAS-IBAM-2026',
  tipo: 'concurso',
  modoEstudoPadrao: 'concurso',
  nome: 'Professor Intérprete de Libras — núcleo comum e conhecimentos específicos',
  descricao:
    'Grade do Anexo III, Educação de Balneário Piçarras/SC, IBAM 2026: conhecimentos específicos de Libras, Português e Legislação para nível superior, incluindo Raciocínio Lógico. Selecione todos os módulos ou os assuntos que deseja estudar.',
  fonteOficial: 'https://www.ibam-concursos.org.br/documento/an3.psedu26.pdf',
  revisadoEm: '2026-10-03',
  dominios: [
    ...aulasLibras.map((aula) => ({
      codigo: aula.codigo,
      titulo: aula.titulo,
      topicos: matrizLibras
        .filter((item) => item.aulaCodigo === aula.codigo)
        .map((item) => item.assunto),
    })),
    ...modulosNucleoComumEducacao.map((modulo) => ({
      codigo: modulo.dominioCodigo,
      titulo: modulo.titulo,
      topicos: modulo.topicosObrigatorios,
    })),
  ],
  // As posições 1–11 permanecem compatíveis com seleções e retratos já persistidos.
  modulos: [
    ...aulasLibras.map((aula) => ({
      dominioCodigo: aula.codigo,
      titulo: aula.titulo,
      objetivoAprendizagem: aula.objetivoAprendizagem,
      tempoEstimadoMin: aula.tempoEstimadoMin,
      topicosObrigatorios: [
        ...matrizLibras
          .filter((item) => item.aulaCodigo === aula.codigo)
          .map((item) => item.assunto),
        aula.objetivoAprendizagem,
      ],
      fontes: aula.fontes.map((fonte) => ({
        titulo: fonte.titulo,
        url: fonte.url,
        localizador: fonte.localizador,
        trechoConsultado: fonte.trechoConsultado,
        consultadoEm: '2026-10-03',
      })),
    })),
    ...modulosNucleoComumEducacao,
  ],
} as const satisfies ProgramaTrilha;
