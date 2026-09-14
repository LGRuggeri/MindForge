import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { ValidationPipe } from '@nestjs/common';
import * as schema from '../../database/schema';
import { DrizzleDb } from '../../database/database.module';
import { PlannerRepository } from './planner.repository';
import { PlannerService } from './planner.service';
import { ConcluirModuloDto } from './dto/concluir-modulo.dto';

const executar = process.env.MINDFORGE_SQL_TESTS === '1' ? describe : describe.skip;

executar('Conclusão de módulo — PostgreSQL real', () => {
  let client: Client;
  let db: DrizzleDb;
  let repo: PlannerRepository;
  let service: PlannerService;
  let perfilId: string;
  let moduloId: string;
  let competenciasIds: string[];

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
      'competencias',
      'competencia_progresso',
      'modulo_competencias',
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
    repo = new PlannerRepository(db);
    service = new PlannerService(repo, {} as never, {} as never);
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
      .values({ trilhaId: trilha.id, ordem: 1, titulo: 'Estudo' })
      .returning();
    moduloId = modulo.id;
    const competencias = await db
      .insert(schema.competencias)
      .values([
        { nome: 'Nova' },
        { nome: 'Não iniciada' },
        { nome: 'Praticada' },
        { nome: 'Dominada' },
      ])
      .returning();
    competenciasIds = competencias.map((c) => c.id);
    await db
      .insert(schema.moduloCompetencias)
      .values(competenciasIds.map((competenciaId) => ({ moduloId, competenciaId })));
    await db.insert(schema.competenciaProgresso).values([
      { competenciaId: competenciasIds[1], perfilId, nivelAtual: 'nao_iniciado' },
      {
        competenciaId: competenciasIds[2],
        perfilId,
        nivelAtual: 'praticando',
        evidencia: 'Exercício aprovado',
      },
      {
        competenciaId: competenciasIds[3],
        perfilId,
        nivelAtual: 'dominado',
        evidencia: 'Avaliação aprovada',
      },
    ]);
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await client?.end();
  });

  it('persiste a conclusão e preserva níveis superiores e suas evidências', async () => {
    const antes = await db.select().from(schema.competenciaProgresso);
    expect(await service.concluirModulo(moduloId, perfilId)).toMatchObject({ status: 'concluido' });
    expect(await repo.buscarModuloPorId(moduloId)).toMatchObject({ status: 'concluido' });
    const depois = await db.select().from(schema.competenciaProgresso);
    expect(depois.find((p) => p.competenciaId === competenciasIds[0])?.nivelAtual).toBe(
      'aprendendo',
    );
    expect(depois.find((p) => p.competenciaId === competenciasIds[1])?.nivelAtual).toBe(
      'aprendendo',
    );
    for (const competenciaId of competenciasIds.slice(2)) {
      expect(depois.find((p) => p.competenciaId === competenciaId)).toEqual(
        antes.find((p) => p.competenciaId === competenciaId),
      );
    }
    await service.concluirModulo(moduloId, perfilId);
    expect(await db.select().from(schema.competenciaProgresso)).toEqual(depois);
  });

  it('reverte o status se a gravação das competências falhar', async () => {
    jest.spyOn(repo, 'registrarEstudoCompetencias').mockRejectedValue(new Error('falha simulada'));
    await expect(service.concluirModulo(moduloId, perfilId)).rejects.toThrow('falha simulada');
    expect(await repo.buscarModuloPorId(moduloId)).toMatchObject({ status: 'nao_iniciado' });
  });

  it('recusa outro perfil e mantém os dados intactos', async () => {
    const antes = await db.select().from(schema.competenciaProgresso);
    await expect(service.concluirModulo(moduloId, randomUUID())).rejects.toThrow('não pertence');
    expect(await repo.buscarModuloPorId(moduloId)).toMatchObject({ status: 'nao_iniciado' });
    expect(await db.select().from(schema.competenciaProgresso)).toEqual(antes);
  });

  it('conclui módulo sem competências vinculadas', async () => {
    await db
      .delete(schema.moduloCompetencias)
      .where(eq(schema.moduloCompetencias.moduloId, moduloId));
    expect(await service.concluirModulo(moduloId, perfilId)).toMatchObject({ status: 'concluido' });
  });
});

describe('Contrato de conclusão de módulo', () => {
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  it.each([{}, { perfilId: 'invalido' }, { perfilId: randomUUID(), nivel: 'dominado' }])(
    'rejeita entrada inválida %j',
    async (body) => {
      await expect(
        pipe.transform(body, { type: 'body', metatype: ConcluirModuloDto }),
      ).rejects.toThrow();
    },
  );
});
