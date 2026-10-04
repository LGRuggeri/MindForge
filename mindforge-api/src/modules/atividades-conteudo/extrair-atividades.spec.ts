import { extrairAtividades } from './extrair-atividades';
import { aulasLibras } from '../estudo-piloto/libras.catalogo';

describe('Atividades existentes dentro do conteúdo', () => {
  it('reconhece as quatro perguntas da aula mostrada, sem capturar critérios ou revisão', () => {
    const aula = aulasLibras.find((a) => a.codigo === 'lingua-cultura')!;
    const atividades = extrairAtividades(aula.corpoMarkdown);
    expect(atividades).toHaveLength(4);
    expect(atividades[0].enunciado).toContain('Libras não tem gramática');
    expect(atividades[3].enunciado).toContain('videolivro');
    expect(atividades.every((a) => /^[a-f0-9]{64}$/.test(a.chave))).toBe(true);
    expect(extrairAtividades(aula.corpoMarkdown)).toEqual(atividades);
  });
  it('reconhece lista numerada, continuidade e subtarefas sem misturar exemplos, código e critérios', () => {
    const texto =
      '# Aula\n1. Exemplo\n\n```md\n## Atividades\n1. Não extrair\n```\n## 5. Atividades de aplicação\n\n1. Compare **conceitos**.\n   Explique por quê.\n   - Inclua um exemplo.\n2. Aplique ao caso.\n\n<details>\n<summary>Critérios</summary>\n1. Não responder este critério.\n</details>\n## Revisão\n1. Outra seção';
    const atividades = extrairAtividades(texto);
    expect(atividades).toHaveLength(2);
    expect(atividades[0].enunciado).toContain('Explique por quê');
    expect(atividades[0].enunciado).toContain('Inclua um exemplo');
    expect(atividades[0].linhaInicial).toBe(10);
    expect(atividades[1].numero).toBe(2);
  });
  it('aceita listas de marcadores, CRLF e múltiplas seções, com chaves distintas', () => {
    const atividades = extrairAtividades(
      '## Atividades\r\n- Descreva.\r\n- Compare.\r\n## Referências\r\n- Fonte\r\n## Atividades práticas\r\n1) Descreva.',
    );
    expect(atividades).toHaveLength(3);
    expect(new Set(atividades.map((a) => a.chave)).size).toBe(3);
    expect(extrairAtividades('## Critérios de resposta das atividades\n1. Critério')).toEqual([]);
    expect(extrairAtividades('# Texto sem atividades')).toEqual([]);
  });
});
