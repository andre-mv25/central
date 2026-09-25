import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { Inject } from '@nestjs/common';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Si hay respuesta cacheada, devolverla inmediatamente
    if (request.idempotencyCached) {
      response.status(request.idempotencyCached.status);
      return new Observable((subscriber) => {
        subscriber.next(request.idempotencyCached.body);
        subscriber.complete();
      });
    }

    // Si no hay clave de idempotencia, continuar normal
    const idempotencyKey = request.idempotencyKey;
    const requestHash = request.idempotencyRequestHash;
    if (!idempotencyKey || !requestHash) {
      return next.handle();
    }

    // Procesar request y guardar respuesta
    return next.handle().pipe(
      tap({
        next: async (responseBody) => {
          const statusCode = response.statusCode;
          try {
            await this.pool.query(
              `UPDATE idempotency_keys
               SET response_status = $1, response_body = $2
               WHERE clave = $3 AND request_hash = $4`,
              [statusCode, JSON.stringify(responseBody), idempotencyKey, requestHash],
            );
          } catch (error) {
            console.error('[Idempotency] Error guardando respuesta:', error);
          }
        },
        error: async (error) => {
          // En caso de error, también guardamos para no reintentar indefinidamente
          const statusCode = error?.status || error?.response?.statusCode || 500;
          try {
            await this.pool.query(
              `UPDATE idempotency_keys
               SET response_status = $1, response_body = $2
               WHERE clave = $3 AND request_hash = $4`,
              [statusCode, JSON.stringify({ message: error?.message || 'Internal Error' }), idempotencyKey, requestHash],
            );
          } catch (e) {
            console.error('[Idempotency] Error guardando error:', e);
          }
        },
      }),
    );
  }
}