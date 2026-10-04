import { eq } from 'drizzle-orm';
import { PostgresIsolado, comSql, criarCiclo } from '../../../test/postgres-isolado.test';
import * as schema from '../../database/schema';
import { AtividadesConteudoRepository } from './atividades-conteudo.repository';
import { AtividadesConteudoService } from './atividades-conteudo.service';

comSql('Atividades da aula — persistência por conteúdo e perfil', () => {
  const banco = new PostgresIsolado();
  let repo: AtividadesConteudoRepository;
  let service: AtividadesConteudoService;
  beforeAll(async () => {
    await banco.iniciar();
    repo = new AtividadesConteudoRepository(banco.bancos[0]);
    service = new AtividadesConteudoService(repo);
  });
  beforeEach(() => banco.limpar());
  afterAll(() => banco.encerrar());

  it('salva, retoma e edita sem duplicar nem alterar outra resposta ou outro estudo', async () => {
    const db = banco.bancos[0];
    const a = await criarCiclo(db, 'A');
    const b = await criarCiclo(db, 'B');
    const texto = '## Atividades\n1. Compare.\n2. Explique.';
    const [ca, cb] = await db
      .insert(schema.conteudos)
      .values([
        { moduloId: a.modulo.id, titulo: 'Aula', corpoMarkdown: texto },
        { moduloId: b.modulo.id, titulo: 'Aula', corpoMarkdown: texto },
      ])
      .returning();
    const atividades = await service.listar(ca.id, a.perfil.id);
    const [primeira, segunda] = atividades;
    await service.responder(ca.id, primeira.chave, {
      perfilId: a.perfil.id,
      resposta: 'Minha resposta',
    });
    await service.responder(ca.id, segunda.chave, {
      perfilId: a.perfil.id,
      resposta: 'Outra resposta',
    });
    await service.responder(ca.id, primeira.chave, {
      perfilId: a.perfil.id,
      resposta: 'Resposta editada',
    });
    const reabertas = await new AtividadesConteudoService(
      new AtividadesConteudoRepository(banco.bancos[1]),
    ).listar(ca.id, a.perfil.id);
    expect(reabertas.map((r) => r.resposta?.texto)).toEqual(['Resposta editada', 'Outra resposta']);
    expect((await service.listar(cb.id, b.perfil.id)).every((r) => !r.resposta)).toBe(true);
    expect(await db.select().from(schema.respostasAtividades)).toHaveLength(2);
    await expect(service.listar(ca.id, b.perfil.id)).rejects.toThrow('não pertence');
    await expect(
      service.responder(ca.id, primeira.chave, { perfilId: b.perfil.id, resposta: 'Tentativa' }),
    ).rejects.toThrow('não pertence');
    await db.delete(schema.conteudos).where(eq(schema.conteudos.id, ca.id));
    expect(await db.select().from(schema.respostasAtividades)).toHaveLength(0);
    expect(await db.select().from(schema.conteudos)).toHaveLength(1);
  });
});
