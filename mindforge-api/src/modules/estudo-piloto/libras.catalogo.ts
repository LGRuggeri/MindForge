import { questao, type AulaBase, type AulaPiloto } from './libras.questoes';
import { aulasComplementares } from './libras.complementares';
import { questoesAvaliacaoLibras } from './libras.avaliacao';
import { matrizLibras } from './libras.matriz';
import { fontesLibras } from './libras.fontes';
import { complementoEtica } from './aulas/etica';
import { aulaEducacaoBilingue, aulaInterprete } from './libras.aulas';

export const codigoPiloto = 'libras-ibam-2026-especificos-v2';
const ldb = 'https://www.planalto.gov.br/ccivil_03/leis/l9394.htm';
const bilingue = 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14191.htm';
const profissional = 'https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12319.htm';
const alteradora = 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14704.htm';

const aulasIniciais: AulaBase[] = [
  {
    titulo: 'Educação especial e educação bilíngue: conceitos e evidências',
    objetivoAprendizagem:
      'Distinguir os capítulos V e V-A da LDB e analisar modalidade, apoio e atribuição sem extrapolação.',
    tempoEstimadoMin: 45,
    corpoMarkdown: aulaEducacaoBilingue,
    fontes: [
      {
        titulo: 'LDB — texto compilado',
        url: ldb,
        localizador: 'Capítulo V, art. 58',
        trechoConsultado:
          'modalidade de educação escolar oferecida preferencialmente na rede regular de ensino',
      },
      {
        titulo: 'Lei 14.191/2021',
        url: bilingue,
        localizador: 'Art. 2º: arts. 60-A e 60-B',
        trechoConsultado: 'em português escrito, como segunda língua',
      },
    ],
    questoes: [
      questao(
        'Na definição do art. 60-A da LDB, qual é o par linguístico da modalidade?',
        [
          'Libras como primeira língua e português escrito como segunda.',
          'Português oral como primeira língua e Libras como recurso auxiliar.',
          'Somente português escrito.',
          'Somente Libras, com exclusão do português escrito.',
        ],
        'A',
        'O art. 60-A qualifica expressamente as línguas da modalidade.',
        [
          'Correta: mantém a ordem e a qualificação escrito.',
          'Inverte a organização linguística e reduz Libras a auxílio.',
          'Exclui Libras da definição.',
          'Exclui a segunda língua.',
        ],
        bilingue,
        'LDB, art. 60-A: par linguístico',
      ),
      questao(
        'Qual espaço de oferta é contemplado no art. 60-A?',
        [
          'Exclusivamente escola especializada.',
          'Exclusivamente ensino superior.',
          'Escolas comuns, além dos demais espaços previstos no artigo.',
          'Apenas atendimento fora do sistema escolar.',
        ],
        'C',
        'O dispositivo admite diferentes espaços; a modalidade não se define apenas pelo prédio.',
        [
          'Exclusivamente restringe indevidamente os espaços.',
          'Acrescenta restrição de etapa não prevista.',
          'Correta: escola comum é um dos espaços mencionados.',
          'Retira a modalidade da educação escolar sem fundamento.',
        ],
        bilingue,
        'LDB, art. 60-A: espaços de oferta',
      ),
      questao(
        'Uma escola informa apenas que possui intérprete. O que se pode concluir sobre todo o planejamento bilíngue?',
        [
          'Está integralmente comprovado.',
          'É necessário examinar outras evidências sobre organização e materiais.',
          'Não há necessidade de trabalho pedagógico.',
          'Está comprovado que a escola não atende à modalidade.',
        ],
        'B',
        'Uma informação limitada não comprova nem refuta, sozinha, todas as condições da modalidade.',
        [
          'Salta da presença do recurso para a conclusão ampla.',
          'Correta: exige verificar as condições ainda não demonstradas.',
          'Inventa dispensa de trabalho pedagógico.',
          'Confunde ausência de comprovação com comprovação de ausência.',
        ],
        bilingue,
        'Distinguir modalidade e recurso de acessibilidade',
      ),
      questao(
        'Qual expressão corresponde à oferta de educação especial na definição do art. 58 da LDB?',
        [
          'Exclusivamente fora da escola regular.',
          'Exclusivamente para altas habilidades.',
          'Obrigatoriamente apenas em escola privada.',
          'Preferencialmente na rede regular de ensino.',
        ],
        'D',
        'A palavra de condição faz parte da definição e não deve ser substituída por exclusivamente.',
        [
          'Contraria a expressão relativa à rede regular.',
          'Restringe indevidamente o público.',
          'Acrescenta limitação inexistente.',
          'Correta: preserva o qualificador da norma.',
        ],
        ldb,
        'LDB, art. 58: definição e qualificadores',
      ),
    ],
  },
  {
    titulo: 'Intérprete educacional: atribuições, ética e condições de trabalho',
    objetivoAprendizagem:
      'Analisar atribuições e dilemas de fidelidade e sigilo; distinguir revezamento de jornada.',
    tempoEstimadoMin: 50,
    corpoMarkdown: aulaInterprete,
    fontes: [
      {
        titulo: 'Lei 12.319/2010 — texto compilado',
        url: profissional,
        localizador: 'Arts. 6º e 7º',
        trechoConsultado: 'protegendo o direito de sigilo da informação recebida',
      },
      {
        titulo: 'Lei 14.704/2023',
        url: alteradora,
        localizador: 'Art. 2º: art. 8º-A',
        trechoConsultado: 'com, no mínimo, 2 (dois) profissionais',
      },
    ],
    questoes: [
      questao(
        'Qual formulação corresponde à atribuição educacional prevista no art. 6º, II, da Lei 12.319/2010?',
        [
          'Substituir automaticamente toda a docência.',
          'Interpretar atividades educacionais para acesso aos conteúdos curriculares.',
          'Dispensar materiais didáticos.',
          'Atuar exclusivamente em depoimentos judiciais.',
        ],
        'B',
        'O objeto da atribuição é o acesso por interpretação, sem a substituição automática de outros papéis.',
        [
          'Acrescenta substituição docente não estabelecida nessa atribuição.',
          'Correta: descreve o objeto do dispositivo.',
          'Inventa dispensa de materiais.',
          'Exclui indevidamente o contexto educacional.',
        ],
        profissional,
        'Lei 12.319/2010, art. 6º, II',
      ),
      questao(
        'Ao discordar de uma fala, qual conduta preserva fidelidade e imparcialidade?',
        [
          'Alterar o argumento para torná-lo aceitável.',
          'Omitir apenas a conclusão de que discorda.',
          'Apresentar opinião pessoal como se fosse do participante.',
          'Preservar o conteúdo e a autoria, sem introduzir opinião própria.',
        ],
        'D',
        'Interpretar a fala não significa concordar com seu conteúdo.',
        [
          'Discordância pessoal não justifica alterar a mensagem.',
          'Omissão motivada por discordância compromete o conteúdo.',
          'Troca a autoria da opinião.',
          'Correta: respeita conteúdo e autoria.',
        ],
        profissional,
        'Lei 12.319/2010, art. 7º, III',
      ),
      questao(
        'Que critério ético está diretamente envolvido na divulgação aberta de informação recebida no exercício profissional?',
        [
          'Sigilo da informação recebida.',
          'Preferência por um participante do debate.',
          'Dispensa de formação profissional.',
          'Substituição do professor.',
        ],
        'A',
        'A análise deve examinar informação, finalidade, contexto e destinatários à luz do sigilo.',
        [
          'Correta: é o critério diretamente relacionado à divulgação.',
          'Não corresponde ao critério em análise.',
          'Não se deduz da situação.',
          'Não responde ao problema da divulgação.',
        ],
        profissional,
        'Lei 12.319/2010, art. 7º, I',
      ),
      questao(
        'Em uma atividade de tradução e interpretação superior a uma hora, qual regra foi incluída pela Lei 14.704/2023?',
        [
          'Revezamento apenas após seis horas.',
          'Trabalho necessariamente com um único profissional.',
          'Revezamento com pelo menos dois profissionais.',
          'Dispensa de revezamento em qualquer hipótese.',
        ],
        'C',
        'O limiar do revezamento é distinto da jornada diária prevista no mesmo artigo.',
        [
          'Confunde limiar de revezamento e jornada.',
          'Contraria o número mínimo previsto.',
          'Correta: preserva limiar e número mínimo.',
          'Nega a regra incluída.',
        ],
        alteradora,
        'Lei 12.319/2010, art. 8º-A, parágrafo único',
      ),
    ],
  },
];

const codigosIniciais = ['ldb', 'interprete-educacional'];
export const aulasLibras: AulaPiloto[] = [
  ...aulasIniciais.map((aula, i) => ({
    ...aula,
    codigo: codigosIniciais[i],
    ...(i === 1
      ? {
          corpoMarkdown: aula.corpoMarkdown + complementoEtica,
          fontes: [...aula.fontes, fontesLibras.etica, fontesLibras.eticaHistorica],
        }
      : {}),
  })),
  ...aulasComplementares,
].map((aula) => ({
  ...aula,
  itensEdital: matrizLibras
    .filter((item) => item.aulaCodigo === aula.codigo)
    .map((item) => item.id),
  questoesAvaliacao: questoesAvaliacaoLibras.filter(
    (questao) => questao.aulaCodigo === aula.codigo,
  ),
}));

export function apresentarPiloto() {
  return {
    codigo: codigoPiloto,
    titulo: 'Professor Intérprete de Libras — estudo dos conhecimentos específicos',
    revisadoEm: '2026-10-03',
    limites:
      'Percurso autoral dos 19 itens específicos, com aulas, atividades e avaliação própria. Os núcleos comuns de Português e legislação/raciocínio lógico ainda não estão desenvolvidos neste percurso. Não reproduz o simulado integral do IBAM nem certifica proficiência prática em Libras.',
    totalQuestoes: aulasLibras.reduce((total, aula) => total + aula.questoes.length, 0),
    totalQuestoesAvaliacao: questoesAvaliacaoLibras.length,
    matriz: matrizLibras.map((item) => ({
      ...item,
      aulaTitulo: aulasLibras.find((aula) => aula.codigo === item.aulaCodigo)!.titulo,
    })),
    aulas: aulasLibras.map(({ questoes, questoesAvaliacao, ...aula }) => ({
      ...aula,
      totalQuestoes: questoes.length,
      totalQuestoesAvaliacao: questoesAvaliacao.length,
    })),
  };
}
