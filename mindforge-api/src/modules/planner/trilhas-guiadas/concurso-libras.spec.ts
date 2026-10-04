import { aulasLibras } from '../../estudo-piloto/libras.catalogo';
import { montarRequisitosEstudo } from '../../synthesizer/requisitos-estudo';
import { buscarPrograma } from './catalogo';
import { resolverEscopoModulo, selecionarIndices } from './escopo-modulo';

describe('Concurso Libras — núcleo comum do Anexo III', () => {
  const programa = buscarPrograma('CONCURSO-LIBRAS-IBAM-2026')!;
  it('mantém as posições específicas antigas e inclui todos os grupos do núcleo comum', () => {
    expect(programa.modulos.slice(0, 11).map((m) => m.titulo)).toEqual(
      aulasLibras.map((a) => a.titulo),
    );
    expect(programa.modulos).toHaveLength(27);
    expect(programa.modulos.filter((m) => m.titulo.startsWith('Português —'))).toHaveLength(6);
    expect(programa.modulos.filter((m) => m.titulo.startsWith('Legislação —'))).toHaveLength(7);
    expect(programa.modulos.filter((m) => m.titulo.startsWith('Raciocínio lógico —'))).toHaveLength(
      3,
    );
    expect(selecionarIndices(programa.modulos.length)).toEqual(
      Array.from({ length: 27 }, (_, i) => i + 1),
    );
  });

  it('cobre Português de nível superior sem confundir com Português para surdos', () => {
    const topicos = programa.modulos.slice(11, 17).flatMap((m) => m.topicosObrigatorios ?? []);
    for (const item of [
      'Interpretação, compreensão e inferência em textos verbais e não verbais',
      'Recursos linguísticos e características do texto',
      'Tipos e gêneros textuais',
      'Ideias expressas e ponto de vista do autor',
      'Sentido e emprego de palavras e expressões no contexto; significação das palavras',
      'Coesão e coerência',
      'Funções da linguagem',
      'Figuras de linguagem',
      'Reconhecimento, emprego e sentidos das classes gramaticais',
      'Processos de formação de palavras; sentidos de prefixos e sufixos',
      'Flexão dos nomes e verbos',
      'Emprego e colocação dos pronomes átonos',
      'Termos sintáticos da oração',
      'Concordância nominal e verbal',
      'Transitividade e regência dos nomes e verbos',
      'Uso do acento grave: crase',
      'Emprego dos sinais de pontuação',
      'Acentuação gráfica',
      'Uso dos porquês',
      'Ortografia',
    ])
      expect(topicos).toContain(item);
  });

  it('inclui a legislação geral e educacional e o raciocínio lógico do mesmo bloco', () => {
    const topicos = programa.modulos.slice(17).flatMap((m) => m.topicosObrigatorios ?? []);
    for (const item of [
      'Constituição Federal: princípios fundamentais, direitos e garantias fundamentais e organização do Estado (Títulos I, II e III)',
      'Princípios da Administração Pública',
      'Lei de Acesso à Informação: Lei 12.527/2011',
      'Lei de Improbidade Administrativa: Lei 8.429/1992',
      'Lei Orgânica do Município de Balneário Piçarras',
      'Lei Complementar municipal 87/2013: Sistema Municipal de Ensino',
      'Lei de Diretrizes e Bases da Educação Nacional: Lei 9.394/1996 e suas alterações',
      'Resolução CNE/CEB 4, de 13 de julho de 2010: Diretrizes Curriculares Nacionais para a Educação Básica',
      'BNCC: Base Nacional Comum Curricular',
      'Política Nacional de Educação Especial na Perspectiva da Educação Inclusiva',
      'Estatuto da Criança e do Adolescente: Lei 8.069/1990',
      'Adição, subtração, multiplicação e divisão de inteiros e racionais em forma decimal e fracionária',
      'Porcentagem',
      'Regra de três simples e composta',
      'Razão e proporção',
      'Sistema métrico: tempo, massa, comprimento, superfície, volume e capacidade',
      'Interpretação de gráficos e tabelas',
      'Média aritmética simples',
      'Operações e problemas com conjuntos',
      'Resolução de situações-problema',
    ])
      expect(topicos).toContain(item);
    expect(
      programa.modulos
        .slice(11)
        .every((m) =>
          m.fontes?.some(
            (f) => f.url.endsWith('/an3.psedu26.pdf') && f.localizador.includes('página 1'),
          ),
        ),
    ).toBe(true);
  });

  it('leva os tópicos comuns ao gerador e reviewer mesmo com foco adicional do aluno', () => {
    for (const indice of [12, 21, 27]) {
      const modulo = programa.modulos[indice - 1];
      const contexto = montarRequisitosEstudo(
        { moduloId: 'm', topico: 'Meu foco', topicosObrigatorios: ['Exemplo adicional'] },
        { ...modulo, ordem: 1, trilha: { metadata: { programa, modulosIndices: [indice] } } },
        [],
      );
      expect(contexto).toContain('Modo de estudo: concurso');
      expect(contexto).toContain('Exemplo adicional');
      for (const topico of modulo.topicosObrigatorios ?? []) expect(contexto).toContain(topico);
      expect(
        resolverEscopoModulo({
          ordem: 1,
          trilha: {
            metadata: {
              programa,
              modulosIndices: [indice],
            },
          },
        })?.topicosObrigatorios,
      ).toEqual(modulo.topicosObrigatorios);
    }
  });

  it('preserva o escopo dos retratos de onze módulos criados antes da ampliação', () => {
    const antigo = {
      ...programa,
      nome: 'Conhecimentos específicos',
      modulos: programa.modulos.slice(0, 11),
    };
    const metadata = { programa: antigo, modulosIndices: [5, 11] };
    const escopo = resolverEscopoModulo({ ordem: 2, trilha: { metadata } });
    expect(escopo?.programaNome).toBe('Conhecimentos específicos');
    expect(escopo?.topicosObrigatorios).toEqual(antigo.modulos[10].topicosObrigatorios);
    expect(metadata.programa.modulos).toHaveLength(11);
    expect(() => selecionarIndices(programa.modulos.length, [28])).toThrow();
  });
});
