/* global process, __dirname */
const { Client } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { resolve } = require('node:path');
const { readFileSync } = require('node:fs');
const { validarBancoCi } = require('./validar-ci.cjs');

async function prepararBancoCi(url) {
  const client = new Client({
    connectionString: validarBancoCi(url),
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const versao = await client.query('SHOW server_version_num');
    if (Math.floor(Number(versao.rows[0].server_version_num) / 10000) !== 17) {
      throw new Error('O CI exige PostgreSQL 17.');
    }
    await client.query("SET statement_timeout = '30s'");
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');
    const migrationsFolder = resolve(__dirname, '../src/database/migrations');
    const db = drizzle(client);
    await migrate(db, { migrationsFolder });
    // A segunda aplicação deve ser um no-op: o journal impede reaplicações.
    await migrate(db, { migrationsFolder });
    const journal = JSON.parse(
      readFileSync(resolve(migrationsFolder, 'meta/_journal.json'), 'utf8'),
    );
    const aplicadas = await client.query(
      'SELECT count(*)::int AS total FROM drizzle.__drizzle_migrations',
    );
    if (aplicadas.rows[0].total !== journal.entries.length)
      throw new Error('Migrations incompletas.');
    const coluna = await client.query(
      "SELECT format_type(atttypid, atttypmod) AS tipo FROM pg_attribute WHERE attrelid = 'public.conteudo_chunks'::regclass AND attname = 'embedding'",
    );
    if (coluna.rows[0]?.tipo !== 'vector(768)')
      throw new Error('Dimensão do embedding incompatível.');
    return journal.entries.length;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  prepararBancoCi(process.env.TEST_DATABASE_URL)
    .then((quantidade) => {
      process.stdout.write(
        `Banco de CI preparado: ${quantidade} migrations, PostgreSQL 17 e vector(768).\n`,
      );
    })
    .catch(() => {
      process.stderr.write(
        'Falha ao preparar banco de CI. Confira o banco local, pgvector e as migrations.\n',
      );
      process.exitCode = 1;
    });
}
module.exports = { prepararBancoCi };
