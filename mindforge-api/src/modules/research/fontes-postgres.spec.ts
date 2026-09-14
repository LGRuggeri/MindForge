import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { ResearchRepository } from './research.repository';
import { interpretarFontes } from './fontes-pesquisa';
const executar = process.env.MINDFORGE_SQL_TESTS === '1' ? describe : describe.skip;
executar('Fontes — migration e persistência PostgreSQL', () => {
  let client: Client;
  beforeEach(async () => {
    config({ quiet: true });
    const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (
      !connectionString ||
      !['localhost', '127.0.0.1', '[::1]'].includes(new URL(connectionString).hostname)
    )
      throw new Error('Os testes SQL exigem banco local');
    client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    await client.connect();
    await client.query("SET statement_timeout = '10s'");
    await client.query(
      'CREATE TEMP TABLE fontes_pesquisa (LIKE public.fontes_pesquisa INCLUDING ALL)',
    );
    await client.query('SET search_path TO pg_temp, public');
    const isolamento = await client.query(
      "SELECT to_regclass('fontes_pesquisa')::oid = to_regclass('pg_temp.fontes_pesquisa')::oid AS ok",
    );
    if (isolamento.rows[0]?.ok !== true) throw new Error('Isolamento não confirmado');
    // Reproduz o schema anterior mesmo após a migration ser aplicada no ambiente local.
    await client.query('ALTER TABLE pg_temp.fontes_pesquisa DROP COLUMN IF EXISTS origem');
    await client.query(
      "INSERT INTO pg_temp.fontes_pesquisa (titulo, tipo, url) VALUES ('Legado', 'artigo', 'https://example.org/antigo')",
    );
    const migration = readFileSync(
      join(__dirname, '../../database/migrations/0013_fontes_origem.sql'),
      'utf8',
    );
    await client.query(migration);
  });
  afterEach(async () => {
    await client?.end();
  });
  it('preserva registro antigo com origem legado e restringe valores da coluna', async () => {
    const resultado = await client.query('SELECT titulo, url, origem FROM pg_temp.fontes_pesquisa');
    expect(resultado.rows).toEqual([
      { titulo: 'Legado', url: 'https://example.org/antigo', origem: 'legado' },
    ]);
    await expect(
      client.query(
        "INSERT INTO pg_temp.fontes_pesquisa (titulo, tipo, origem) VALUES ('Teste', 'artigo', 'inventada')",
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
  it('persiste e lista origens distintas sem guardar o link inventado', async () => {
    const repo = new ResearchRepository(drizzle(client, { schema }));
    const moduloId = randomUUID();
    const fonte = {
      titulo: 'Guia',
      tipo: 'artigo',
      resumo: 'Resumo',
      confiabilidadeScore: 1,
      url: 'https://example.org/guia',
    };
    const resultado = interpretarFontes(
      JSON.stringify({
        fontes: [fonte, { ...fonte, titulo: 'Sugestão', url: 'https://inventada.org' }],
      }),
      [{ titulo: 'Guia', resumo: '', fonte: 'example.org', url: fonte.url }],
      5,
    );
    await repo.criarFontes(
      resultado.fontes.map((f) => ({
        ...f,
        moduloId,
        confiabilidadeScore: f.confiabilidadeScore == null ? null : String(f.confiabilidadeScore),
      })),
    );
    expect(await repo.listarPorModulo(moduloId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origem: 'busca_web', url: fonte.url }),
        expect.objectContaining({ origem: 'sugestao_ia', url: null }),
      ]),
    );
    expect(await repo.criarFontes([])).toEqual([]);
  });

  it('carrega contexto da trilha correta e isola fontes por módulo', async () => {
    // Nomes fixos do schema: as únicas escritas deste cenário são temporárias.
    for (const tabela of ['objetivos_estudo', 'trilhas_estudo', 'modulos_trilha']) {
      await client.query(`CREATE TEMP TABLE "${tabela}" (LIKE public."${tabela}" INCLUDING ALL)`);
      const isolamento = await client.query(
        'SELECT to_regclass($1)::oid = to_regclass($2)::oid AS ok',
        [tabela, `pg_temp.${tabela}`],
      );
      if (isolamento.rows[0]?.ok !== true) throw new Error('Isolamento não confirmado');
    }
    const db = drizzle(client, { schema });
    const repo = new ResearchRepository(db);
    const [objetivo] = await db
      .insert(schema.objetivosEstudo)
      .values({
        perfilId: randomUUID(),
        titulo: 'Objetivo isolado',
        descricao: 'Contexto',
        nivelDesejado: 'avancado',
      })
      .returning();
    const [trilha] = await db
      .insert(schema.trilhasEstudo)
      .values({ objetivoId: objetivo.id })
      .returning();
    const [modulo, outro] = await db
      .insert(schema.modulosTrilha)
      .values([
        { trilhaId: trilha.id, ordem: 1, titulo: 'Módulo', objetivoAprendizagem: 'Estudar' },
        { trilhaId: trilha.id, ordem: 2, titulo: 'Outro módulo' },
      ])
      .returning();
    expect(await repo.buscarModuloPorId(modulo.id)).toMatchObject({
      id: modulo.id,
      objetivoAprendizagem: 'Estudar',
      trilha: {
        id: trilha.id,
        objetivo: { id: objetivo.id, titulo: 'Objetivo isolado', nivelDesejado: 'avancado' },
      },
    });
    expect(await repo.buscarModuloPorId(randomUUID())).toBeUndefined();
    const fontes = await repo.criarFontes([
      { moduloId: modulo.id, tipo: 'artigo', titulo: 'Do módulo' },
      { moduloId: outro.id, tipo: 'artigo', titulo: 'De outro módulo' },
    ]);
    expect(await repo.listarPorModulo(modulo.id)).toEqual([fontes[0]]);
    expect(await repo.listarPorModulo(randomUUID())).toEqual([]);
  });
});
