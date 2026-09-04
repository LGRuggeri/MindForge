import { Test, TestingModule } from '@nestjs/testing';
import { DificuldadeExercicio, TipoExercicio } from './dto';
import { ExerciciosAvaliacoesController } from './exercicios-avaliacoes.controller';
import { ExerciciosAvaliacoesService } from './exercicios-avaliacoes.service';
import { AvaliacoesService } from './avaliacoes.service';
import { RevisaoEspacadaService } from './revisao-espacada.service';

describe('ExerciciosAvaliacoesController', () => {
  let controller: ExerciciosAvaliacoesController;
  let service: jest.Mocked<ExerciciosAvaliacoesService>;
  let avaliacoesService: jest.Mocked<AvaliacoesService>;
  let revisaoService: jest.Mocked<RevisaoEspacadaService>;

  const moduloId = '123e4567-e89b-12d3-a456-426614174000';
  const exercicioId = '223e4567-e89b-12d3-a456-426614174000';
  const perfilId = '323e4567-e89b-12d3-a456-426614174000';

  beforeEach(async () => {
    const serviceMock = {
      gerarExercicio: jest.fn(),
      submeterTentativa: jest.fn(),
      listarPorModulo: jest.fn(),
      estatisticasPorExercicio: jest.fn(),
    };

    const avaliacoesMock = {
      criar: jest.fn(),
      submeter: jest.fn(),
    };

    const revisaoMock = {
      listarProximasRevisoes: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExerciciosAvaliacoesController],
      providers: [
        { provide: ExerciciosAvaliacoesService, useValue: serviceMock },
        { provide: AvaliacoesService, useValue: avaliacoesMock },
        { provide: RevisaoEspacadaService, useValue: revisaoMock },
      ],
    }).compile();

    controller = module.get(ExerciciosAvaliacoesController);
    service = module.get(ExerciciosAvaliacoesService);
    avaliacoesService = module.get(AvaliacoesService);
    revisaoService = module.get(RevisaoEspacadaService);
  });

  describe('gerarExercicio', () => {
    it('deve chamar service.gerarExercicio com dto', async () => {
      const dto = {
        moduloId,
        tipo: TipoExercicio.QUESTAO_OBJETIVA,
        dificuldade: DificuldadeExercicio.FACIL,
      };
      const esperado = { id: exercicioId, ...dto };
      service.gerarExercicio.mockResolvedValue(esperado as never);

      const resultado = await controller.gerarExercicio(dto);

      expect(resultado).toEqual(esperado);
      expect(service.gerarExercicio).toHaveBeenCalledWith(dto);
    });
  });

  describe('submeterTentativa', () => {
    it('deve chamar service.submeterTentativa com exercicioId do parametro', async () => {
      const dto = { exercicioId, respostaUsuario: 'Paris', perfilId };
      const esperado = { id: 'tentativa-mock', ...dto, correta: true };
      service.submeterTentativa.mockResolvedValue(esperado as never);

      const resultado = await controller.submeterTentativa(exercicioId, dto);

      expect(resultado).toEqual(esperado);
      expect(service.submeterTentativa).toHaveBeenCalledWith({
        ...dto,
        exercicioId,
      });
    });
  });

  describe('listarPorModulo', () => {
    it('deve chamar service.listarPorModulo com moduloId', async () => {
      const esperado = [{ id: exercicioId }];
      service.listarPorModulo.mockResolvedValue(esperado as never);

      const resultado = await controller.listarPorModulo(moduloId);

      expect(resultado).toEqual(esperado);
      expect(service.listarPorModulo).toHaveBeenCalledWith(moduloId);
    });
  });

  describe('estatisticas', () => {
    it('deve chamar service.estatisticasPorExercicio com id', async () => {
      const esperado = { total: 0, corretas: 0, incorretas: 0, pontuacaoMedia: null };
      service.estatisticasPorExercicio.mockResolvedValue(esperado as never);

      const resultado = await controller.estatisticas(exercicioId);

      expect(resultado).toEqual(esperado);
      expect(service.estatisticasPorExercicio).toHaveBeenCalledWith(exercicioId);
    });
  });

  describe('criarAvaliacao', () => {
    it('deve chamar avaliacoesService.criar com dto', async () => {
      const dto = { titulo: 'Avaliacao', tipo: 'formativa' };
      const esperado = { id: 'av-mock', ...dto };
      avaliacoesService.criar.mockResolvedValue(esperado as never);

      const resultado = await controller.criarAvaliacao(dto as any);

      expect(resultado).toEqual(esperado);
      expect(avaliacoesService.criar).toHaveBeenCalledWith(dto);
    });
  });

  describe('submeterAvaliacao', () => {
    it('deve chamar avaliacoesService.submeter com dto', async () => {
      const dto = {
        avaliacaoId: 'av-mock',
        perfilId: '123e4567-e89b-12d3-a456-426614174000',
        respostas: [],
      };
      const esperado = { id: 'res-mock', pontuacaoTotal: 10 };
      avaliacoesService.submeter.mockResolvedValue(esperado as never);

      const resultado = await controller.submeterAvaliacao(dto as any);

      expect(resultado).toEqual(esperado);
      expect(avaliacoesService.submeter).toHaveBeenCalledWith(dto);
    });
  });

  describe('listarRevisoes', () => {
    it('deve chamar revisaoService.listarProximasRevisoes com perfilId e data', async () => {
      const esperado = [{ id: 'rev-1' }];
      const perfilId = '123e4567-e89b-12d3-a456-426614174000';
      revisaoService.listarProximasRevisoes.mockResolvedValue(esperado as never);

      const resultado = await controller.listarRevisoes(perfilId, '2026-07-20');

      expect(resultado).toEqual(esperado);
      expect(revisaoService.listarProximasRevisoes).toHaveBeenCalledWith(perfilId, '2026-07-20');
    });

    it('deve rejeitar requisição sem perfilId', async () => {
      await expect(controller.listarRevisoes(undefined as unknown as string)).rejects.toThrow(
        'perfilId é obrigatório',
      );
    });
  });
});
