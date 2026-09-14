import { randomUUID } from 'node:crypto';
import { setTimeout as esperar } from 'node:timers/promises';
import { config } from 'dotenv';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { DrizzleDb } from '../src/database/database.module';
import * as schema from '../src/database/schema';

export const comSql = process.env.MINDFORGE_SQL_TESTS === '1' ? describe : describe.skip;
const tabelas = [
  'perfil_aprendizagem',
  'objetivos_estudo',
  'trilhas_estudo',
  'modulos_trilha',
  'fontes_pesquisa',
  'conteudos',
  'conteudo_fontes',
  'conteudo_chunks',
  'exercicios',
  'tentativas_exercicio',
  'avaliacoes',
  'avaliacao_exercicios',
  'resultados_avaliacao',
  'revisao_espacada',
  'diario_aprendizagem',
  'diario_modulos',
  'competencias',
  'competencia_relacoes',
  'competencia_progresso',
  'modulo_competencias',
  'projetos',
  'projeto_entregas',
  'historico_duvidas',
  'agentes_execucoes',
];
function identificador(nome: string) {
  if (!/^[a-z_][a-z0-9_]*$/.test(nome)) throw new Error('Identificador de teste inválido');
  return `"${nome}"`;
}

/** Schema descartável compartilhado por conexões reais, sem dados pessoais. */
export class PostgresIsolado {
  readonly nome = `mf_persistencia_test_${randomUUID().replaceAll('-', '')}`;
  private criado = false;
  private readonly clientes: Client[] = [];
  admin!: Client;
  conexoes!: [Client, Client];
  bancos!: [DrizzleDb, DrizzleDb];

  async iniciar() {
    config({ quiet: true });
    const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (
      !connectionString ||
      !['localhost', '127.0.0.1', '[::1]'].includes(new URL(connectionString).hostname)
    ) {
      throw new Error('Testes de persistência exigem PostgreSQL local');
    }
    const conectar = async () => {
      const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
      this.clientes.push(client);
      await client.connect();
      await client.query("SET statement_timeout = '10s'");
      return client;
    };
    try {
      this.admin = await conectar();
      await this.admin.query(`CREATE SCHEMA ${identificador(this.nome)}`);
      this.criado = true;
      // Sem public no search_path: tabela ausente nunca cai no banco pessoal.
      await this.admin.query(`SET search_path TO ${identificador(this.nome)}, pg_catalog`);
      for (const tabela of tabelas) {
        await this.admin.query(
          `CREATE TABLE ${identificador(this.nome)}.${identificador(tabela)} (LIKE public.${identificador(tabela)} INCLUDING ALL)`,
        );
      }
      // LIKE copia CHECK/UNIQUE, mas não FKs. Recriá-las preserva cascatas e rollback.
      const fks = await this.admin.query<{
        tabela: string;
        nome: string;
        definicao: string;
        destino: string;
        esquema: string;
      }>(
        `
        SELECT t.relname AS tabela, c.conname AS nome, pg_get_constraintdef(c.oid) AS definicao,
               alvo.relname AS destino, ns.nspname AS esquema
        FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace origem ON origem.oid = t.relnamespace
        JOIN pg_class alvo ON alvo.oid = c.confrelid JOIN pg_namespace ns ON ns.oid = alvo.relnamespace
        WHERE c.contype = 'f' AND origem.nspname = 'public' AND t.relname = ANY($1::text[])
      `,
        [tabelas],
      );
      for (const fk of fks.rows) {
        if (fk.esquema !== 'public' || !tabelas.includes(fk.destino))
          throw new Error('FK fora do conjunto isolado');
        const referencia = `REFERENCES public.${fk.destino}(`;
        if (!fk.definicao.includes(referencia)) throw new Error('Formato de FK não reconhecido');
        const definicao = fk.definicao.replace(
          referencia,
          `REFERENCES ${identificador(this.nome)}.${identificador(fk.destino)}(`,
        );
        await this.admin.query(
          `ALTER TABLE ${identificador(this.nome)}.${identificador(fk.tabela)} ADD CONSTRAINT ${identificador(fk.nome)} ${definicao}`,
        );
      }
      const externas = await this.admin.query(
        `
        SELECT 1 FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace JOIN pg_class alvo ON alvo.oid = c.confrelid
        WHERE c.contype = 'f' AND n.nspname = $1 AND alvo.relnamespace <> n.oid
      `,
        [this.nome],
      );
      if (externas.rowCount !== 0) throw new Error('FK externa detectada no schema de teste');
      this.conexoes = [await conectar(), await conectar()];
      for (const client of this.conexoes) {
        await client.query(`SET search_path TO ${identificador(this.nome)}, pg_catalog`);
        const resolucao = await client.query<{ isolado: boolean }>(
          'SELECT current_schema() = $1 AND to_regclass($2)::oid = to_regclass($3)::oid AS isolado',
          [this.nome, 'perfil_aprendizagem', `${this.nome}.perfil_aprendizagem`],
        );
        if (!resolucao.rows[0].isolado) throw new Error('Conexão fora do schema de teste');
      }
      this.bancos = [drizzle(this.conexoes[0], { schema }), drizzle(this.conexoes[1], { schema })];
    } catch (erro) {
      await this.encerrar();
      throw erro;
    }
  }

  async limpar() {
    if (!this.criado) throw new Error('Schema de teste não foi criado');
    await this.admin.query(
      `TRUNCATE ${tabelas.map((t) => `${identificador(this.nome)}.${identificador(t)}`).join(', ')}`,
    );
  }

  async aguardarBloqueio(pid: number) {
    const limite = Date.now() + 5000;
    while (Date.now() < limite) {
      const resultado = await this.admin.query<{ bloqueado: boolean }>(
        "SELECT wait_event_type = 'Lock' AND cardinality(pg_blocking_pids(pid)) > 0 AS bloqueado FROM pg_stat_activity WHERE pid = $1",
        [pid],
      );
      if (resultado.rows[0]?.bloqueado) return;
      await esperar(10);
    }
    throw new Error('A operação concorrente não disputou o lock esperado');
  }

  async encerrar() {
    try {
      await Promise.all(this.clientes.filter((c) => c !== this.admin).map((c) => c.end()));
      if (this.criado) {
        if (!/^mf_persistencia_test_[a-f0-9]{32}$/.test(this.nome))
          throw new Error('Schema de descarte inválido');
        await this.admin.query(`DROP SCHEMA ${identificador(this.nome)} CASCADE`);
        this.criado = false;
        const restante = await this.admin.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [
          this.nome,
        ]);
        if (restante.rowCount !== 0) throw new Error('Schema de teste não foi removido');
      }
    } finally {
      await this.admin?.end();
    }
  }
}

export async function criarCiclo(db: DrizzleDb, nome = 'Perfil isolado') {
  const [perfil] = await db.insert(schema.perfilAprendizagem).values({ nome }).returning();
  const [objetivo] = await db
    .insert(schema.objetivosEstudo)
    .values({ perfilId: perfil.id, titulo: `Objetivo ${nome}` })
    .returning();
  const [trilha] = await db
    .insert(schema.trilhasEstudo)
    .values({ objetivoId: objetivo.id })
    .returning();
  const [modulo] = await db
    .insert(schema.modulosTrilha)
    .values({ trilhaId: trilha.id, titulo: `Módulo ${nome}`, ordem: 1 })
    .returning();
  return { perfil, objetivo, trilha, modulo };
}
