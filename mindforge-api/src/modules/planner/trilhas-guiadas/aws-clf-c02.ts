/** Resumo autoral do guia oficial AWS Certified Cloud Practitioner CLF-C02. */
export const programaAwsClfC02 = {
  codigo: 'AWS-CLF-C02',
  tipo: 'certificacao',
  nome: 'AWS Certified Cloud Practitioner (CLF-C02)',
  descricao: 'Conceitos de nuvem, segurança, serviços centrais, custos e suporte da AWS.',
  fonteOficial: 'https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html',
  paginaCertificacao: 'https://aws.amazon.com/certification/certified-cloud-practitioner/',
  revisadoEm: '2026-09-23',
  dominios: [
    {
      codigo: 'nuvem',
      titulo: 'Conceitos de nuvem',
      pesoMinimo: 24,
      pesoMaximo: 24,
      topicos: [
        'Benefícios da nuvem e infraestrutura global',
        'Well-Architected, migração, economia e otimização de recursos',
      ],
    },
    {
      codigo: 'seguranca',
      titulo: 'Segurança e conformidade',
      pesoMinimo: 30,
      pesoMaximo: 30,
      topicos: [
        'Responsabilidade compartilhada, governança, criptografia e conformidade',
        'IAM, menor privilégio, MFA, proteção de conta raiz e serviços de segurança',
      ],
    },
    {
      codigo: 'servicos',
      titulo: 'Tecnologia e serviços da nuvem',
      pesoMinimo: 34,
      pesoMaximo: 34,
      topicos: [
        'Regiões, zonas, pontos de presença e meios de implantação',
        'Computação, redes, bancos de dados, armazenamento, análise, IA e integração',
      ],
    },
    {
      codigo: 'custos',
      titulo: 'Cobrança, preços e suporte',
      pesoMinimo: 12,
      pesoMaximo: 12,
      topicos: [
        'Modelos de preço, orçamento, Cost Explorer, Organizations e planos de suporte',
      ],
    },
  ],
  modulos: [
    {
      dominioCodigo: 'nuvem',
      titulo: 'Benefícios e arquitetura da nuvem AWS',
      objetivoAprendizagem:
        'Explicar disponibilidade, elasticidade, agilidade, alcance global e os pilares do AWS Well-Architected Framework.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'nuvem',
      titulo: 'Migração e economia de nuvem',
      objetivoAprendizagem:
        'Relacionar estratégias de adoção e migração, AWS CAF, custos fixos e variáveis, licenças, dimensionamento e automação.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'seguranca',
      titulo: 'Responsabilidade e governança na AWS',
      objetivoAprendizagem:
        'Distinguir responsabilidades do cliente e da AWS; localizar conformidade, logs, criptografia, auditoria e serviços de proteção.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'seguranca',
      titulo: 'Identidades e controles de segurança AWS',
      objetivoAprendizagem:
        'Aplicar conceitos de IAM, menor privilégio, MFA, proteção da conta raiz, federação e serviços de detecção e defesa.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'servicos',
      titulo: 'Infraestrutura global, computação e implantação',
      objetivoAprendizagem:
        'Comparar Regiões, zonas e pontos de presença; identificar Console, CLI, APIs, IaC, EC2, contêineres, Lambda, escalabilidade e balanceamento.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'servicos',
      titulo: 'Redes, armazenamento e bancos de dados AWS',
      objetivoAprendizagem:
        'Selecionar conceitos de VPC, Route 53, VPN, Direct Connect, S3, EBS, EFS, backup, RDS, Aurora, DynamoDB e migração de dados.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'servicos',
      titulo: 'Análise, IA e integração de serviços AWS',
      objetivoAprendizagem:
        'Reconhecer usos de serviços de análise e IA, mensageria, notificações, integração de aplicações, ferramentas de desenvolvimento e IoT.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'custos',
      titulo: 'Preços, cobrança e suporte AWS',
      objetivoAprendizagem:
        'Comparar opções de compra e transferência de dados; usar conceitos de Budgets, Cost Explorer, Pricing Calculator, Organizations, etiquetas e planos de suporte.',
      tempoEstimadoMin: 90,
    },
  ],
} as const;
