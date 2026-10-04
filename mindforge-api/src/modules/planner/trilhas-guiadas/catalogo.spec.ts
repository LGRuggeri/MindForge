import { listarCertificacoes, listarProgramas, programas } from './catalogo';

describe('Catálogo de trilhas guiadas', () => {
  it('oferece assuntos e certificações com códigos únicos', () => {
    const todos = listarProgramas();
    expect(todos).toHaveLength(6);
    expect(new Set(todos.map((programa) => programa.codigo)).size).toBe(todos.length);
    expect(listarCertificacoes().map((programa) => programa.codigo)).toEqual([
      'AZ-900',
      'AWS-CLF-C02',
      'ISC2-CC',
    ]);
  });

  it.each(programas)(
    '$codigo tem módulos ordenáveis e cobre todas as seções do programa',
    (programa) => {
      expect(programa.modulos.length).toBeGreaterThanOrEqual(3);
      if (programa.tipo !== 'concurso') expect(programa.modulos.length).toBeLessThanOrEqual(8);
      expect(new Set(programa.modulos.map((modulo) => modulo.dominioCodigo))).toEqual(
        new Set(programa.dominios.map((dominio) => dominio.codigo)),
      );
      expect(programa.modulos.every((modulo) => modulo.tempoEstimadoMin > 0)).toBe(true);
      expect(programa.fonteOficial).toMatch(/^https:\/\//);
    },
  );

  it('oferece núcleo comum e grade específica de Libras sem distribuir aulas ou gabaritos pelo catálogo', () => {
    const libras = listarProgramas().find((p) => p.tipo === 'concurso');
    expect(libras?.modulos).toHaveLength(27);
    expect(libras?.nome).toContain('Intérprete');
    expect(JSON.stringify(libras)).not.toMatch(/corpoMarkdown|gabarito|questoesAvaliacao/);
    expect(libras?.modulos.every((m) => m.topicosObrigatorios?.length && m.fontes?.length)).toBe(
      true,
    );
  });

  it('só atribui pesos de prova às certificações', () => {
    for (const programa of listarProgramas()) {
      for (const dominio of programa.dominios) {
        if (programa.tipo === 'certificacao') {
          expect(dominio.pesoMinimo).toBeGreaterThan(0);
          expect(dominio.pesoMaximo).toBeGreaterThan(0);
        } else {
          expect('pesoMinimo' in dominio).toBe(false);
          expect('pesoMaximo' in dominio).toBe(false);
        }
      }
    }
  });
});
