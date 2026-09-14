import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { PlannerRepository } from './planner.repository';

comSql('Planner — transações e cascatas no PostgreSQL', () => {
  const banco = new PostgresIsolado();
  let repo: PlannerRepository;
  let ciclo: Awaited<ReturnType<typeof criarCiclo>>;
  beforeAll(async () => {
    await banco.iniciar();
    repo = new PlannerRepository(banco.bancos[0]);
  });
  beforeEach(async () => {
    await banco.limpar();
    ciclo = await criarCiclo(banco.bancos[0]);
  });
  afterAll(async () => {
    await banco.encerrar();
  });

  it('persiste nova trilha e substitui somente a anterior do mesmo objetivo', async () => {
    const outro = await criarCiclo(banco.bancos[0], 'Outro');
    const objetivo = await repo.criarObjetivo({ perfilId: ciclo.perfil.id, titulo: 'Segundo' });
    expect((await repo.listarObjetivosDoPerfil(ciclo.perfil.id)).map((o) => o.id).sort()).toEqual(
      [ciclo.objetivo.id, objetivo.id].sort(),
    );
    const nova = await repo.executarEmTransacao(async (tx) => {
      const trilha = await repo.criarTrilha(
        { objetivoId: ciclo.objetivo.id, criadoEm: new Date('2099-01-01') },
        tx,
      );
      await repo.criarModulos([{ trilhaId: trilha.id, ordem: 1, titulo: 'Novo' }], tx);
      await repo.substituirTrilhasAnteriores(ciclo.objetivo.id, trilha.id, tx);
      return trilha;
    });
    const lido = await repo.buscarObjetivoPorId(ciclo.objetivo.id);
    expect(lido).toMatchObject({ perfil: { id: ciclo.perfil.id } });
    expect(lido?.trilhas.map((t) => [t.id, t.status])).toEqual([
      [nova.id, 'ativa'],
      [ciclo.trilha.id, 'substituida'],
    ]);
    expect(lido?.trilhas[0].modulos[0].titulo).toBe('Novo');
    expect((await repo.buscarObjetivoPorId(outro.objetivo.id))?.trilhas[0].status).toBe('ativa');
    expect(await repo.buscarObjetivoPorId(randomUUID())).toBeUndefined();
    const avulsa = await repo.criarTrilha({ objetivoId: objetivo.id });
    const [modulo] = await repo.criarModulos([{ trilhaId: avulsa.id, ordem: 1, titulo: 'Avulso' }]);
    await repo.substituirTrilhasAnteriores(objetivo.id, avulsa.id);
    expect(await repo.buscarModuloPorId(modulo.id)).toMatchObject({
      trilha: { objetivo: { id: objetivo.id } },
    });
    expect(await repo.criarModulos([])).toEqual([]);
  });

  it('falha ao criar módulos reverte trilha e substituição anteriores', async () => {
    await expect(
      repo.executarEmTransacao(async (tx) => {
        const nova = await repo.criarTrilha({ objetivoId: ciclo.objetivo.id }, tx);
        await repo.substituirTrilhasAnteriores(ciclo.objetivo.id, nova.id, tx);
        await repo.criarModulos(
          [
            { trilhaId: nova.id, ordem: 1, titulo: 'A' },
            { trilhaId: nova.id, ordem: 1, titulo: 'B' },
          ],
          tx,
        );
      }),
    ).rejects.toThrow();
    const objetivo = await repo.buscarObjetivoPorId(ciclo.objetivo.id);
    expect(objetivo?.trilhas).toHaveLength(1);
    expect(objetivo?.trilhas[0]).toMatchObject({ id: ciclo.trilha.id, status: 'ativa' });
    expect(objetivo?.trilhas[0].modulos).toHaveLength(1);
  });

  it('exclui conteúdo dependente, anula referências e preserva competências compartilhadas/manuais', async () => {
    const db = banco.bancos[0];
    const outro = await criarCiclo(db, 'Outro');
    const competencias = await db
      .insert(schema.competencias)
      .values([
        { nome: 'Exclusiva', categoria: 'planner' },
        { nome: 'Compartilhada', categoria: 'synthesizer' },
        { nome: 'Manual', categoria: 'pessoal' },
      ])
      .returning();
    await db
      .insert(schema.moduloCompetencias)
      .values([
        ...competencias.map((c) => ({ moduloId: ciclo.modulo.id, competenciaId: c.id })),
        { moduloId: outro.modulo.id, competenciaId: competencias[1].id },
      ]);
    await db
      .insert(schema.competenciaProgresso)
      .values({ competenciaId: competencias[0].id, perfilId: ciclo.perfil.id });
    await db
      .insert(schema.competenciaRelacoes)
      .values({
        competenciaOrigemId: competencias[0].id,
        competenciaDestinoId: competencias[1].id,
        tipoRelacao: 'relacionada',
      });
    const [fonte] = await db
      .insert(schema.fontesPesquisa)
      .values({ moduloId: ciclo.modulo.id, titulo: 'Fonte', tipo: 'livro' })
      .returning();
    const [conteudo] = await db
      .insert(schema.conteudos)
      .values({ moduloId: ciclo.modulo.id, titulo: 'Texto', corpoMarkdown: 'Conteúdo' })
      .returning();
    await db.insert(schema.conteudoFontes).values({ conteudoId: conteudo.id, fonteId: fonte.id });
    await db
      .insert(schema.exercicios)
      .values({ moduloId: ciclo.modulo.id, tipo: 'questao_objetiva', enunciado: 'Pergunta' });
    const [diario] = await db
      .insert(schema.diarioAprendizagem)
      .values({ perfilId: ciclo.perfil.id })
      .returning();
    await db
      .insert(schema.diarioModulos)
      .values({ diarioId: diario.id, moduloId: ciclo.modulo.id });
    await db
      .insert(schema.projetos)
      .values({
        perfilId: ciclo.perfil.id,
        objetivoId: ciclo.objetivo.id,
        moduloId: ciclo.modulo.id,
        titulo: 'Projeto',
        descricao: 'Preservar',
      });
    await db
      .insert(schema.avaliacoes)
      .values({
        moduloId: ciclo.modulo.id,
        trilhaId: ciclo.trilha.id,
        titulo: 'Avaliação',
        tipo: 'formativa',
      });
    const ids = await repo.listarCompetenciasDosModulosDoObjetivo(ciclo.objetivo.id);
    expect(new Set(ids)).toEqual(new Set(competencias.map((c) => c.id)));
    expect(await repo.removerCompetenciasOrfas(ids)).toBe(0);
    expect(await repo.removerCompetenciasOrfas([])).toBe(0);
    expect((await repo.removerObjetivo(ciclo.objetivo.id)).id).toBe(ciclo.objetivo.id);
    expect(await repo.removerCompetenciasOrfas(ids)).toBe(1);
    expect((await db.select().from(schema.competencias)).map((c) => c.nome).sort()).toEqual([
      'Compartilhada',
      'Manual',
    ]);
    expect(await db.select().from(schema.competenciaProgresso)).toEqual([]);
    expect(await db.select().from(schema.competenciaRelacoes)).toEqual([]);
    expect(await db.select().from(schema.conteudos)).toEqual([]);
    expect(await db.select().from(schema.conteudoFontes)).toEqual([]);
    expect(await db.select().from(schema.exercicios)).toEqual([]);
    expect(await db.select().from(schema.diarioModulos)).toEqual([]);
    expect(await db.select().from(schema.projetos)).toEqual([
      expect.objectContaining({ objetivoId: null, moduloId: null }),
    ]);
    expect(await db.select().from(schema.avaliacoes)).toEqual([
      expect.objectContaining({ moduloId: null, trilhaId: null }),
    ]);
    expect(await db.select().from(schema.fontesPesquisa)).toEqual([
      expect.objectContaining({ id: fonte.id, moduloId: null }),
    ]);
    expect(
      await db
        .select()
        .from(schema.modulosTrilha)
        .where(eq(schema.modulosTrilha.id, outro.modulo.id)),
    ).toHaveLength(1);
    expect(await repo.removerObjetivo(ciclo.objetivo.id)).toBeUndefined();
  });
});
