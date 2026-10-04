import { corrigirQuestaoObjetiva } from './comentario-questao';

describe('Correção objetiva comentada', () => {
  it('corrige deterministamente e explica acerto, distratores e fonte', () => {
    const resultado = corrigirQuestaoObjetiva(' b ', 'B', {
      explicacao: 'A função é interpretar.',
      alternativas: [{ alternativa: 'A', explicacao: 'Confunde docência e interpretação.' }],
      fontes: ['https://exemplo.org/lei'],
      topicoRevisao: 'Atribuições',
    });
    expect(resultado.correta).toBe(true);
    expect(resultado.pontuacao).toBe(10);
    expect(resultado.feedback).toContain('Confunde docência');
    expect(resultado.feedback).toContain('https://exemplo.org/lei');
    expect(resultado.feedback).toContain('Atribuições');
  });

  it('preserva gabaritos antigos sem comentário e tolera acentos', () => {
    expect(corrigirQuestaoObjetiva('PARÍS', 'Paris', null)).toEqual({
      correta: true,
      pontuacao: 10,
      feedback: 'Resposta correta!',
    });
    expect(corrigirQuestaoObjetiva('Londres', 'Paris', null).feedback).toContain('Paris');
  });
});
