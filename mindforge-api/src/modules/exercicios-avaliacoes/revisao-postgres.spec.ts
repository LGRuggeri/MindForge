import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../database/schema';
import { DrizzleDb } from '../../database/database.module';
import { RevisaoEspacadaRepository } from './revisao-espacada.repository';
import { RevisaoEspacadaService } from './revisao-espacada.service';

// Execução explícita: MINDFORGE_SQL_TESTS=1. Somente PostgreSQL local.
// Todas as gravações usam tabelas temporárias copiadas do schema instalado,
// dentro de BEGIN/ROLLBACK. Nenhum registro de estudo é lido ou alterado.
const executar = process.env.MINDFORGE_SQL_TESTS === '1' ? describe : describe.skip;

executar('Revisão — PostgreSQL real em tabelas temporárias', () => {
  let client: Client;
  let db: DrizzleDb;
  let repo: RevisaoEspacadaRepository;
  let service: RevisaoEspacadaService;
  let perfilId: string;
  let outroPerfilId: string;
  let exercicioId: string;
  let conteudoId: string;
  let competenciaId: string;

  beforeAll(async () => {
    config({ quiet: true });
    const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
    if (
      !connectionString ||
      !['localhost', '127.0.0.1', '[::1]'].includes(new URL(connectionString).hostname)
    ) {
      throw new Error('Os testes SQL exigem TEST_DATABASE_URL ou DATABASE_URL de um banco local');
    }
    client = new Client({ connectionString, connectionTimeoutMillis: 5000 });
    await client.connect();
    db = drizzle(client, { schema });
    repo = new RevisaoEspacadaRepository(db);
    service = new RevisaoEspacadaService(repo);
  });

  beforeEach(async () => {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '10s'");
    const tabelas = [
      'perfil_aprendizagem',
      'objetivos_estudo',
      'trilhas_estudo',
      'modulos_trilha',
      'exercicios',
      'conteudos',
      'competencias',
      'competencia_progresso',
      'modulo_competencias',
      'revisao_espacada',
    ];
    for (const tabela of tabelas) {
      // Identificadores de uma lista fixa, sem dados do usuário.
      await client.query(
        `CREATE TEMP TABLE "${tabela}" (LIKE public."${tabela}" INCLUDING ALL) ON COMMIT DROP`,
      );
    }
    await client.query('SET LOCAL search_path TO pg_temp, public');
    for (const tabela of tabelas) {
      const resultado = await client.query(
        'SELECT to_regclass($1)::oid = to_regclass($2)::oid AS temporaria',
        [tabela, `pg_temp.${tabela}`],
      );
      if (resultado.rows[0]?.temporaria !== true)
        throw new Error('Isolamento das tabelas temporárias não confirmado');
    }
    perfilId = randomUUID();
    outroPerfilId = randomUUID();
    await db.insert(schema.perfilAprendizagem).values([
      { id: perfilId, nome: 'Teste SQL' },
      { id: outroPerfilId, nome: 'Outro teste SQL' },
    ]);
    const [objetivo] = await db
      .insert(schema.objetivosEstudo)
      .values({ perfilId, titulo: 'Teste' })
      .returning();
    const [trilha] = await db
      .insert(schema.trilhasEstudo)
      .values({ objetivoId: objetivo.id })
      .returning();
    const [modulo] = await db
      .insert(schema.modulosTrilha)
      .values({ trilhaId: trilha.id, ordem: 1, titulo: 'Somas' })
      .returning();
    const [exercicio] = await db
      .insert(schema.exercicios)
      .values({
        moduloId: modulo.id,
        tipo: 'questao_objetiva',
        enunciado: 'Quanto é 2 + 2?',
        gabarito: '4',
      })
      .returning();
    const [conteudo] = await db
      .insert(schema.conteudos)
      .values({ moduloId: modulo.id, titulo: 'Adição', corpoMarkdown: 'Somar quantidades.' })
      .returning();
    const [competencia] = await db
      .insert(schema.competencias)
      .values({ nome: 'Somar', descricao: 'Adição de números' })
      .returning();
    await db
      .insert(schema.moduloCompetencias)
      .values({ moduloId: modulo.id, competenciaId: competencia.id });
    exercicioId = exercicio.id;
    conteudoId = conteudo.id;
    competenciaId = competencia.id;
  });
  afterEach(async () => {
    await client?.query('ROLLBACK');
  });
  afterAll(async () => {
    await client?.end();
  });

  async function agendar(itemTipo = 'exercicio', itemId = exercicioId, donoId = perfilId) {
    return repo.criar({
      perfilId: donoId,
      itemTipo,
      itemId,
      proximaRevisao: '2020-01-01',
      repeticoes: 1,
      intervaloDias: 1,
      fatorFacilidade: '2.50',
    });
  }

  it('lista os três tipos e oculta referências órfãs ou de outro perfil', async () => {
    const validas = [
      await agendar(),
      await agendar('conteudo', conteudoId),
      await agendar('competencia', competenciaId),
    ];
    await agendar('exercicio', randomUUID());
    await agendar('exercicio', exercicioId, outroPerfilId);
    expect((await repo.listar(perfilId)).map((r) => r.id).sort()).toEqual(
      validas.map((r) => r.id).sort(),
    );
    expect(await repo.listar(outroPerfilId)).toEqual([]);
    expect(await repo.listar(perfilId, '2099-01-01')).toEqual([]);
    await db.delete(schema.exercicios).where(eq(schema.exercicios.id, exercicioId));
    expect((await repo.listar(perfilId)).map((r) => r.itemTipo).sort()).toEqual([
      'competencia',
      'conteudo',
    ]);
  });

  it('recupera o material certo e impede consulta cruzada entre perfis', async () => {
    expect(await repo.buscarItem('exercicio', exercicioId, perfilId)).toMatchObject({
      titulo: 'Somas',
      texto: 'Quanto é 2 + 2?',
      resposta: '4',
    });
    expect(await repo.buscarItem('conteudo', conteudoId, perfilId)).toMatchObject({
      titulo: 'Adição',
      texto: 'Somar quantidades.',
      resposta: null,
    });
    expect(await repo.buscarItem('competencia', competenciaId, perfilId)).toMatchObject({
      titulo: 'Somar',
      texto: 'Adição de números',
      moduloId: null,
    });
    expect(await repo.buscarItem('exercicio', exercicioId, outroPerfilId)).toBeUndefined();
    expect(await repo.buscarItem('conteudo', conteudoId, outroPerfilId)).toBeUndefined();
    expect(await repo.buscarItem('competencia', competenciaId, outroPerfilId)).toBeUndefined();
  });

  it('persiste o SM-2 e recusa reenvio sem avançar duas vezes', async () => {
    const anterior = await agendar();
    const dto = { perfilId, qualidade: 4, proximaRevisaoEsperada: anterior.proximaRevisao };
    const atualizado = await service.concluir(anterior.id, dto);
    expect(atualizado).toMatchObject({ intervaloDias: 6, repeticoes: 2, fatorFacilidade: '2.50' });
    await expect(service.concluir(anterior.id, dto)).rejects.toThrow('já foi reagendada');
    expect(await repo.buscarPorId(anterior.id, perfilId)).toMatchObject({
      repeticoes: 2,
      intervaloDias: 6,
    });
  });

  it('somente uma atualização de duas leituras da mesma versão é aceita pelo SQL', async () => {
    const anterior = await agendar();
    const primeiraLeitura = await repo.buscarPorId(anterior.id, perfilId);
    const segundaLeitura = await repo.buscarPorId(anterior.id, perfilId);
    const dados = { ...anterior, repeticoes: 2, intervaloDias: 6, proximaRevisao: '2099-01-01' };
    expect(await repo.atualizarSeAtual(primeiraLeitura!, dados)).toBeDefined();
    expect(await repo.atualizarSeAtual(segundaLeitura!, dados)).toBeUndefined();
  });

  it('mantém atualizações do fluxo de avaliações na transação recebida', async () => {
    const anterior = await agendar();
    await client.query('SAVEPOINT avaliacao_teste');
    await service.processarRevisao(
      { perfilId, itemTipo: 'exercicio', itemId: exercicioId, qualidade: 0 },
      db,
    );
    expect(await repo.buscarPorId(anterior.id, perfilId)).toMatchObject({
      repeticoes: 0,
      intervaloDias: 1,
      fatorFacilidade: '1.70',
    });
    await client.query('ROLLBACK TO SAVEPOINT avaliacao_teste');
    expect(await repo.buscarPorId(anterior.id, perfilId)).toMatchObject({
      repeticoes: 1,
      fatorFacilidade: '2.50',
    });
  });
});
