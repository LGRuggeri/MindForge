import { randomUUID } from 'node:crypto';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { SynthesizerRepository } from './synthesizer.repository';

comSql('Synthesizer — conteúdo e vínculos SQL', () => {
  const banco = new PostgresIsolado();
  beforeAll(async () => {
    await banco.iniciar();
  });
  beforeEach(async () => {
    await banco.limpar();
  });
  afterAll(async () => {
    await banco.encerrar();
  });

  it('persiste versões por módulo e vincula fontes sem duplicação', async () => {
    const db = banco.bancos[0];
    const repo = new SynthesizerRepository(db);
    const a = await criarCiclo(db, 'A');
    const b = await criarCiclo(db, 'B');
    const fontes = await db
      .insert(schema.fontesPesquisa)
      .values([
        { moduloId: a.modulo.id, titulo: 'A', tipo: 'livro' },
        { moduloId: b.modulo.id, titulo: 'B', tipo: 'livro' },
      ])
      .returning();
    expect((await repo.listarFontesPorModulo(a.modulo.id)).map((f) => f.id)).toEqual([
      fontes[0].id,
    ]);
    expect(await repo.buscarModuloPorId(a.modulo.id)).toMatchObject({
      trilha: { objetivo: { perfilId: a.perfil.id } },
    });
    const antigo = await repo.criarConteudo({
      moduloId: a.modulo.id,
      titulo: 'Antigo',
      corpoMarkdown: 'V1',
      criadoEm: new Date('2026-09-01'),
    });
    const atual = await repo.criarConteudo({
      moduloId: a.modulo.id,
      titulo: 'Atual',
      corpoMarkdown: 'V2',
      versao: 2,
      criadoEm: new Date('2026-09-02'),
    });
    await repo.criarConteudo({ moduloId: b.modulo.id, titulo: 'Outro', corpoMarkdown: 'Outro' });
    expect((await repo.listarConteudosPorModulo(a.modulo.id)).map((c) => c.id)).toEqual([
      atual.id,
      antigo.id,
    ]);
    expect(await repo.vincularFontes(atual.id, [])).toEqual([]);
    expect(await repo.vincularFontes(atual.id, [fontes[0].id, fontes[0].id])).toHaveLength(1);
    expect(await repo.vincularFontes(atual.id, [fontes[0].id])).toEqual([]);
    await expect(repo.vincularFontes(antigo.id, [fontes[0].id, randomUUID()])).rejects.toThrow();
    expect(await db.select().from(schema.conteudoFontes)).toEqual([
      { conteudoId: atual.id, fonteId: fontes[0].id },
    ]);
  });
});
