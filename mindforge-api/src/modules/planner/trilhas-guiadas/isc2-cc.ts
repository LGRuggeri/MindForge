/** Resumo autoral do exame ISC2 CC vigente desde 01/09/2026. */
export const programaIsc2Cc = {
  codigo: 'ISC2-CC',
  tipo: 'certificacao',
  nome: 'ISC2 Certified in Cybersecurity',
  descricao: 'Certificação inicial de princípios, governança, identidade, redes e operações de segurança.',
  fonteOficial: 'https://www.isc2.org/certifications/cc/cc-certification-exam-outline',
  paginaCertificacao: 'https://www.isc2.org/certifications/CC',
  vigenciaDesde: '2026-09-01',
  revisadoEm: '2026-09-23',
  dominios: [
    {
      codigo: 'principios',
      titulo: 'Princípios de segurança',
      pesoMinimo: 24,
      pesoMaximo: 24,
      topicos: [
        'Confidencialidade, integridade, disponibilidade, AAA, privacidade e não repúdio',
        'Risco, controles, políticas, padrões e ética profissional',
      ],
    },
    {
      codigo: 'governanca',
      titulo: 'Governança de segurança',
      pesoMinimo: 17.3,
      pesoMaximo: 17.3,
      topicos: [
        'Governança, risco e conformidade; continuidade e recuperação',
        'Conscientização e métricas de efetividade',
      ],
    },
    {
      codigo: 'identidade',
      titulo: 'Identidade e controle de acesso',
      pesoMinimo: 20,
      pesoMaximo: 20,
      topicos: [
        'Ciclo de vida de identidade, menor privilégio, segregação de funções e modelos de acesso',
      ],
    },
    {
      codigo: 'redes-nuvem',
      titulo: 'Redes e segurança em nuvem',
      pesoMinimo: 21.3,
      pesoMaximo: 21.3,
      topicos: [
        'TCP/IP, OSI, IPv4/IPv6, VPN, Wi-Fi, firewalls e segmentação',
        'Defesa em profundidade, Zero Trust e responsabilidade compartilhada na nuvem',
      ],
    },
    {
      codigo: 'operacoes',
      titulo: 'Operações e resposta a incidentes',
      pesoMinimo: 17.3,
      pesoMaximo: 17.3,
      topicos: [
        'Proteção de dados, criptografia, registros, ameaças e inteligência',
        'Resposta a incidentes, gestão de ativos e testes de segurança',
      ],
    },
  ],
  modulos: [
    {
      dominioCodigo: 'principios',
      titulo: 'Princípios, controles e ética',
      objetivoAprendizagem:
        'Explicar CIA, AAA, privacidade, não repúdio, ciclo de risco, controles técnicos, administrativos e físicos, políticas e conduta ética.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'governanca',
      titulo: 'Governança e continuidade',
      objetivoAprendizagem:
        'Comparar GRC, continuidade de negócios e recuperação de desastres; planejar conscientização e métricas de segurança.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'identidade',
      titulo: 'Identidades e autorização',
      objetivoAprendizagem:
        'Descrever provisão, revisão e remoção de identidades; aplicar menor privilégio, separação de funções e modelos de controle de acesso.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'redes-nuvem',
      titulo: 'Fundamentos de segurança de redes',
      objetivoAprendizagem:
        'Reconhecer OSI, TCP/IP, IPv4, IPv6, VPN, Wi-Fi, firewalls, portas, VLANs, segmentação, defesa em profundidade e Zero Trust.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'redes-nuvem',
      titulo: 'Modelos e responsabilidades na nuvem',
      objetivoAprendizagem:
        'Distinguir características, modelos de serviço e implantação em nuvem e responsabilidades de segurança do cliente e provedor.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'operacoes',
      titulo: 'Dados e operações de segurança',
      objetivoAprendizagem:
        'Explicar classificação, mascaramento, criptografia e hashing; interpretar registros, triagem de eventos, atores de ameaça e inteligência.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'operacoes',
      titulo: 'Incidentes, ativos e testes',
      objetivoAprendizagem:
        'Organizar plano e exercícios de resposta a incidentes; distinguir ciclo de ativos, mudanças, varredura de vulnerabilidades, testes de aplicação e modelagem de ameaças.',
      tempoEstimadoMin: 120,
    },
  ],
} as const;
