import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { ProjetosRepository } from './projetos.repository';

comSql('Projetos — relações, entregas e concorrência no PostgreSQL', () => {
  const banco = new PostgresIsolado();
  let repo: ProjetosRepository;
  let ciclo: Awaited<ReturnType<typeof criarCiclo>>;
  beforeAll(async () => {
    await banco.iniciar();
    repo = new ProjetosRepository(banco.bancos[0]);
  });
  beforeEach(async () => {
    await banco.limpar();
    ciclo = await criarCiclo(banco.bancos[0]);
  });
  afterAll(async () => {
    await banco.encerrar();
  });
  const criar = (titulo: string, criadoEm: Date) =>
    repo.criar({
      perfilId: ciclo.perfil.id,
      moduloId: ciclo.modulo.id,
      objetivoId: ciclo.objetivo.id,
      titulo,
      descricao: 'Prática',
      criadoEm,
    });

  it('lista projetos do módulo/objetivo com entregas e ordem decrescente', async () => {
    const antigo = await criar('Antigo', new Date('2026-09-01'));
    const recente = await criar('Recente', new Date('2026-09-02'));
    const outro = await criarCiclo(banco.bancos[0], 'Outro perfil');
    await repo.criar({
      perfilId: outro.perfil.id,
      moduloId: outro.modulo.id,
      objetivoId: outro.objetivo.id,
      titulo: 'Estrangeiro',
      descricao: 'Outro',
    });
    const entrega = await repo.adicionarEntregaSequencial(recente.id, {
      conteudo: 'Solução',
      feedback: 'Correto',
      pontuacao: '9',
    });
    expect((await repo.listarPorModulo(ciclo.modulo.id)).map((p) => p.id)).toEqual([
      recente.id,
      antigo.id,
    ]);
    const listada = (await repo.listarPorObjetivo(ciclo.objetivo.id))[0].entregas[0];
    expect(listada).toMatchObject({ id: entrega.id, numeroEntrega: 1 });
    expect(Number(listada.pontuacao)).toBe(9);
    expect(await repo.contarEntregas(recente.id)).toBe(1);
    expect(await repo.contarEntregas(antigo.id)).toBe(0);
    expect(await repo.buscarPorId(recente.id)).toMatchObject({
      modulo: { id: ciclo.modulo.id },
      objetivo: { id: ciclo.objetivo.id },
    });
    expect(await repo.buscarModulo(ciclo.modulo.id)).toMatchObject({
      trilha: { objetivo: { perfilId: ciclo.perfil.id } },
    });
    expect(await repo.buscarObjetivo(ciclo.objetivo.id)).toMatchObject({
      perfilId: ciclo.perfil.id,
    });
    expect((await repo.atualizarStatus(recente.id, 'concluido')).status).toBe('concluido');
    expect(await repo.buscarPorId(randomUUID())).toBeUndefined();
    await expect(repo.atualizarStatus(recente.id, 'inválido')).rejects.toThrow();
    expect((await repo.buscarPorId(recente.id))?.status).toBe('concluido');
  });

  it('aloca números distintos para entregas simultâneas em duas conexões', async () => {
    const projeto = await criar('Concorrência', new Date('2026-09-01'));
    const pids = await Promise.all(
      banco.conexoes.map(
        async (c) => (await c.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0].pid,
      ),
    );
    await banco.admin.query('BEGIN');
    await banco.admin.query('SELECT id FROM projetos WHERE id = $1 FOR UPDATE', [projeto.id]);
    const entregas = banco.bancos.map((db, indice) =>
      new ProjetosRepository(db).adicionarEntregaSequencial(projeto.id, {
        conteudo: `Entrega ${indice}`,
      }),
    );
    const resultados = Promise.all(entregas);
    // Rejeições são observadas imediatamente, mesmo se a sincronização falhar.
    void resultados.catch(() => undefined);
    try {
      await Promise.all(pids.map((pid) => banco.aguardarBloqueio(pid)));
    } finally {
      await banco.admin.query('COMMIT');
    }
    const salvas = await resultados;
    expect(salvas.map((e) => e.numeroEntrega).sort()).toEqual([1, 2]);
    expect(new Set(salvas.map((e) => e.id)).size).toBe(2);
    expect(await repo.contarEntregas(projeto.id)).toBe(2);
    await expect(
      banco.bancos[0]
        .insert(schema.projetoEntregas)
        .values({ projetoId: projeto.id, conteudo: 'Duplicada', numeroEntrega: 1 }),
    ).rejects.toThrow();
    expect(await repo.contarEntregas(projeto.id)).toBe(2);
  });

  it('falha de entrega não consome número e exclusão do projeto elimina entregas', async () => {
    const projeto = await criar('Rollback', new Date('2026-09-01'));
    await expect(
      repo.adicionarEntregaSequencial(projeto.id, {
        conteudo: 'Inválida',
        pontuacao: 'não numérica',
      }),
    ).rejects.toThrow();
    expect(await repo.contarEntregas(projeto.id)).toBe(0);
    expect(
      (await repo.adicionarEntregaSequencial(projeto.id, { conteudo: 'Válida' })).numeroEntrega,
    ).toBe(1);
    await banco.bancos[0].delete(schema.projetos).where(eq(schema.projetos.id, projeto.id));
    expect(await repo.contarEntregas(projeto.id)).toBe(0);
    await expect(
      repo.adicionarEntregaSequencial(projeto.id, { conteudo: 'Projeto removido' }),
    ).rejects.toThrow();
  });
});
