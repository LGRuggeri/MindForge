import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AgentKbModule } from './agent-kb.module';
import { AgentKbService } from './agent-kb.service';

describe('Agent KB — inicialização dos ADRs', () => {
  const agentKb = { isAvailable: jest.fn(), ensureProject: jest.fn(), addMemory: jest.fn() };
  beforeEach(() => {
    jest.resetAllMocks();
    agentKb.isAvailable.mockReturnValue(true);
    agentKb.ensureProject.mockResolvedValue({ id: 'projeto' });
    agentKb.addMemory.mockResolvedValue({ id: 'memoria' });
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  async function inicializar() {
    const modulo = await Test.createTestingModule({ imports: [AgentKbModule] })
      .overrideProvider(AgentKbService)
      .useValue(agentKb)
      .compile();
    try {
      await modulo.init();
    } finally {
      await modulo.close();
    }
  }

  it('não sincroniza quando a integração está indisponível', async () => {
    agentKb.isAvailable.mockReturnValue(false);
    await inicializar();
    expect(agentKb.ensureProject).not.toHaveBeenCalled();
    expect(agentKb.addMemory).not.toHaveBeenCalled();
  });

  it('resolve o projeto antes de registrar os 16 ADRs com suas referências', async () => {
    await inicializar();
    expect(agentKb.ensureProject).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'MindForge',
        techStack: expect.arrayContaining(['PostgreSQL']),
      }),
    );
    expect(agentKb.addMemory).toHaveBeenCalledTimes(16);
    expect(agentKb.ensureProject.mock.invocationCallOrder[0]).toBeLessThan(
      agentKb.addMemory.mock.invocationCallOrder[0],
    );
    const registros = agentKb.addMemory.mock.calls.map(
      ([registro]: [{ sourceRef: string }]) => registro,
    );
    expect(new Set(registros.map((registro) => registro.sourceRef)).size).toBe(16);
    expect(registros).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceRef: 'ADR-001',
          sourceType: 'docs/14-decisoes-arquiteturais.md',
          nodeType: 'ADR',
          importance: 'high',
          content: expect.any(String),
        }),
      ]),
    );
  });

  it.each(['projeto', 'memoria'])(
    'falha em %s não aborta o startup nem vaza conteúdo nos logs',
    async (etapa) => {
      if (etapa === 'projeto')
        agentKb.ensureProject.mockRejectedValue(new Error('CONTEUDO_PRIVADO'));
      else
        agentKb.addMemory
          .mockResolvedValueOnce({ id: 'primeira' })
          .mockRejectedValueOnce(new Error('CONTEUDO_PRIVADO'));
      await expect(inicializar()).resolves.toBeUndefined();
      expect(agentKb.addMemory).toHaveBeenCalledTimes(etapa === 'projeto' ? 0 : 2);
      expect(Logger.prototype.error).toHaveBeenCalled();
      expect(JSON.stringify(jest.mocked(Logger.prototype.error).mock.calls)).not.toContain(
        'CONTEUDO_PRIVADO',
      );
    },
  );
});
