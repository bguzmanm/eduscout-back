import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object' && 'message' in exceptionResponse
          ? (exceptionResponse as { message: string | string[] }).message
          : exceptionResponse;

      if (status >= 500) {
        this.logger.error(
          `HTTP ${status} - ${JSON.stringify(message)}`,
          exception.stack,
        );
      } else {
        this.logger.warn(`HTTP ${status} - ${JSON.stringify(message)}`);
      }
    } else if (this.isPostgresUniqueViolation(exception)) {
      status = 409;
      message = 'El registro ya existe';
      this.logger.warn(
        `Postgres unique violation - ${(exception as Error).message}`,
      );
    } else {
      status = 500;
      message = 'Error interno del servidor';
      this.logger.error(
        `Error no manejado - ${(exception as Error)?.message ?? 'Desconocido'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private isPostgresUniqueViolation(error: unknown): boolean {
    const hasCode = (err: unknown) =>
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505';

    return (
      hasCode(error) ||
      (typeof error === 'object' &&
        error !== null &&
        'cause' in error &&
        hasCode((error as { cause: unknown }).cause))
    );
  }
}
