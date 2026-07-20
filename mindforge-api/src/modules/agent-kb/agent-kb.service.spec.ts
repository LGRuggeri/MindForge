import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AgentKbService } from './agent-kb.service';

describe('AgentKbService', () => {
  let service: AgentKbService;

  const createService = (overrides: Record<string, string> = {}) => {
    const get = jest.fn((key: string) => {
      const base: Record<string, string> = {
        AGENT_KB_ENABLED: 'true',
        AGENT_KB_SCRIPT_PATH: 'C:/agent_kb.py',
        AGENT_KB_PROJECT_ID: 'mindforge',
      };
      return overrides[key] ?? base[key];
    });
    return new AgentKbService({ get } as unknown as ConfigService);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentKbService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                AGENT_KB_ENABLED: 'true',
                AGENT_KB_SCRIPT_PATH: '/opt/agent-kb/agent_kb.py',
                AGENT_KB_PROJECT_ID: 'mindforge',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AgentKbService);
  });

  it('deve estar habilitado com configuração válida', () => {
    expect(service.isAvailable()).toBe(true);
  });

  it('deve estar desabilitado quando AGENT_KB_ENABLED=false', () => {
    const disabled = createService({ AGENT_KB_ENABLED: 'false' });
    expect(disabled.isAvailable()).toBe(false);
  });

  it('deve estar desabilitado quando falta script path', () => {
    const incomplete = createService({ AGENT_KB_SCRIPT_PATH: '' });
    expect(incomplete.isAvailable()).toBe(false);
  });

  it('deve inicializar sem erro', () => {
    expect(() => service.onModuleInit()).not.toThrow();
  });

  it('deve logar desabilitado quando AGENT_KB_ENABLED=false', () => {
    const disabled = createService({ AGENT_KB_ENABLED: 'false' });
    const spy = jest.spyOn((disabled as unknown as { logger: { log: jest.Mock } }).logger, 'log');
    disabled.onModuleInit();
    expect(spy).toHaveBeenCalledWith('Agent KB desabilitado via AGENT_KB_ENABLED');
  });

  it('deve lançar erro quando não disponível', async () => {
    const disabled = createService({ AGENT_KB_ENABLED: 'false' });
    await expect(disabled.buildContextPack('x')).rejects.toThrow(
      'Agent KB não está habilitado ou não foi configurado',
    );
  });
});
