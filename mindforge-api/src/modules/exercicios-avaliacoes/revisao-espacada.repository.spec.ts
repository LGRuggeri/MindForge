import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../database/schema';
import { RevisaoEspacadaRepository } from './revisao-espacada.repository';

describe('Consultas reais da agenda de revisão', () => {
  const perfilId = '123e4567-e89b-12d3-a456-426614174000';
  let query: jest.Mock;
  let repo: RevisaoEspacadaRepository;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue({ rows: [] });
    repo = new RevisaoEspacadaRepository(drizzle({ query } as never, { schema }));
  });

  it('filtra referências órfãs e propriedade dos três tipos sem consultas por item', async () => {
    await repo.listar(perfilId, '2026-09-13');
    expect(query).toHaveBeenCalledTimes(1);
    const [{ text }, parametros] = query.mock.calls[0];
    expect(text).toContain('"revisao_espacada"."perfil_id" = $1');
    expect(text).toContain('exists (select "exercicios"."id"');
    expect(text).toContain('exists (select "conteudos"."id"');
    expect(text).toContain('exists (select "id" from "competencias"');
    expect(text).toContain('"objetivos_estudo"."perfil_id"');
    expect(text).toContain('"competencia_progresso"."perfil_id"');
    expect(text).toContain('"exercicios"."id" = "revisao_espacada"."item_id"');
    expect(parametros).toContain('2026-09-13');
    expect(parametros.filter((p: unknown) => p === perfilId)).toHaveLength(5);
  });

  it.each(['exercicio', 'conteudo', 'competencia'])(
    'detalhe de %s exige vínculo ao perfil',
    async (tipo) => {
      await expect(repo.buscarItem(tipo, 'item-1', perfilId)).resolves.toBeUndefined();
      const [{ text }, parametros] = query.mock.calls[0];
      expect(text).toContain('"perfil_id"');
      expect(parametros).toContain(perfilId);
      expect(parametros).toContain('item-1');
    },
  );

  it('localiza a agenda pelo id e pelo perfil juntos', async () => {
    await repo.buscarPorId('rev-1', perfilId);
    const [{ text }, parametros] = query.mock.calls[0];
    expect(text).toContain('"perfil_id" = $2');
    expect(parametros).toEqual(['rev-1', perfilId, 1]);
  });

  it('atualiza somente a versão esperada e preserva a transação recebida', async () => {
    const anterior = {
      id: 'rev-1',
      perfilId,
      itemTipo: 'exercicio',
      itemId: 'ex-1',
      intervaloDias: 6,
      fatorFacilidade: '2.50',
      repeticoes: 2,
      proximaRevisao: '2026-09-13',
      ultimaRevisao: null,
      criadoEm: new Date(),
    };
    const executarTx = jest.fn().mockResolvedValue({ rows: [] });
    const tx = drizzle({ query: executarTx } as never, { schema });
    await repo.atualizarSeAtual(anterior, { ...anterior, intervaloDias: 15 }, tx);
    expect(query).not.toHaveBeenCalled();
    const [{ text }, parametros] = executarTx.mock.calls[0];
    const condicao = text.split(' where ')[1];
    for (const coluna of [
      'id',
      'perfil_id',
      'proxima_revisao',
      'repeticoes',
      'intervalo_dias',
      'fator_facilidade',
    ]) {
      expect(condicao).toContain(`"revisao_espacada"."${coluna}" =`);
    }
    expect(condicao).toContain('"ultima_revisao" is null');
    expect(parametros).toContain(6);
    expect(parametros).toContain(15);
  });
});
