/** Roteiro autoral a partir da documentação oficial do Kali Linux. */
export const programaKaliLinux = {
  codigo: 'KALI-LINUX',
  tipo: 'assunto',
  nome: 'Kali Linux em laboratório',
  descricao: 'Instalação em máquina virtual, uso do sistema e ferramentas em ambiente próprio de prática.',
  fonteOficial: 'https://www.kali.org/docs/',
  revisadoEm: '2026-09-23',
  dominios: [
    {
      codigo: 'preparacao',
      titulo: 'Pré-requisitos e propósito',
      topicos: ['Noções de Linux, objetivo do Kali e limites de um laboratório de testes'],
    },
    {
      codigo: 'ambiente',
      titulo: 'Ambiente virtual',
      topicos: ['Imagem oficial, verificação, máquina virtual, snapshots e atualização'],
    },
    {
      codigo: 'sistema',
      titulo: 'Uso cotidiano do sistema',
      topicos: ['Terminal, arquivos, permissões, pacotes e documentação das ferramentas'],
    },
    {
      codigo: 'redes',
      titulo: 'Redes para o laboratório',
      topicos: ['Endereços, portas, DNS, conectividade e isolamento das máquinas de prática'],
    },
    {
      codigo: 'observacao',
      titulo: 'Observação e inventário',
      topicos: ['Descoberta de serviços e leitura de tráfego no ambiente autorizado'],
    },
    {
      codigo: 'avaliacao',
      titulo: 'Avaliação de segurança',
      topicos: ['Leitura de achados, priorização e validação controlada'],
    },
    {
      codigo: 'relatorio',
      titulo: 'Relatório e correção',
      topicos: ['Evidências, recomendações e reteste'],
    },
  ],
  modulos: [
    {
      dominioCodigo: 'preparacao',
      titulo: 'Quando e por que usar Kali Linux',
      objetivoAprendizagem:
        'Explicar o propósito do Kali, reconhecer pré-requisitos de Linux e definir o escopo de um laboratório próprio ou autorizado.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'ambiente',
      titulo: 'Preparar uma máquina virtual Kali',
      objetivoAprendizagem:
        'Localizar imagem oficial, verificar a origem, importar a máquina virtual, criar snapshot e atualizar pacotes do sistema.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'sistema',
      titulo: 'Terminal, pacotes e ajuda das ferramentas',
      objetivoAprendizagem:
        'Navegar por arquivos e permissões, gerenciar pacotes pelos repositórios oficiais e consultar manuais e ajuda dos programas.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'redes',
      titulo: 'Conectividade e isolamento do laboratório',
      objetivoAprendizagem:
        'Reconhecer IP, portas, DNS e rotas; configurar e conferir a conectividade apenas entre máquinas do laboratório.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'observacao',
      titulo: 'Inventário de serviços e tráfego',
      objetivoAprendizagem:
        'Usar documentação de ferramentas como Nmap e Wireshark para observar serviços e tráfego de alvos do laboratório, registrando resultados.',
      tempoEstimadoMin: 120,
    },
    {
      dominioCodigo: 'avaliacao',
      titulo: 'Interpretar achados de segurança',
      objetivoAprendizagem:
        'Diferenciar observação de vulnerabilidade confirmada, avaliar impacto e priorizar correções sem extrapolar o escopo autorizado.',
      tempoEstimadoMin: 90,
    },
    {
      dominioCodigo: 'relatorio',
      titulo: 'Documentar e retestar',
      objetivoAprendizagem:
        'Produzir relatório com escopo, evidências, limitações e recomendações; verificar as correções no mesmo laboratório.',
      tempoEstimadoMin: 90,
    },
  ],
} as const;
