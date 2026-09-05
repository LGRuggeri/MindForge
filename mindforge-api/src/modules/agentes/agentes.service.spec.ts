import { NotFoundException } from '@nestjs/common';
import { AgentesService } from './agentes.service';
import type { AgenteExecucao } from '../../database/schema';

describe('AgentesService', () => {
  let service: AgentesService;
  let repo: {
    registrar: jest.Mock;
    listar: jest.Mock;
    buscarPorId: jest.Mock;
  };
  let llm: { completar: jest.Mock };

  const execucaoMock: AgenteExecucao = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    agente: 'planner',
    entrada: { objetivo: 'aprender TypeScript' },
    saida: { resultado: {} },
    modeloUsado: 'grok-4.5',
    tokensUtilizados: 120,
    duracaoMs: 900,
    status: 'sucesso',
    erroMensagem: null,
    criadoEm: new Date(),
  };

  beforeEach(() => {
    repo = {
      registrar: jest.fn().mockResolvedValue(undefined),
      listar: jest.fn().mockResolvedValue([execucaoMock]),
      buscarPorId: jest.fn().mockResolvedValue(execucaoMock),
    };
    llm = { completar: jest.fn() };
    service = new AgentesService(
      repo as never,
      llm as never,
    );
  });

  describe('executar', () => {
    const opcoes = {
      agente: 'planner' as const,
      system: 'system',
      user: 'user',
      entrada: { objetivo: 'aprender TypeScript' },
      parser: (raw: string) => JSON.parse(raw) as unknown,
    };

    it('deve registrar sucesso e retornar o resultado parseado', async () => {
      llm.completar.mockResolvedValue({
        parsed: { trilha: [] },
        raw: '{"trilha":[]}',
        modeloUsado: 'grok-4.5',
        tokensUtilizados: 120,
      });

      const resultado = await service.executar(opcoes);

      expect(resultado).toEqual({ trilha: [] });
      expect(repo.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          agente: 'planner',
          status: 'sucesso',
          modeloUsado: 'grok-4.5',
          tokensUtilizados: 120,
        }),
      );
    });

    it('deve registrar erro e relançar quando o LLM falha', async () => {
      llm.completar.mockRejectedValue(new Error('timeout'));

      await expect(service.executar(opcoes)).rejects.toThrow('timeout');
      expect(repo.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          agente: 'planner',
          status: 'erro',
          erroMensagem: 'timeout',
          saida: undefined,
        }),
      );
    });
  });

  describe('listar', () => {
    it('deve repassar os filtros para o repositório', async () => {
      const filtros = { agente: 'teacher' as const, status: 'erro' as const, limite: 10, offset: 5 };

      const resultado = await service.listar(filtros);

      expect(repo.listar).toHaveBeenCalledWith(filtros);
      expect(resultado).toEqual([execucaoMock]);
    });
  });

  describe('buscarPorId', () => {
    it('deve retornar a execução quando encontrada', async () => {
      const resultado = await service.buscarPorId(execucaoMock.id);

      expect(repo.buscarPorId).toHaveBeenCalledWith(execucaoMock.id);
      expect(resultado).toEqual(execucaoMock);
    });

    it('deve lançar NotFoundException quando não encontrada', async () => {
      repo.buscarPorId.mockResolvedValue(undefined);

      await expect(service.buscarPorId('nao-existe')).rejects.toThrow(NotFoundException);
    });
  });
});
