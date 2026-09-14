import { ForbiddenException } from '@nestjs/common';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import { AvaliacoesService } from './avaliacoes.service';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';

comSql('Resultado de avaliação — persistência entre consultas SQL', () => {
  const banco = new PostgresIsolado();
  beforeAll(async () => {
    await banco.iniciar();
  });
  afterAll(async () => {
    await banco.encerrar();
  });

  it('recupera em outra conexão o resultado finalizado sem recalcular ou disparar efeitos', async () => {
    const db = banco.bancos[0];
    const ciclo = await criarCiclo(db);
    const outro = await criarCiclo(db, 'Outro');
    const repo = new ExerciciosAvaliacoesRepository(db);
    const revisao = { processarRevisao: jest.fn() };
    const grafo = { marcarProgressoPorModulo: jest.fn() };
    const service = new AvaliacoesService(repo, revisao as never, grafo as never, db);
    const exercicio = await repo.criarExercicio({
      moduloId: ciclo.modulo.id,
      enunciado: 'Quanto é 2 + 2?',
      tipo: 'questao_objetiva',
    });
    const { avaliacaoId } = await repo.criarAvaliacaoComExercicios(
      { titulo: 'Simulado', tipo: 'simulado', moduloId: ciclo.modulo.id },
      [exercicio.id],
    );
    expect(await service.buscarResultado(avaliacaoId, ciclo.perfil.id)).toEqual({
      resultado: null,
    });
    const tentativa = await repo.salvarTentativa({
      exercicioId: exercicio.id,
      avaliacaoId,
      perfilId: ciclo.perfil.id,
      respostaUsuario: '4',
      pontuacao: '10',
      correta: true,
    });
    const salvo = await service.submeter({
      avaliacaoId,
      perfilId: ciclo.perfil.id,
      respostas: [{ exercicioId: exercicio.id, tentativaId: tentativa.id }],
    });
    expect(revisao.processarRevisao).toHaveBeenCalledTimes(1);
    expect(grafo.marcarProgressoPorModulo).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    const novoService = new AvaliacoesService(
      new ExerciciosAvaliacoesRepository(banco.bancos[1]),
      revisao as never,
      grafo as never,
      banco.bancos[1],
    );
    expect(await novoService.buscarResultado(avaliacaoId, ciclo.perfil.id)).toEqual({
      resultado: salvo,
    });
    expect(await novoService.buscarResultado(avaliacaoId, ciclo.perfil.id)).toEqual({
      resultado: salvo,
    });
    await expect(novoService.buscarResultado(avaliacaoId, outro.perfil.id)).rejects.toThrow(
      ForbiddenException,
    );
    expect(revisao.processarRevisao).not.toHaveBeenCalled();
    expect(grafo.marcarProgressoPorModulo).not.toHaveBeenCalled();
  });
});
