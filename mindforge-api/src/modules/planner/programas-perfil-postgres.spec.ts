import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { PlannerRepository } from './planner.repository';
import { PlannerService } from './planner.service';
import { programaConcursoLibras } from './trilhas-guiadas/concurso-libras';

comSql('Programas por perfil — seleção e atomicidade no PostgreSQL', () => {
  const banco = new PostgresIsolado();
  let repo: PlannerRepository;
  let service: PlannerService;
  beforeAll(async () => {
    await banco.iniciar();
    repo = new PlannerRepository(banco.bancos[0]);
    service = new PlannerService(
      repo,
      { executar: jest.fn() } as never,
      {
        criarCompetencia: jest.fn(async ({ nome }: { nome: string }) => ({ id: nome, nome })),
        vincularCompetenciasAoModulo: jest.fn(),
        criarRelacaoSeNaoExistir: jest.fn(),
      } as never,
    );
  });
  beforeEach(() => banco.limpar());
  afterAll(() => banco.encerrar());
  const dados = (perfilId: string) => ({
    perfilId,
    titulo: 'Meu concurso',
    programaCodigo: 'CONCURSO-LIBRAS-IBAM-2026',
    modulosIndices: [1, 5],
  });

  it('cada perfil recebe módulos e fontes próprios, mantendo os registros anteriores e sem aulas prontas', async () => {
    const db = banco.bancos[0];
    const a = await criarCiclo(db, 'A');
    const b = await criarCiclo(db, 'B');
    const criadoA = await service.criarObjetivo(dados(a.perfil.id));
    const criadoB = await service.criarObjetivo(dados(b.perfil.id));
    const trilhaA = (await repo.buscarObjetivoPorId(criadoA.id))!.trilhas[0];
    const trilhaB = (await repo.buscarObjetivoPorId(criadoB.id))!.trilhas[0];
    expect(trilhaA.modulos).toHaveLength(2);
    expect(trilhaA.metadata).toMatchObject({ modulosIndices: [1, 5] });
    expect(trilhaA.modulos.map((m) => m.id)).not.toEqual(trilhaB.modulos.map((m) => m.id));
    expect((await repo.listarObjetivosDoPerfil(a.perfil.id)).map((o) => o.id).sort()).toEqual(
      [a.objetivo.id, criadoA.id].sort(),
    );
    expect((await repo.buscarObjetivoPorId(a.objetivo.id))?.trilhas[0].id).toBe(a.trilha.id);
    const fontes = await db.select().from(schema.fontesPesquisa);
    const idsA = new Set(trilhaA.modulos.map((m) => m.id));
    const idsB = new Set(trilhaB.modulos.map((m) => m.id));
    expect(fontes.filter((f) => idsA.has(f.moduloId!)).length).toBeGreaterThan(0);
    expect(fontes.every((f) => idsA.has(f.moduloId!) || idsB.has(f.moduloId!))).toBe(true);
    expect(await db.select().from(schema.conteudos)).toHaveLength(0);
    expect(await db.select().from(schema.exercicios)).toHaveLength(0);
    expect(
      (await service.buscarModuloPorId(trilhaA.modulos.find((m) => m.ordem === 2)!.id)).escopoEstudo
        ?.programaCodigo,
    ).toBe('CONCURSO-LIBRAS-IBAM-2026');
  });

  it('falha na gravação das referências reverte também objetivo, trilha e módulos', async () => {
    const db = banco.bancos[0];
    const ciclo = await criarCiclo(db);
    const falha = jest
      .spyOn(repo, 'criarFontesPrograma')
      .mockRejectedValueOnce(new Error('Falha nas fontes'));
    await expect(service.criarObjetivo(dados(ciclo.perfil.id))).rejects.toThrow('Falha nas fontes');
    falha.mockRestore();
    expect(await db.select().from(schema.objetivosEstudo)).toHaveLength(1);
    expect(await db.select().from(schema.trilhasEstudo)).toHaveLength(1);
    expect(await db.select().from(schema.modulosTrilha)).toHaveLength(1);
    expect(await db.select().from(schema.fontesPesquisa)).toHaveLength(0);
  });

  it('cria o programa integral ou somente os módulos comuns com fontes e escopo próprios', async () => {
    const db = banco.bancos[0];
    const a = await criarCiclo(db, 'A');
    const b = await criarCiclo(db, 'B');
    const integral = await service.criarObjetivo({
      perfilId: a.perfil.id,
      titulo: 'Minha prova',
      programaCodigo: programaConcursoLibras.codigo,
    });
    const parcial = await service.criarObjetivo({
      perfilId: b.perfil.id,
      titulo: 'Meu núcleo comum',
      programaCodigo: programaConcursoLibras.codigo,
      modulosIndices: [12, 20, 27],
    });
    const trilhaIntegral = (await repo.buscarObjetivoPorId(integral.id))!.trilhas[0];
    const trilhaParcial = (await repo.buscarObjetivoPorId(parcial.id))!.trilhas[0];
    expect(trilhaIntegral.modulos).toHaveLength(27);
    expect(trilhaParcial.modulos).toHaveLength(3);
    expect(trilhaParcial.metadata).toMatchObject({ modulosIndices: [12, 20, 27] });
    for (const modulo of trilhaParcial.modulos) {
      const indice = [12, 20, 27][modulo.ordem - 1];
      const escopo = (await service.buscarModuloPorId(modulo.id)).escopoEstudo;
      expect(escopo?.topicosObrigatorios).toEqual(
        programaConcursoLibras.modulos[indice - 1].topicosObrigatorios,
      );
      const fontes = await db.query.fontesPesquisa.findMany({
        where: (campos, { eq }) => eq(campos.moduloId, modulo.id),
      });
      expect(fontes).toHaveLength(1);
      expect(fontes[0]).toMatchObject({
        url: programaConcursoLibras.fonteOficial,
        origem: 'busca_web',
        localizador: expect.stringContaining('página 1'),
        trechoConsultado: expect.any(String),
      });
    }
    expect((await repo.listarObjetivosDoPerfil(a.perfil.id)).some((o) => o.id === parcial.id)).toBe(
      false,
    );
    expect((await repo.buscarObjetivoPorId(a.objetivo.id))?.trilhas[0].id).toBe(a.trilha.id);
    expect(await db.select().from(schema.conteudos)).toHaveLength(0);
    expect(await db.select().from(schema.exercicios)).toHaveLength(0);
  });
});
