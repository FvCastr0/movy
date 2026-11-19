import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

/**
 * Filtro Global de Exceções (OWASP A05 - Security Misconfiguration).
 * Garante que stack traces, erros internos do Prisma ou detalhes de infraestrutura
 * nunca vazem em respostas HTTP para o cliente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : null;

    if (!isHttpException) {
      this.logger.error(
        `Unhandled error on ${request?.method} ${request?.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const safeBody =
      isHttpException && typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : {
            statusCode: status,
            error: isHttpException ? 'Request Error' : 'Internal Server Error',
            message: isHttpException
              ? String(exceptionResponse)
              : 'Ocorreu um erro interno ao processar a solicitação.',
          };

    response.status(status).json({
      ...safeBody,
      timestamp: new Date().toISOString(),
      path: request?.url,
    });
  }
}
