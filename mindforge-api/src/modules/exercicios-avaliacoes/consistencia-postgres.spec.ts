import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { DrizzleDb } from '../../database/database.module';
import { ExerciciosAvaliacoesRepository } from './exercicios-avaliacoes.repository';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';
import { AvaliacoesService } from './avaliacoes.service';
import { TipoAvaliacao } from './dto';
const executar = process.env.MINDFORGE_SQL_TESTS === '1' ? describe : describe.skip;
executar('Consistência de avaliações — PostgreSQL real', () => {
  let client: Client;
  let db: DrizzleDb;
  let repo: ExerciciosAvaliacoesRepository;
  let service: AvaliacoesService;
  let tentativas: ExerciciosAvaliacoesService;
  let perfilId: string;
  let moduloId: string;
  let exercicioId: string;
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
    const tabelas = [
      'perfil_aprendizagem',
      'objetivos_estudo',
      'trilhas_estudo',
      'modulos_trilha',
      'exercicios',
      'avaliacoes',
      'avaliacao_exercicios',
      'tentativas_exercicio',
      'resultados_avaliacao',
    ];
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
    repo = new ExerciciosAvaliacoesRepository(db);
    service = new AvaliacoesService(
      repo,
      { processarRevisao: jest.fn() } as never,
      { marcarProgressoPorModulo: jest.fn() } as never,
      db,
    );
    tentativas = new ExerciciosAvaliacoesService(
      repo,
      {} as never,
      {} as never,
      {} as never,
      { buscarModuloPorId: (id: string) => repo.buscarModuloDaAvaliacao(id) } as never,
      {} as never,
    );
    perfilId = randomUUID();
    await db.insert(schema.perfilAprendizagem).values({ id: perfilId, nome: 'Teste isolado' });
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
      .values({ trilhaId: trilha.id, titulo: 'Teste', ordem: 1 })
      .returning();
    moduloId = modulo.id;
    const [exercicio] = await db
      .insert(schema.exercicios)
      .values({ moduloId, tipo: 'questao_objetiva', enunciado: 'Capital?', gabarito: 'Paris' })
      .returning();
    exercicioId = exercicio.id;
  });
  afterEach(async () => {
    await client?.end();
  });
  async function criar() {
    const avaliacao = await service.criar({
      moduloId,
      titulo: 'Teste',
      tipo: TipoAvaliacao.SIMULADO,
    });
    return avaliacao!;
  }
  it('cria, registra resposta sem nota no retorno e finaliza uma única vez', async () => {
    const avaliacao = await criar();
    const tentativa = await tentativas.submeterTentativa({
      perfilId,
      exercicioId,
      avaliacaoId: avaliacao.id,
      respostaUsuario: 'Paris',
    });
    expect(tentativa).toMatchObject({ correta: null, pontuacao: null, feedbackIa: null });
    const [persistida] = await db.select().from(schema.tentativasExercicio);
    expect(persistida.pontuacao).toBe('10.00');
    const dto = {
      perfilId,
      avaliacaoId: avaliacao.id,
      respostas: [{ exercicioId, tentativaId: persistida.id }],
    };
    expect((await service.submeter(dto)).pontuacaoTotal).toBe('10.00');
    expect((await service.submeter(dto)).pontuacaoTotal).toBe('10.00');
    expect(await db.select().from(schema.resultadosAvaliacao)).toHaveLength(1);
  });
  it('rejeita tentativa de outro perfil sem gravar', async () => {
    await expect(
      tentativas.submeterTentativa({
        perfilId: randomUUID(),
        exercicioId,
        respostaUsuario: 'Paris',
      }),
    ).rejects.toThrow('não pertence');
    expect(await db.select().from(schema.tentativasExercicio)).toEqual([]);
  });
  it('impede gravação de tentativa após resultado inclusive no repositório', async () => {
    const avaliacao = await criar();
    await repo.salvarResultadoAvaliacao({
      perfilId,
      avaliacaoId: avaliacao.id,
      pontuacaoTotal: '0',
    });
    await expect(
      repo.salvarTentativa({
        perfilId,
        exercicioId,
        avaliacaoId: avaliacao.id,
        respostaUsuario: 'Paris',
      }),
    ).rejects.toThrow('finalizada');
    expect(await db.select().from(schema.tentativasExercicio)).toEqual([]);
  });
  it('rejeita exercício estrangeiro na criação sem persistir avaliação', async () => {
    await expect(
      service.criar({
        moduloId,
        titulo: 'Teste',
        tipo: TipoAvaliacao.FORMATIVA,
        exerciciosIds: [randomUUID()],
      }),
    ).rejects.toThrow('não pertence');
    expect(await db.select().from(schema.avaliacoes)).toEqual([]);
  });
});
