import { avaliarAprovacao, montarRequisitosEstudo } from './requisitos-estudo';

describe('Requisitos de estudo', () => {
  it('não permite omitir os tópicos da grade escolhida e usa o modo do programa', () => {
    const contexto = montarRequisitosEstudo(
      { moduloId: 'm', topico: 'Foco', topicosObrigatorios: ['Exemplo adicional'] },
      {
        titulo: 'Meu módulo',
        objetivoAprendizagem: 'Aprender',
        ordem: 1,
        trilha: {
          metadata: {
            programa: {
              codigo: 'CURSO',
              nome: 'Minha grade',
              modoEstudoPadrao: 'concurso',
              modulos: [
                {
                  titulo: 'Módulo',
                  objetivoAprendizagem: 'Aprender',
                  topicosObrigatorios: ['LDB, capítulo V'],
                },
              ],
            },
          },
        },
      },
      [],
    );
    expect(contexto).toContain('LDB, capítulo V');
    expect(contexto).toContain('Exemplo adicional');
    expect(contexto).toContain('Modo de estudo: concurso');
    expect(contexto).toContain('Minha grade');
  });
  const criterios = { profundidade: 4, cobertura: 4, fundamentacao: 4, aplicacao: 4 };
  const avaliacao = {
    nota: 4,
    pontosFortes: [],
    pontosFracos: [],
    sugestoes: [],
    criterios,
    topicosPendentes: [],
  };

  it('rejeita nota global boa com profundidade insuficiente ou tópico pendente', () => {
    expect(
      avaliarAprovacao({ ...avaliacao, criterios: { ...criterios, profundidade: 1 } }, 'concurso'),
    ).toBe(false);
    expect(avaliarAprovacao({ ...avaliacao, topicosPendentes: ['LDB'] }, 'completo')).toBe(false);
    expect(avaliarAprovacao(avaliacao, 'completo')).toBe(true);
  });

  it('exige rubrica para aula completa e mantém compatibilidade no resumo', () => {
    const antiga = { nota: 4, pontosFortes: [], pontosFracos: [], sugestoes: [] };
    expect(avaliarAprovacao(antiga, 'completo')).toBe(false);
    expect(avaliarAprovacao(antiga, 'resumo')).toBe(true);
  });

  it('entrega objetivo, tópicos e evidência ao gerador e ao reviewer sem validar resumo de IA', () => {
    const contexto = montarRequisitosEstudo(
      {
        moduloId: 'm1',
        topico: 'Libras',
        modoEstudo: 'concurso',
        topicosObrigatorios: ['Educação bilíngue'],
        instrucoesExtras: 'Comparar atribuições',
      },
      {
        titulo: 'LDB',
        objetivoAprendizagem: 'Distinguir modalidades',
        trilha: {
          objetivo: {
            titulo: 'Concurso',
            descricao: 'Edital de educação',
            nivelDesejado: 'intermediario',
          },
        },
      },
      [
        {
          titulo: 'Lei',
          tipo: 'documentacao_oficial',
          resumo: 'Sugestão',
          url: 'https://exemplo.org',
          trechoConsultado: 'trecho registrado',
          localizador: 'art. 60-A',
          consultadoEm: new Date('2026-10-03'),
        },
      ],
    );
    expect(contexto).toContain('Educação bilíngue');
    expect(contexto).toContain('Edital de educação');
    expect(contexto).toContain('trecho registrado');
    expect(contexto).toContain('art. 60-A');
    expect(contexto).toContain('não verificada');
    expect(contexto).toContain('Comparar atribuições');
  });
});
