import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  MENSAGEM_PESQUISA_INDISPONIVEL,
  PesquisaIndisponivelException,
} from './pesquisa-indisponivel.exception';

/**
 * Formato de erro único para toda a API, seguindo RFC 7807 (Problem Details
 * for HTTP APIs). Nunca expõe stack trace nem detalhes internos do banco
 * ao cliente. Logs não recebem o objeto de erro nem parâmetros privados.
 */
interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance: string;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const erroInterno = status >= 500;
    const avisoPesquisa = exception instanceof PesquisaIndisponivelException;
    const title = avisoPesquisa
      ? 'Pesquisa indisponível'
      : erroInterno
        ? 'Erro interno'
        : (exception as HttpException).message;
    const corpo = isHttpException ? exception.getResponse() : undefined;
    const mensagem =
      corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>).message : undefined;
    const detail = avisoPesquisa
      ? MENSAGEM_PESQUISA_INDISPONIVEL
      : erroInterno
        ? undefined
        : typeof mensagem === 'string'
          ? mensagem
          : Array.isArray(mensagem) && mensagem.every((item) => typeof item === 'string')
            ? mensagem.join('; ')
            : undefined;

    const problem: ProblemDetails = {
      type: `https://mindforge.local/erros/${status}`,
      title,
      status,
      detail,
      instance: request.url.split('?')[0],
    };

    if (erroInterno) {
      this.logger.error(`Falha HTTP ${status}`);
    }

    response.status(status).contentType('application/problem+json').json(problem);
  }
}
