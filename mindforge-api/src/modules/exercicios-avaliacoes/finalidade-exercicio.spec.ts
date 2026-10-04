import { ForbiddenException } from '@nestjs/common';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';

describe('Questões reservadas para avaliação', () => {
  it('impede obter correção antecipada por uma tentativa avulsa, inclusive assíncrona', async () => {
    const repo = {
      buscarExercicioPorId: jest
        .fn()
        .mockResolvedValue({
          id: 'questao',
          moduloId: 'modulo',
          finalidade: 'avaliacao',
          tipo: 'questao_objetiva',
          enunciado: 'Pergunta',
          gabarito: 'A',
          criterios: null,
        }),
      contarTentativasPorExercicio: jest.fn().mockResolvedValue(0),
      salvarTentativa: jest.fn().mockResolvedValue({}),
    };
    const planner = {
      buscarModuloPorId: jest
        .fn()
        .mockResolvedValue({ trilha: { objetivo: { perfilId: 'perfil' } } }),
    };
    const fila = { send: jest.fn() };
    const service = new ExerciciosAvaliacoesService(
      repo as never,
      {} as never,
      {} as never,
      {} as never,
      planner as never,
      fila as never,
    );
    for (const async of [false, true]) {
      await expect(
        service.submeterTentativa({
          perfilId: 'perfil',
          exercicioId: 'questao',
          respostaUsuario: 'A',
          async,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(repo.salvarTentativa).not.toHaveBeenCalled();
    expect(fila.send).not.toHaveBeenCalled();
  });
});
