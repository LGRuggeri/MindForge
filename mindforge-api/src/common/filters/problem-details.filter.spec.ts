import { ArgumentsHost, ServiceUnavailableException } from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter';
import { PesquisaIndisponivelException } from './pesquisa-indisponivel.exception';

describe('Avisos públicos de pesquisa e redação de erros internos', () => {
  function filtrar(erro: unknown) {
    const response = {
      status: jest.fn().mockReturnThis(),
      contentType: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/synthesizer/conteudos?privado=valor' }),
      }),
    } as unknown as ArgumentsHost;
    new ProblemDetailsFilter().catch(erro, host);
    return response.json.mock.calls[0][0];
  }
  it('exibe orientação fixa para a falha conhecida da pesquisa', () => {
    expect(filtrar(new PesquisaIndisponivelException())).toMatchObject({
      status: 503,
      title: 'Pesquisa indisponível',
      detail: expect.stringContaining('desmarque a pesquisa'),
      instance: '/synthesizer/conteudos',
    });
  });
  it.each([new Error('credencial privada'), new ServiceUnavailableException('credencial privada')])(
    'mantém outros erros internos ocultos',
    (erro) => {
      const problem = filtrar(erro);
      expect(problem.title).toBe('Erro interno');
      expect(problem.detail).toBeUndefined();
      expect(JSON.stringify(problem)).not.toContain('credencial');
    },
  );
});
