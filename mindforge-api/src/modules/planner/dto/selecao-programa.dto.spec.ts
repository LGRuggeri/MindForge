import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CriarObjetivoDto } from './criar-objetivo.dto';
import { GerarTrilhaDto } from './gerar-trilha.dto';

describe('Seleção de programa nas bordas HTTP', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  it.each([[], [1, 1], [0], [-1], [1.5], ['1'], '1'])('rejeita módulos inválidos %j', (indices) => {
    for (const dto of [
      plainToInstance(CriarObjetivoDto, {
        perfilId: id,
        titulo: 'Grade',
        programaCodigo: 'AZ-900',
        modulosIndices: indices,
      }),
      plainToInstance(GerarTrilhaDto, {
        objetivoId: id,
        programaCodigo: 'AZ-900',
        modulosIndices: indices,
      }),
    ]) {
      expect(validateSync(dto).map((e) => e.property)).toContain('modulosIndices');
    }
  });
  it('aceita seleção válida e mantém o objetivo livre e o código antigo de certificação', () => {
    expect(
      validateSync(plainToInstance(CriarObjetivoDto, { perfilId: id, titulo: 'Livre' })),
    ).toEqual([]);
    expect(
      validateSync(
        plainToInstance(CriarObjetivoDto, {
          perfilId: id,
          titulo: 'Grade',
          programaCodigo: 'CONCURSO-LIBRAS-IBAM-2026',
          modulosIndices: [1, 5],
        }),
      ),
    ).toEqual([]);
    expect(
      validateSync(
        plainToInstance(GerarTrilhaDto, {
          objetivoId: id,
          certificacaoCodigo: 'AZ-900',
          modulosIndices: [1],
        }),
      ),
    ).toEqual([]);
  });
});
