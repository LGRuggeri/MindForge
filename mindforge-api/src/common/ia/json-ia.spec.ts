import { lerJsonIa, validarRespostaIa } from './json-ia';
import { conteudoGeradoSchema, respostaTutorSchema } from './contratos-ia';

describe('JSON de IA', () => {
  const valor = {
    resposta: '```python\nprint("Olá")\n``` e ```json literal',
    citacoes: [],
    proximosPassos: [],
  };
  it.each(['', 'json', 'JSON'])('remove somente o bloco externo %s', (linguagem) => {
    expect(lerJsonIa(` \n\`\`\`${linguagem}\n${JSON.stringify(valor)}\n\`\`\` \n`)).toEqual(valor);
  });
  it('preserva Markdown no JSON sem invólucro', () => {
    expect(lerJsonIa(JSON.stringify(valor))).toEqual(valor);
  });
  it('não inclui a resposta privada no erro de parsing ou validação', () => {
    expect(() => lerJsonIa('SEGREDO')).toThrow('A resposta da IA não contém JSON válido');
    expect(() => validarRespostaIa('SEGREDO', respostaTutorSchema, 'Teacher')).toThrow(
      'O agente Teacher retornou uma resposta inválida',
    );
  });
  it('normaliza idioma inválido para permitir o fallback existente', () => {
    expect(respostaTutorSchema.parse({ ...valor, idioma: 12 }).idioma).toBe('');
  });
  it('preserva posições de ilustrações opcionais inválidas', () => {
    expect(
      conteudoGeradoSchema.parse({
        titulo: 'Título',
        corpoMarkdown: '[[imagem:1]]',
        resumo: '',
        palavrasChave: [],
        ilustracoes: [null, { prompt: 'Exemplo' }],
      }).ilustracoes,
    ).toEqual([{ prompt: '' }, { prompt: 'Exemplo' }]);
  });
});
