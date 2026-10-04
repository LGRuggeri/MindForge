import type { FontePrograma, ModuloPrograma } from './types';

const urlAnexo = 'https://www.ibam-concursos.org.br/documento/an3.psedu26.pdf';
function fontePrograma(secao: string, trecho: string): FontePrograma {
  return {
    titulo: `Anexo III — núcleo comum de nível superior — ${secao}`,
    url: urlAnexo,
    localizador: `página 1, ${secao}. Programa da prova; não é o texto das normas citadas.`,
    trechoConsultado: trecho,
    consultadoEm: '2026-10-03',
  };
}

const portugues = fontePrograma(
  'PORTUGUÊS PARA FUNÇÕES DE NÍVEL SUPERIOR',
  'PORTUGUÊS PARA FUNÇÕES DE NÍVEL SUPERIOR',
);
const legislacao = fontePrograma(
  'LEGISLAÇÃO PARA FUNÇÕES DE NÍVEL SUPERIOR',
  'LEGISLAÇÃO PARA FUNÇÕES DE NÍVEL SUPERIOR',
);
const raciocinio = fontePrograma(
  'Raciocínio Lógico, dentro de LEGISLAÇÃO PARA FUNÇÕES DE NÍVEL SUPERIOR',
  'Raciocínio Lógico:',
);

// Organização didática da página 1. Tempos estimados não são pesos da prova.
// Referências comprovam o escopo do edital, não a redação vigente de cada lei.
export const modulosNucleoComumEducacao = [
  {
    dominioCodigo: 'portugues-leitura',
    titulo: 'Português — leitura, interpretação e gêneros textuais',
    objetivoAprendizagem:
      'Interpretar textos verbais e não verbais, justificar inferências e distinguir informações do texto e ponto de vista do autor.',
    tempoEstimadoMin: 90,
    topicosObrigatorios: [
      'Interpretação, compreensão e inferência em textos verbais e não verbais',
      'Recursos linguísticos e características do texto',
      'Tipos e gêneros textuais',
      'Ideias expressas e ponto de vista do autor',
    ],
    fontes: [portugues],
  },
  {
    dominioCodigo: 'portugues-sentidos',
    titulo: 'Português — sentidos, coesão e linguagem',
    objetivoAprendizagem:
      'Analisar sentidos no contexto, relações de coesão e coerência, funções e figuras de linguagem com exemplos comentados.',
    tempoEstimadoMin: 90,
    topicosObrigatorios: [
      'Sentido e emprego de palavras e expressões no contexto; significação das palavras',
      'Coesão e coerência',
      'Funções da linguagem',
      'Figuras de linguagem',
    ],
    fontes: [portugues],
  },
  {
    dominioCodigo: 'portugues-morfologia',
    titulo: 'Português — classes, formação e flexão de palavras',
    objetivoAprendizagem:
      'Reconhecer classes gramaticais em contexto e explicar formação, flexões e efeitos de sentido de prefixos e sufixos.',
    tempoEstimadoMin: 100,
    topicosObrigatorios: [
      'Reconhecimento, emprego e sentidos das classes gramaticais',
      'Processos de formação de palavras; sentidos de prefixos e sufixos',
      'Flexão dos nomes e verbos',
    ],
    fontes: [portugues],
  },
  {
    dominioCodigo: 'portugues-sintaxe',
    titulo: 'Português — sintaxe, pronomes e concordância',
    objetivoAprendizagem:
      'Identificar termos da oração e aplicar concordância e colocação pronominal, justificando regras e exceções da gramática normativa.',
    tempoEstimadoMin: 110,
    topicosObrigatorios: [
      'Emprego e colocação dos pronomes átonos',
      'Termos sintáticos da oração',
      'Concordância nominal e verbal',
    ],
    fontes: [portugues],
  },
  {
    dominioCodigo: 'portugues-regencia',
    titulo: 'Português — transitividade, regência e crase',
    objetivoAprendizagem:
      'Analisar complementos e regência nominal e verbal para justificar o emprego ou a ausência de crase em situações contextualizadas.',
    tempoEstimadoMin: 90,
    topicosObrigatorios: [
      'Transitividade e regência dos nomes e verbos',
      'Uso do acento grave: crase',
    ],
    fontes: [portugues],
  },
  {
    dominioCodigo: 'portugues-escrita',
    titulo: 'Português — pontuação, acentuação e ortografia',
    objetivoAprendizagem:
      'Revisar frases e explicar efeitos da pontuação, regras de acentuação, ortografia e emprego dos porquês.',
    tempoEstimadoMin: 100,
    topicosObrigatorios: [
      'Emprego dos sinais de pontuação',
      'Acentuação gráfica',
      'Uso dos porquês',
      'Ortografia',
    ],
    fontes: [portugues],
  },
  {
    dominioCodigo: 'legislacao-constitucional',
    titulo: 'Legislação — Constituição e Administração Pública',
    objetivoAprendizagem:
      'Relacionar princípios, direitos e organização do Estado com situações da Administração Pública, fundamentando a análise no texto constitucional oficial.',
    tempoEstimadoMin: 120,
    topicosObrigatorios: [
      'Constituição Federal: princípios fundamentais, direitos e garantias fundamentais e organização do Estado (Títulos I, II e III)',
      'Princípios da Administração Pública',
    ],
    fontes: [legislacao],
  },
  {
    dominioCodigo: 'legislacao-transparencia',
    titulo: 'Legislação — acesso à informação e improbidade',
    objetivoAprendizagem:
      'Distinguir acesso à informação e improbidade administrativa por casos comentados, conferindo alterações e dispositivos nas fontes oficiais.',
    tempoEstimadoMin: 110,
    topicosObrigatorios: [
      'Lei de Acesso à Informação: Lei 12.527/2011',
      'Lei de Improbidade Administrativa: Lei 8.429/1992',
    ],
    fontes: [legislacao],
  },
  {
    dominioCodigo: 'legislacao-municipal',
    titulo: 'Legislação — Balneário Piçarras e Sistema Municipal de Ensino',
    objetivoAprendizagem:
      'Estudar a Lei Orgânica de Balneário Piçarras e a LC 87/2013 em seus textos municipais oficiais, sem substituir dispositivos locais por regras de outro município.',
    tempoEstimadoMin: 110,
    topicosObrigatorios: [
      'Lei Orgânica do Município de Balneário Piçarras',
      'Lei Complementar municipal 87/2013: Sistema Municipal de Ensino',
    ],
    fontes: [legislacao],
  },
  {
    dominioCodigo: 'legislacao-ldb-geral',
    titulo: 'Legislação — LDB e organização da educação nacional',
    objetivoAprendizagem:
      'Estudar a LDB e suas alterações no escopo geral do núcleo comum, relacionando organização educacional e situações-problema sem restringir a análise ao capítulo V.',
    tempoEstimadoMin: 120,
    topicosObrigatorios: [
      'Lei de Diretrizes e Bases da Educação Nacional: Lei 9.394/1996 e suas alterações',
    ],
    fontes: [legislacao],
  },
  {
    dominioCodigo: 'legislacao-curriculo',
    titulo: 'Legislação — diretrizes da Educação Básica e BNCC',
    objetivoAprendizagem:
      'Distinguir diretrizes e base curricular e aplicar seus conceitos a casos educacionais, consultando os documentos oficiais e identificando seus respectivos escopos.',
    tempoEstimadoMin: 120,
    topicosObrigatorios: [
      'Resolução CNE/CEB 4, de 13 de julho de 2010: Diretrizes Curriculares Nacionais para a Educação Básica',
      'BNCC: Base Nacional Comum Curricular',
    ],
    fontes: [legislacao],
  },
  {
    dominioCodigo: 'legislacao-educacao-inclusiva',
    titulo: 'Legislação — Educação Especial na Perspectiva da Educação Inclusiva',
    objetivoAprendizagem:
      'Analisar o documento indicado no núcleo comum e relacioná-lo aos marcos posteriores de educação inclusiva, distinguindo nomes, datas e alterações em fontes oficiais.',
    tempoEstimadoMin: 90,
    topicosObrigatorios: [
      'Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva',
    ],
    fontes: [legislacao],
  },
  {
    dominioCodigo: 'legislacao-eca',
    titulo: 'Legislação — Estatuto da Criança e do Adolescente',
    objetivoAprendizagem:
      'Analisar direitos e situações educacionais a partir do ECA, fundamentando respostas em dispositivos oficiais e distinguindo regra e aplicação.',
    tempoEstimadoMin: 100,
    topicosObrigatorios: ['Estatuto da Criança e do Adolescente: Lei 8.069/1990'],
    fontes: [legislacao],
  },
  {
    dominioCodigo: 'raciocinio-aritmetica',
    titulo: 'Raciocínio lógico — operações e proporcionalidade',
    objetivoAprendizagem:
      'Resolver problemas com inteiros, racionais, porcentagem, razões, proporções e regras de três, apresentando cálculos e conferência do resultado.',
    tempoEstimadoMin: 110,
    topicosObrigatorios: [
      'Adição, subtração, multiplicação e divisão de inteiros e racionais em forma decimal e fracionária',
      'Porcentagem',
      'Regra de três simples e composta',
      'Razão e proporção',
    ],
    fontes: [raciocinio],
  },
  {
    dominioCodigo: 'raciocinio-medidas-dados',
    titulo: 'Raciocínio lógico — medidas, gráficos e médias',
    objetivoAprendizagem:
      'Converter unidades e interpretar gráficos e tabelas para resolver problemas com medidas e média aritmética simples.',
    tempoEstimadoMin: 100,
    topicosObrigatorios: [
      'Sistema métrico: tempo, massa, comprimento, superfície, volume e capacidade',
      'Interpretação de gráficos e tabelas',
      'Média aritmética simples',
    ],
    fontes: [raciocinio],
  },
  {
    dominioCodigo: 'raciocinio-conjuntos',
    titulo: 'Raciocínio lógico — conjuntos e situações-problema',
    objetivoAprendizagem:
      'Representar conjuntos e resolver situações-problema, explicitando dados, operações, etapas e verificação da resposta.',
    tempoEstimadoMin: 90,
    topicosObrigatorios: ['Operações e problemas com conjuntos', 'Resolução de situações-problema'],
    fontes: [raciocinio],
  },
] as const satisfies readonly ModuloPrograma[];
