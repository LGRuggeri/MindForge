/**
 * Resumo autoral do programa oficial. Atualizar após conferir a fonte indicada.
 * Os pesos descrevem a prova, não a duração obrigatória dos estudos.
 */
export const programaAz900 = {
  codigo: 'AZ-900',
  tipo: 'certificacao',
  nome: 'Microsoft Azure Fundamentals',
  descricao: 'Fundamentos de computação em nuvem e dos serviços, arquitetura e governança do Azure.',
  fonteOficial: 'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/az-900',
  paginaCertificacao: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/',
  avaliacaoPratica: 'https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/practice/assessment?assessment-type=practice&assessmentId=23&practice-assessment-type=certification',
  vigenciaDesde: '2026-07-20',
  revisadoEm: '2026-09-23',
  dominios: [
    {
      codigo: 'conceitos-nuvem',
      titulo: 'Conceitos de nuvem',
      pesoMinimo: 25,
      pesoMaximo: 30,
      topicos: [
        'Computação em nuvem, responsabilidade compartilhada e modelos público, privado e híbrido',
        'Consumo, preços, computação sem servidor e benefícios dos serviços em nuvem',
        'Diferenças e casos de uso de IaaS, PaaS e SaaS',
      ],
    },
    {
      codigo: 'arquitetura-servicos',
      titulo: 'Arquitetura e serviços do Azure',
      pesoMinimo: 35,
      pesoMaximo: 40,
      topicos: [
        'Regiões, zonas de disponibilidade, datacenters, recursos, grupos de recursos, assinaturas e grupos de gerenciamento',
        'Máquinas virtuais, conjuntos de escala, disponibilidade, Azure Virtual Desktop, contêineres e funções',
        'Redes virtuais, sub-redes, emparelhamento, DNS, VPN Gateway, ExpressRoute e pontos de extremidade',
        'Serviços e camadas de armazenamento, redundância, contas, transferência de arquivos e migração',
        'Microsoft Entra, autenticação, Acesso Condicional, RBAC, Zero Trust e Defender for Cloud',
      ],
    },
    {
      codigo: 'gestao-governanca',
      titulo: 'Gerenciamento e governança do Azure',
      pesoMinimo: 30,
      pesoMaximo: 35,
      topicos: [
        'Custos, calculadora de preços, Cost Management e etiquetas',
        'Microsoft Purview, Azure Policy e bloqueios de recursos',
        'Portal, Cloud Shell, CLI, PowerShell, Arc, infraestrutura como código e ARM',
        'Azure Advisor, Service Health e Azure Monitor',
      ],
    },
  ],
  modulos: [
    {
      dominioCodigo: 'conceitos-nuvem',
      titulo: 'Fundamentos da computação em nuvem',
      objetivoAprendizagem:
        'Explicar computação em nuvem, responsabilidade compartilhada, nuvens pública, privada e híbrida e seus casos de uso; descrever disponibilidade, escalabilidade, confiabilidade, previsibilidade, segurança e gerenciabilidade.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'conceitos-nuvem',
      titulo: 'Consumo e tipos de serviços em nuvem',
      objetivoAprendizagem:
        'Comparar consumo e preços em nuvem, computação sem servidor e casos de uso de IaaS, PaaS e SaaS.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'arquitetura-servicos',
      titulo: 'Estrutura global e organização de recursos do Azure',
      objetivoAprendizagem:
        'Descrever regiões, pares de regiões, regiões soberanas, zonas de disponibilidade, datacenters, recursos, grupos de recursos, assinaturas e grupos de gerenciamento.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'arquitetura-servicos',
      titulo: 'Computação e redes no Azure',
      objetivoAprendizagem:
        'Comparar máquinas virtuais, recursos necessários, conjuntos de escala, disponibilidade, Azure Virtual Desktop, contêineres, funções e hospedagem; explicar redes virtuais, sub-redes, emparelhamento, DNS, VPN Gateway, ExpressRoute e pontos de extremidade públicos e privados.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'arquitetura-servicos',
      titulo: 'Armazenamento e migração no Azure',
      objetivoAprendizagem:
        'Comparar serviços, camadas, redundância, contas e tipos de armazenamento; identificar AzCopy, Storage Explorer, File Sync, Azure Migrate e Data Box.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'arquitetura-servicos',
      titulo: 'Identidade, acesso e segurança no Azure',
      objetivoAprendizagem:
        'Explicar Entra ID e Domain Services, SSO, MFA, acesso sem senha, identidades externas, Acesso Condicional, RBAC, Zero Trust, defesa em profundidade e Defender for Cloud.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'gestao-governanca',
      titulo: 'Custos, governança e conformidade no Azure',
      objetivoAprendizagem:
        'Explicar fatores de custo, calculadora de preços, Cost Management, etiquetas, Microsoft Purview, Azure Policy e bloqueios de recursos.',
      tempoEstimadoMin: 150,
    },
    {
      dominioCodigo: 'gestao-governanca',
      titulo: 'Administração, implantação e monitoramento no Azure',
      objetivoAprendizagem:
        'Comparar portal, Cloud Shell, CLI, PowerShell, Azure Arc, infraestrutura como código, ARM e seus modelos; descrever Advisor, Service Health, Monitor, Log Analytics, alertas e Application Insights.',
      tempoEstimadoMin: 150,
    },
  ],
} as const;
