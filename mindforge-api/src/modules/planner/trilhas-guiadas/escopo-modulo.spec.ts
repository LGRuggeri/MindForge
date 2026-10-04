import { resolverEscopoModulo, selecionarIndices } from './escopo-modulo';
import { listarProgramas } from './catalogo';

describe('Grade escolhida pelo perfil', () => {
  it('mantém a ordem da grade e rejeita seleções vazias, repetidas ou fora dela', () => {
    expect(selecionarIndices(11, [5, 2])).toEqual([2, 5]);
    for (const indices of [[], [1, 1], [0], [12], [1.5]]) {
      expect(() => selecionarIndices(11, indices)).toThrow();
    }
  });
  it('resolve o tópico pela posição original salva na trilha, mesmo numa seleção parcial', () => {
    const programa = listarProgramas().find((p) => p.tipo === 'concurso')!;
    const escopo = resolverEscopoModulo({
      ordem: 1,
      trilha: { metadata: { programa, modulosIndices: [5] } },
    });
    expect(escopo?.topicosObrigatorios).toEqual(programa.modulos[4].topicosObrigatorios);
    expect(escopo?.modoEstudoPadrao).toBe('concurso');
  });
  it('preserva o retrato salvo e aceita módulos livres ou metadados antigos', () => {
    expect(resolverEscopoModulo({ ordem: 1 })).toBeUndefined();
    expect(resolverEscopoModulo({ ordem: 1, trilha: { metadata: null } })).toBeUndefined();
    const programa = {
      codigo: 'antigo',
      nome: 'Retrato',
      modulos: [{ titulo: 'Antigo', objetivoAprendizagem: 'Conteúdo histórico' }],
    };
    expect(
      resolverEscopoModulo({ ordem: 1, trilha: { metadata: { certificacao: programa } } })
        ?.topicosObrigatorios,
    ).toEqual(['Conteúdo histórico']);
  });
});
