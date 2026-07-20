import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Formato de erro único para toda a API, seguindo RFC 7807 (Problem Details
 * for HTTP APIs). Nunca expõe stack trace nem detalhes internos do banco
 * ao cliente — isso vai para o log estruturado, não para a resposta.
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

    const title = isHttpException ? exception.message : 'Erro interno';
    const detail =
      isHttpException && typeof exception.getResponse() === 'object'
        ? ((exception.getResponse() as Record<string, unknown>).message as string | undefined)
        : undefined;

    const problem: ProblemDetails = {
      type: `https://mindforge.local/erros/${status}`,
      title,
      status,
      detail: Array.isArray(detail) ? detail.join('; ') : detail,
      instance: request.url,
    };

    if (!isHttpException) {
      // Erro não tratado: log completo internamente, resposta genérica ao cliente.
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(status).contentType('application/problem+json').json(problem);
  }
}
