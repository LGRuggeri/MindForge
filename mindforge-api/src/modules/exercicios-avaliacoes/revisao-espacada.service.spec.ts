import { Test, TestingModule } from '@nestjs/testing';
import { DRIZZLE } from '../../database/database.module';
import { RevisaoEspacadaService } from './revisao-espacada.service';

function createMockDb() {
  const returningInsert = jest.fn();
  const returningUpdate = jest.fn();

  const db = {
    query: {
      revisaoEspacada: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    },
    insert: jest.fn().mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: returningInsert,
      }),
    }),
    update: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: returningUpdate,
        }),
      }),
    }),
  };

  return { db, returningInsert, returningUpdate };
}

describe('RevisaoEspacadaService', () => {
  let service: RevisaoEspacadaService;
  let db: ReturnType<typeof createMockDb>['db'];
  let returningInsert: jest.Mock;
  let returningUpdate: jest.Mock;

  beforeEach(async () => {
    const mocks = createMockDb();
    db = mocks.db;
    returningInsert = mocks.returningInsert;
    returningUpdate = mocks.returningUpdate;

    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: DRIZZLE, useValue: db }, RevisaoEspacadaService],
    }).compile();

    service = module.get(RevisaoEspacadaService);
  });

  it('deve criar revisao na primeira vez com intervalo 1 dia', async () => {
    db.query.revisaoEspacada.findFirst.mockResolvedValue(undefined);
    returningInsert.mockResolvedValue([{ id: 'rev-1' }]);

    const resultado = await service.processarRevisao({
      perfilId: 'perfil-1',
      itemTipo: 'exercicio',
      itemId: 'ex-1',
      qualidade: 4,
    });

    expect(resultado.id).toBe('rev-1');
    expect(db.insert).toHaveBeenCalled();
  });

  it('deve resetar intervalo quando qualidade for baixa', async () => {
    db.query.revisaoEspacada.findFirst.mockResolvedValue({
      id: 'rev-1',
      intervaloDias: 10,
      repeticoes: 3,
      fatorFacilidade: '2.5',
    });
    returningUpdate.mockResolvedValue([{ id: 'rev-1', intervaloDias: 1, repeticoes: 0 }]);

    const resultado = await service.processarRevisao({
      perfilId: 'perfil-1',
      itemTipo: 'exercicio',
      itemId: 'ex-1',
      qualidade: 2,
    });

    expect(resultado.intervaloDias).toBe(1);
    expect(resultado.repeticoes).toBe(0);
  });

  it('deve calcular proxima revisao para qualidade alta', async () => {
    db.query.revisaoEspacada.findFirst.mockResolvedValue({
      id: 'rev-1',
      intervaloDias: 6,
      repeticoes: 2,
      fatorFacilidade: '2.5',
    });
    returningUpdate.mockResolvedValue([{ id: 'rev-1', intervaloDias: 15, repeticoes: 3 }]);

    const resultado = await service.processarRevisao({
      perfilId: 'perfil-1',
      itemTipo: 'exercicio',
      itemId: 'ex-1',
      qualidade: 5,
    });

    expect(resultado.repeticoes).toBe(3);
  });
});
