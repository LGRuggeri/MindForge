import { BadRequestException } from '@nestjs/common';
import { DiarioService } from './diario.service';
import type { RegistrarDiarioDto } from './dto/registrar-diario.dto';

describe('DiarioService', () => {
  let service: DiarioService;
  let repo: {
    criar: jest.Mock;
    contarModulosDoPerfil: jest.Mock;
    atualizarRecomendacoes: jest.Mock;
    listarPorPerfil: jest.Mock;
  };
  let agentes: { executar: jest.Mock };

  const registroMock = {
    id: '660e8400-e29b-41d4-a716-446655440001',
    perfilId: '550e8400-e29b-41d4-a716-446655440000',
    data: '2026-09-04',
    tempoInvestidoMin: 45,
    conquistas: 'Estudei NestJS',
    dificuldades: null,
    recomendacoesIa: null,
    criadoEm: new Date(),
    modulos: [],
  };

  const dtoBase: RegistrarDiarioDto = {
    perfilId: '550e8400-e29b-41d4-a716-446655440000',
    tempoInvestidoMin: 45,
    conquistas: 'Estudei NestJS',
  };

  beforeEach(() => {
    repo = {
      criar: jest.fn().mockResolvedValue(registroMock),
      contarModulosDoPerfil: jest.fn().mockResolvedValue(0),
      atualizarRecomendacoes: jest.fn().mockResolvedValue(registroMock),
      listarPorPerfil: jest.fn().mockResolvedValue([registroMock]),
    };
    agentes = { executar: jest.fn() };
    service = new DiarioService(repo as never, agentes as never);
  });

  it('deve registrar sem módulos sem validar propriedade', async () => {
    agentes.executar.mockResolvedValue({
      recomendacoes: 'Continue assim',
      proximoFoco: 'Revisar decorators',
      ajustesSugeridos: ['Mais exercícios'],
    });

    const resultado = await service.registrar(dtoBase);

    expect(repo.contarModulosDoPerfil).not.toHaveBeenCalled();
    expect(repo.criar).toHaveBeenCalledWith(
      expect.objectContaining({ perfilId: dtoBase.perfilId }),
      [],
    );
    expect(resultado.ajustesSugeridos).toEqual(['Mais exercícios']);
  });

  it('deve validar propriedade dos módulos antes de criar o registro', async () => {
    repo.contarModulosDoPerfil.mockResolvedValue(2);
    agentes.executar.mockResolvedValue({
      recomendacoes: 'Bom ritmo',
      proximoFoco: 'Próximo módulo',
      ajustesSugeridos: [],
    });
    const moduloA = '770e8400-e29b-41d4-a716-446655440000';
    const moduloB = '880e8400-e29b-41d4-a716-446655440000';

    await service.registrar({ ...dtoBase, moduloIds: [moduloA, moduloB, moduloA] });

    expect(repo.contarModulosDoPerfil).toHaveBeenCalledWith(dtoBase.perfilId, [moduloA, moduloB]);
    expect(repo.criar).toHaveBeenCalledWith(expect.anything(), [moduloA, moduloB]);
  });

  it('deve rejeitar módulos que não pertencem ao perfil', async () => {
    repo.contarModulosDoPerfil.mockResolvedValue(1);

    await expect(
      service.registrar({
        ...dtoBase,
        moduloIds: ['770e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000'],
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.criar).not.toHaveBeenCalled();
  });

  it('deve normalizar recomendações do Teacher sem ajustesSugeridos', async () => {
    agentes.executar.mockImplementation(async (options: { parser: (raw: string) => unknown }) =>
      options.parser(
        JSON.stringify({ recomendacoes: 'Resposta sem ajustes', proximoFoco: 'Foco' }),
      ),
    );

    const resultado = await service.registrar(dtoBase);

    expect(resultado.ajustesSugeridos).toEqual([]);
    expect(resultado.proximoFoco).toBe('Foco');
  });

  it('deve lançar erro quando o Teacher omite recomendacoes', async () => {
    agentes.executar.mockImplementation(async (options: { parser: (raw: string) => unknown }) =>
      options.parser(JSON.stringify({ proximoFoco: 'Foco' })),
    );

    await expect(service.registrar(dtoBase)).rejects.toThrow(
      'O agente Teacher retornou uma resposta inválida',
    );
  });

  it('deve usar "Nenhum" no prompt quando o registro não tem módulos', async () => {
    agentes.executar.mockResolvedValue({
      recomendacoes: 'Sem módulos',
      proximoFoco: 'Foco',
      ajustesSugeridos: [],
    });

    await service.registrar(dtoBase);

    const opcoes = agentes.executar.mock.calls[0][0] as { user: string };
    expect(opcoes.user).toContain('- Módulos estudados: Nenhum');
  });

  it('deve listar os módulos no prompt quando informados', async () => {
    repo.contarModulosDoPerfil.mockResolvedValue(2);
    agentes.executar.mockResolvedValue({
      recomendacoes: 'Com módulos',
      proximoFoco: 'Foco',
      ajustesSugeridos: [],
    });
    const moduloA = '770e8400-e29b-41d4-a716-446655440000';
    const moduloB = '880e8400-e29b-41d4-a716-446655440000';

    await service.registrar({ ...dtoBase, moduloIds: [moduloA, moduloB] });

    const opcoes = agentes.executar.mock.calls[0][0] as { user: string };
    expect(opcoes.user).toContain(`- Módulos estudados: ${moduloA}, ${moduloB}`);
  });
});
