import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const timestamp = new Date().toISOString();

      if (res && typeof res === 'object') {
        response.status(status).json({ statusCode: status, ...(res as Record<string, unknown>), timestamp });
        return;
      }

      response.status(status).json({
        statusCode: status,
        message: typeof res === 'string' ? res : exception.message,
        timestamp,
      });
      return;
    }

    const pgError = exception as { code?: string; detail?: string; message?: string };

    if (pgError?.code === '23505') {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: 'El registro ya existe (valor duplicado)',
        detail: pgError.detail,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (pgError?.code === '23503') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Referencia inválida: el registro relacionado no existe',
        detail: pgError.detail,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (pgError?.code === '23514') {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Datos fuera de rango permitido',
        detail: pgError.detail,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      timestamp: new Date().toISOString(),
    });
  }
}
