/** Roteiro autoral introdutório; NIST CSF 2.0 é a referência das seis funções. */
export const programaCiberseguranca = {
  codigo: 'CIBERSEGURANCA',
  tipo: 'assunto',
  nome: 'Fundamentos de cibersegurança',
  descricao: 'Do vocabulário técnico à gestão, proteção e resposta a riscos digitais.',
  fonteOficial: 'https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.1299.pdf',
  revisadoEm: '2026-09-23',
  dominios: [
    {
      codigo: 'fundamentos',
      titulo: 'Fundamentos técnicos',
      topicos: ['Redes, sistemas, dados, identidades, ameaças e vulnerabilidades'],
    },
    {
      codigo: 'governar',
      titulo: 'Governar',
      topicos: ['Objetivos, políticas, responsabilidades e estratégia de risco'],
    },
    {
      codigo: 'identificar',
      titulo: 'Identificar',
      topicos: ['Ativos, processos críticos, dependências e avaliação de riscos'],
    },
    {
      codigo: 'proteger',
      titulo: 'Proteger',
      topicos: ['Controle de acesso, proteção de dados e conscientização'],
    },
    {
      codigo: 'detectar',
      titulo: 'Detectar',
      topicos: ['Eventos, registros, monitoramento e análise inicial'],
    },
    {
      codigo: 'responder',
      titulo: 'Responder',
      topicos: ['Triagem, comunicação, contenção e lições aprendidas'],
    },
    {
      codigo: 'recuperar',
      titulo: 'Recuperar',
      topicos: ['Continuidade, restauração e melhoria após incidentes'],
    },
  ],
  modulos: [
    {
      dominioCodigo: 'fundamentos',
      titulo: 'Linguagem e bases da cibersegurança',
      objetivoAprendizagem:
        'Distinguir ativos, dados, identidade, ameaça, vulnerabilidade e risco; explicar redes e sistemas como superfícies que precisam de proteção.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'governar',
      titulo: 'Governança e estratégia de risco',
      objetivoAprendizagem:
        'Definir objetivos de segurança, responsabilidades, políticas, tolerância ao risco e critérios de priorização para um cenário de estudo.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'identificar',
      titulo: 'Inventário e avaliação de riscos',
      objetivoAprendizagem:
        'Mapear ativos e processos críticos, suas dependências e riscos; priorizar o que deve ser protegido.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'proteger',
      titulo: 'Controles de proteção',
      objetivoAprendizagem:
        'Selecionar controles de acesso, proteção de dados, atualização, backup e conscientização coerentes com os riscos identificados.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'detectar',
      titulo: 'Monitoramento e detecção',
      objetivoAprendizagem:
        'Interpretar eventos e registros de um ambiente de laboratório, diferenciar anomalia de incidente e documentar indícios.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'responder',
      titulo: 'Resposta a incidentes',
      objetivoAprendizagem:
        'Organizar triagem, comunicação, contenção e análise de um incidente simulado com registro das decisões.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'recuperar',
      titulo: 'Continuidade e recuperação',
      objetivoAprendizagem:
        'Planejar restauração, validar backups e transformar as lições do incidente em melhorias de resiliência.',
      tempoEstimadoMin: 90,
    },
  ],
} as const;
