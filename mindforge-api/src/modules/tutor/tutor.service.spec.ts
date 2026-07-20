import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgentKbService } from '../agent-kb/agent-kb.service';
import { AgentesService } from '../agentes/agentes.service';
import { BibliotecaVivaService } from '../biblioteca-viva/biblioteca-viva.service';
import { AvaliarRespostaDto } from './dto/avaliar-resposta.dto';
import { TirarDuvidaDto } from './dto/tirar-duvida.dto';
import { TutorRepository } from './tutor.repository';
import { TutorService } from './tutor.service';

describe('TutorService', () => {
  let service: TutorService;
  let repo: jest.Mocked<TutorRepository>;
  let agentes: jest.Mocked<AgentesService>;
  let biblioteca: jest.Mocked<BibliotecaVivaService>;

  const perfilId = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';
  const moduloId = 'c3d4e5f6-a7b8-9012-cdef-345678901234';
  const duvidaId = 'd4e5f6a7-b8c9-0123-defa-456789012345';

  const moduloMock = {
    id: moduloId,
    titulo: 'Variáveis em Python',
    objetivoAprendizagem: 'Entender o que é uma variável',
    trilha: {
      objetivo: {
        titulo: 'Python para Iniciantes',
        descricao: 'Aprender Python do zero',
        perfil: { nivelAtual: 'iniciante' },
      },
    },
  };

  beforeEach(async () => {
    const repoMock = {
      buscarModuloPorId: jest.fn(),
      salvarDuvida: jest.fn(),
      buscarDuvidaPorId: jest.fn(),
      avaliarDuvida: jest.fn(),
      listarHistoricoPorPerfil: jest.fn(),
      listarHistoricoRecentePorPerfil: jest.fn(),
    };

    const agentesMock = {
      executar: jest.fn(),
    };

    const bibliotecaMock = {
      buscar: jest.fn(),
      indexarTexto: jest.fn(),
    };

    const agentKbMock = {
      isAvailable: jest.fn().mockReturnValue(false),
      buildContextPack: jest.fn(),
      addMemory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TutorService,
        { provide: TutorRepository, useValue: repoMock },
        { provide: AgentesService, useValue: agentesMock },
        { provide: BibliotecaVivaService, useValue: bibliotecaMock },
        { provide: AgentKbService, useValue: agentKbMock },
      ],
    }).compile();

    service = module.get(TutorService);
    repo = module.get(TutorRepository);
    agentes = module.get(AgentesService);
    biblioteca = module.get(BibliotecaVivaService);
  });

  describe('tirarDuvida', () => {
    const dto: TirarDuvidaDto = {
      perfilId,
      moduloId,
      pergunta: 'O que é uma variável?',
    };

    it('deve lançar NotFoundException quando o módulo não existe', async () => {
      repo.buscarModuloPorId.mockResolvedValue(undefined);

      await expect(service.tirarDuvida(dto)).rejects.toThrow(
        new NotFoundException(`Módulo ${moduloId} não encontrado`),
      );
    });

    it('deve salvar a dúvida no histórico e retornar a resposta do agente', async () => {
      repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
      repo.listarHistoricoRecentePorPerfil.mockResolvedValue([]);
      biblioteca.buscar.mockResolvedValue([]);

      const respostaAgente = {
        resposta: 'Uma variável é como uma caixa com um nome.',
        citacoes: [],
        proximosPassos: ['Praticar declaração de variáveis'],
      };
      agentes.executar.mockResolvedValue(respostaAgente);

      const registroSalvo = {
        id: duvidaId,
        perfilId,
        moduloId,
        pergunta: dto.pergunta,
        resposta: respostaAgente.resposta,
        citacoes: respostaAgente.citacoes,
        proximosPassos: respostaAgente.proximosPassos,
        chunksIds: [],
        avaliacao: null,
        feedback: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };
      repo.salvarDuvida.mockResolvedValue(registroSalvo as never);

      const resultado = await service.tirarDuvida(dto);

      expect(resultado.duvidaId).toBe(duvidaId);
      expect(resultado.resposta).toBe(respostaAgente.resposta);
      expect(resultado.citacoes).toEqual(respostaAgente.citacoes);
      expect(resultado.proximosPassos).toEqual(respostaAgente.proximosPassos);
      expect(resultado.chunksConsultados).toEqual([]);
      expect(repo.salvarDuvida).toHaveBeenCalledWith({
        perfilId,
        moduloId,
        pergunta: dto.pergunta,
        resposta: respostaAgente.resposta,
        citacoes: respostaAgente.citacoes,
        proximosPassos: respostaAgente.proximosPassos,
        chunksIds: [],
      });
    });

    it('deve continuar mesmo quando a Biblioteca Viva falha', async () => {
      repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
      repo.listarHistoricoRecentePorPerfil.mockResolvedValue([]);
      biblioteca.buscar.mockRejectedValue(new Error('Embedding offline'));

      const respostaAgente = {
        resposta: 'Resposta sem chunks.',
        citacoes: [],
        proximosPassos: [],
      };
      agentes.executar.mockResolvedValue(respostaAgente);

      const registroSalvo = {
        id: duvidaId,
        perfilId,
        moduloId,
        pergunta: dto.pergunta,
        resposta: respostaAgente.resposta,
        citacoes: [],
        proximosPassos: [],
        chunksIds: [],
        avaliacao: null,
        feedback: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };
      repo.salvarDuvida.mockResolvedValue(registroSalvo as never);

      const resultado = await service.tirarDuvida(dto);

      expect(resultado.resposta).toBe(respostaAgente.resposta);
      expect(biblioteca.buscar).toHaveBeenCalled();
      expect(agentes.executar).toHaveBeenCalled();
    });

    it('deve incluir chunks recuperados no histórico', async () => {
      repo.buscarModuloPorId.mockResolvedValue(moduloMock as never);
      repo.listarHistoricoRecentePorPerfil.mockResolvedValue([]);

      const chunks = [
        {
          id: 'chunk-1',
          texto: 'Texto do chunk 1',
          similaridade: 0.92,
          conteudoId: 'conteudo-1',
          fonteId: null,
        },
      ];
      biblioteca.buscar.mockResolvedValue(chunks);

      const respostaAgente = {
        resposta: 'Resposta com chunk.',
        citacoes: ['Texto do chunk 1'],
        proximosPassos: ['Revisar'],
      };
      agentes.executar.mockResolvedValue(respostaAgente);

      const registroSalvo = {
        id: duvidaId,
        perfilId,
        moduloId,
        pergunta: dto.pergunta,
        resposta: respostaAgente.resposta,
        citacoes: respostaAgente.citacoes,
        proximosPassos: respostaAgente.proximosPassos,
        chunksIds: ['chunk-1'],
        avaliacao: null,
        feedback: null,
        criadoEm: new Date(),
        atualizadoEm: new Date(),
      };
      repo.salvarDuvida.mockResolvedValue(registroSalvo as never);

      const resultado = await service.tirarDuvida(dto);

      expect(resultado.chunksConsultados).toHaveLength(1);
      expect(resultado.chunksConsultados[0].id).toBe('chunk-1');
      expect(repo.salvarDuvida).toHaveBeenCalledWith(
        expect.objectContaining({ chunksIds: ['chunk-1'] }),
      );
    });
  });

  describe('avaliarResposta', () => {
    const dto: AvaliarRespostaDto = {
      duvidaId,
      avaliacao: 5,
      feedback: 'Muito claro!',
    };

    it('deve lançar NotFoundException quando a dúvida não existe', async () => {
      repo.buscarDuvidaPorId.mockResolvedValue(undefined);

      await expect(service.avaliarResposta(dto)).rejects.toThrow(
        new NotFoundException(`Dúvida ${duvidaId} não encontrada`),
      );
    });

    it('deve salvar avaliação e feedback', async () => {
      repo.buscarDuvidaPorId.mockResolvedValue({ id: duvidaId } as never);

      const atualizado = {
        id: duvidaId,
        avaliacao: 5,
        feedback: 'Muito claro!',
      };
      repo.avaliarDuvida.mockResolvedValue(atualizado as never);

      const resultado = await service.avaliarResposta(dto);

      expect(resultado).toEqual(atualizado);
      expect(repo.avaliarDuvida).toHaveBeenCalledWith(duvidaId, 5, 'Muito claro!');
    });
  });

  describe('listarHistoricoPorPerfil', () => {
    it('deve retornar o histórico ordenado do repositório', async () => {
      const historico = [
        { id: duvidaId, pergunta: 'Pergunta 1' },
        { id: 'outro-id', pergunta: 'Pergunta 2' },
      ];
      repo.listarHistoricoPorPerfil.mockResolvedValue(historico as never);

      const resultado = await service.listarHistoricoPorPerfil(perfilId);

      expect(resultado).toEqual(historico);
      expect(repo.listarHistoricoPorPerfil).toHaveBeenCalledWith(perfilId);
    });
  });
});
