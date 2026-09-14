import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { DrizzleDb } from '../../database/database.module';
import { BibliotecaVivaRepository } from './biblioteca-viva.repository';
import { BibliotecaVivaService } from './biblioteca-viva.service';
const executar = process.env.MINDFORGE_SQL_TESTS === '1' ? describe : describe.skip;
executar('Escopo RAG — PostgreSQL real', () => {
  let client: Client;
  let db: DrizzleDb;
  beforeEach(async () => {
    config({ quiet: true });
    const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (
      !connectionString ||
      !['localhost', '127.0.0.1', '[::1]'].includes(new URL(connectionString).hostname)
    ) {
      throw new Error('Os testes SQL exigem um banco local');
    }
    client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    await client.connect();
    await client.query("SET statement_timeout = '10s'");
    // Tabelas temporárias são exclusivas desta conexão. Permanecem durante
    // as transações reais do serviço e são descartadas ao fechar a conexão.
    const tabelas = ['conteudos', 'fontes_pesquisa', 'conteudo_chunks'];
    for (const tabela of tabelas) {
      await client.query(`CREATE TEMP TABLE "${tabela}" (LIKE public."${tabela}" INCLUDING ALL)`);
    }
    await client.query('SET search_path TO pg_temp, public');
    for (const tabela of tabelas) {
      const resultado = await client.query(
        'SELECT to_regclass($1)::oid = to_regclass($2)::oid AS temporaria',
        [tabela, `pg_temp.${tabela}`],
      );
      if (resultado.rows[0]?.temporaria !== true) throw new Error('Isolamento não confirmado');
    }
    db = drizzle(client, { schema });
  });
  afterEach(async () => {
    await client?.end();
  });
  it('restringe conteúdo e fontes ao módulo solicitado', async () => {
    // LIKE não copia FKs: módulos fictícios não tocam tabelas reais de perfis.
    const modulos = [randomUUID(), randomUUID()];
    const embedding = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
    for (const moduloId of modulos) {
      const [conteudo] = await db
        .insert(schema.conteudos)
        .values({ moduloId, titulo: 'Teste', corpoMarkdown: 'Teste' })
        .returning();
      const [fonte] = await db
        .insert(schema.fontesPesquisa)
        .values({ moduloId, titulo: 'Fonte', tipo: 'artigo' })
        .returning();
      await db.insert(schema.conteudoChunks).values([
        { conteudoId: conteudo.id, texto: `conteudo-${moduloId}`, embedding },
        { fonteId: fonte.id, texto: `fonte-${moduloId}`, embedding },
      ]);
    }
    const repo = new BibliotecaVivaRepository(db);
    expect(await repo.buscarSimilares(embedding, 10)).toHaveLength(4);
    for (const moduloId of modulos) {
      const resultado = await repo.buscarSimilares(embedding, 10, moduloId);
      expect(resultado.map((r) => r.texto).sort()).toEqual(
        [`conteudo-${moduloId}`, `fonte-${moduloId}`].sort(),
      );
    }
    expect(await repo.buscarSimilares(embedding, 10, randomUUID())).toEqual([]);
  });
  it('indexa conteúdo e fonte pelo serviço e busca por similaridade/limite', async () => {
    const moduloId = randomUUID();
    const [conteudo] = await db
      .insert(schema.conteudos)
      .values({ moduloId, titulo: 'Vetores', corpoMarkdown: 'Texto' })
      .returning();
    const [fonte] = await db
      .insert(schema.fontesPesquisa)
      .values({ moduloId, titulo: 'Fonte', tipo: 'artigo' })
      .returning();
    const vetor = (posicao: number, valor = 1) =>
      Array.from({ length: 768 }, (_, i) => (i === posicao ? valor : 0));
    const repo = new BibliotecaVivaRepository(db);
    const embeddings = {
      gerar: jest.fn(async (texto: string) => (texto === 'Fonte ortogonal' ? vetor(1) : vetor(0))),
    };
    const service = new BibliotecaVivaService(repo, embeddings as never, {} as never);
    await service.indexarTexto({ conteudoId: conteudo.id, texto: 'Conteúdo alinhado' });
    await service.indexarTexto({ fonteId: fonte.id, texto: 'Fonte ortogonal' });
    await repo.indexarChunk({
      conteudoId: conteudo.id,
      texto: 'Oposto',
      embedding: vetor(0, -1),
      ordem: 1,
    });
    const resultado = await service.buscar({ consulta: 'Consulta', moduloId });
    expect(resultado.map((r) => r.texto)).toEqual([
      'Conteúdo alinhado',
      'Fonte ortogonal',
      'Oposto',
    ]);
    expect(resultado.map((r) => r.similaridade)).toEqual([1, 0, -1]);
    expect(resultado[0].conteudoId).toBe(conteudo.id);
    expect(resultado[1].fonteId).toBe(fonte.id);
    expect(await service.buscar({ consulta: 'Consulta', limite: 1 })).toHaveLength(1);
    expect(await repo.indexarChunks([])).toEqual([]);
  });
  it('rejeita lote inválido sem inserir seus registros válidos', async () => {
    const repo = new BibliotecaVivaRepository(db);
    const vetor = Array.from({ length: 768 }, (_, i) => (i === 0 ? 1 : 0));
    await expect(
      repo.indexarChunks([
        { conteudoId: randomUUID(), texto: 'Válido', embedding: vetor },
        { texto: 'Sem origem', embedding: vetor },
      ]),
    ).rejects.toThrow();
    expect(await db.select().from(schema.conteudoChunks)).toEqual([]);
  });
  it('não persiste vetor com dimensão incompatível', async () => {
    const repo = new BibliotecaVivaRepository(db);
    await expect(
      repo.indexarChunk({ conteudoId: randomUUID(), texto: 'Vetor errado', embedding: [1, 0] }),
    ).rejects.toThrow();
    expect(await db.select().from(schema.conteudoChunks)).toEqual([]);
  });
});
