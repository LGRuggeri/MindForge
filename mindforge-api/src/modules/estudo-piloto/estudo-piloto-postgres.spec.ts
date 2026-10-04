import { randomUUID } from 'node:crypto';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { EstudoPilotoRepository } from './estudo-piloto.repository';
import { ExerciciosAvaliacoesRepository } from '../exercicios-avaliacoes/exercicios-avaliacoes.repository';
import { ExerciciosAvaliacoesService } from '../exercicios-avaliacoes/exercicios-avaliacoes.service';
import { AvaliacoesService } from '../exercicios-avaliacoes/avaliacoes.service';
import { and, eq, sql } from 'drizzle-orm';

comSql('Piloto Libras — instalação, privacidade e avaliação SQL', () => {
  const banco = new PostgresIsolado();
  beforeAll(() => banco.iniciar());
  beforeEach(() => banco.limpar());
  afterAll(() => banco.encerrar());

  it('instala atomicamente sem duplicar em concorrência e preserva os estudos anteriores', async () => {
    const db = banco.bancos[0];
    const ciclo = await criarCiclo(db);
    const a = new EstudoPilotoRepository(db);
    const b = new EstudoPilotoRepository(banco.bancos[1]);
    expect(await a.instalar(randomUUID())).toBeNull();
    const resultados = await Promise.all([
      a.instalar(ciclo.perfil.id),
      b.instalar(ciclo.perfil.id),
    ]);
    expect(resultados.filter((registro) => registro?.criado)).toHaveLength(1);
    expect(resultados[0]?.trilhaId).toBe(resultados[1]?.trilhaId);
    expect(await db.select().from(schema.objetivosEstudo)).toHaveLength(2);
    expect(await db.select().from(schema.modulosTrilha)).toHaveLength(12);
    expect(await db.select().from(schema.conteudos)).toHaveLength(11);
    const questoes = await db.select().from(schema.exercicios);
    expect(questoes.filter((q) => q.finalidade === 'treino')).toHaveLength(26);
    expect(questoes.filter((q) => q.finalidade === 'avaliacao')).toHaveLength(19);
    const fontes = await db.select().from(schema.fontesPesquisa);
    expect(fontes.length).toBeGreaterThan(20);
    expect(
      fontes.every((fonte) => fonte.consultadoEm && fonte.trechoConsultado && fonte.localizador),
    ).toBe(true);
    const outro = await criarCiclo(db, 'Outro perfil');
    expect((await a.instalar(outro.perfil.id))?.trilhaId).not.toBe(resultados[0]?.trilhaId);
  });

  it('preserva o percurso v1 e o progresso ao instalar v2; não recria v2 incompleto', async () => {
    const db = banco.bancos[0];
    const ciclo = await criarCiclo(db);
    await db
      .update(schema.trilhasEstudo)
      .set({ metadata: { pilotoCodigo: 'libras-ibam-2026-piloto-v1' } })
      .where(eq(schema.trilhasEstudo.id, ciclo.trilha.id));
    await db
      .update(schema.modulosTrilha)
      .set({ status: 'concluido' })
      .where(eq(schema.modulosTrilha.id, ciclo.modulo.id));
    const repo = new EstudoPilotoRepository(db);
    const novo = (await repo.instalar(ciclo.perfil.id))!;
    expect(novo.trilhaId).not.toBe(ciclo.trilha.id);
    const [antigo] = await db
      .select()
      .from(schema.modulosTrilha)
      .where(eq(schema.modulosTrilha.id, ciclo.modulo.id));
    expect(antigo.status).toBe('concluido');
    expect((await repo.instalar(ciclo.perfil.id))?.criado).toBe(false);
    await db.delete(schema.modulosTrilha).where(eq(schema.modulosTrilha.id, novo.modulos[0].id));
    await expect(repo.instalar(ciclo.perfil.id)).rejects.toThrow('incompleto');
    expect(await db.select().from(schema.objetivosEstudo)).toHaveLength(2);
  });

  it('reserva o banco da avaliação e mantém exercícios legados como treino', async () => {
    const db = banco.bancos[0];
    const ciclo = await criarCiclo(db);
    const repo = new ExerciciosAvaliacoesRepository(db);
    const legado = await repo.criarExercicio({
      moduloId: ciclo.modulo.id,
      tipo: 'questao_objetiva',
      enunciado: 'Legado',
      gabarito: 'A',
    });
    expect(legado.finalidade).toBe('treino');
    expect(await repo.listarExerciciosPublicosPorModulo(ciclo.modulo.id)).toHaveLength(1);
    const instalado = (await new EstudoPilotoRepository(db).instalar(ciclo.perfil.id))!;
    const treino = await repo.listarExerciciosPorTrilha(instalado.trilhaId);
    expect(treino).toHaveLength(26);
    const prova = (await repo.buscarAvaliacaoPorId(instalado.avaliacaoId))!;
    expect(prova.exercicios).toHaveLength(19);
    const idsTreino = new Set(treino.map((q) => q.id));
    expect(prova.exercicios.every((q) => !idsTreino.has(q.exercicioId))).toBe(true);
    for (const modulo of instalado.modulos) {
      const publicas = await repo.listarExerciciosPublicosPorModulo(modulo.id);
      expect(publicas.every((q) => idsTreino.has(q.id))).toBe(true);
    }
    await expect(
      db
        .insert(schema.exercicios)
        .values({
          moduloId: ciclo.modulo.id,
          tipo: 'questao_objetiva',
          enunciado: 'Inválida',
          finalidade: 'outra',
        }),
    ).rejects.toThrow();
    const reservadas = await db
      .select()
      .from(schema.exercicios)
      .where(
        and(
          eq(schema.exercicios.finalidade, 'avaliacao'),
          sql`${schema.exercicios.comentario}->>'topicoRevisao' LIKE 'E%'`,
        ),
      );
    expect(reservadas).toHaveLength(19);
  });

  it('não revela comentários antes da prova e os preserva no resultado final', async () => {
    const db = banco.bancos[0];
    const ciclo = await criarCiclo(db);
    const instalado = (await new EstudoPilotoRepository(db).instalar(ciclo.perfil.id))!;
    const repo = new ExerciciosAvaliacoesRepository(db);
    const prova = (await repo.buscarAvaliacaoPorId(instalado.avaliacaoId))!;
    const publico = JSON.stringify(prova);
    expect(publico).not.toContain('gabarito');
    expect(publico).not.toContain('comentario');
    expect(
      JSON.stringify(await repo.listarExerciciosPublicosPorModulo(instalado.modulos[0].id)),
    ).not.toContain('gabarito');
    const planner = {
      buscarModuloPorId: jest.fn().mockResolvedValue({
        titulo: 'Piloto',
        objetivoAprendizagem: 'Estudar',
        trilha: { objetivo: { perfilId: ciclo.perfil.id } },
      }),
    };
    const service = new ExerciciosAvaliacoesService(
      repo,
      {} as never,
      {} as never,
      { marcarProgressoPorModulo: jest.fn() } as never,
      planner as never,
      {} as never,
    );
    const respostas: { exercicioId: string; tentativaId: string }[] = [];
    for (const item of prova.exercicios) {
      const interna = (await repo.buscarExercicioPorId(item.exercicioId))!;
      const tentativa = await service.submeterTentativa({
        perfilId: ciclo.perfil.id,
        exercicioId: interna.id,
        avaliacaoId: instalado.avaliacaoId,
        respostaUsuario: interna.gabarito!,
      });
      expect(tentativa).toMatchObject({ correta: null, pontuacao: null, feedbackIa: null });
      expect(JSON.stringify(tentativa)).not.toContain('**Gabarito');
      respostas.push({ exercicioId: interna.id, tentativaId: (tentativa as { id: string }).id });
    }
    const avaliacoes = new AvaliacoesService(
      repo,
      { processarRevisao: jest.fn() } as never,
      { marcarProgressoPorModulo: jest.fn() } as never,
      db,
    );
    const resultado = await avaliacoes.submeter({
      perfilId: ciclo.perfil.id,
      avaliacaoId: instalado.avaliacaoId,
      respostas,
    });
    expect(Number(resultado.pontuacaoTotal)).toBe(10);
    expect(resultado.feedbackExercicios).toHaveLength(19);
    expect(
      resultado.feedbackExercicios?.every((feedback) =>
        feedback.feedbackIa?.includes('**Gabarito'),
      ),
    ).toBe(true);
  });
});
