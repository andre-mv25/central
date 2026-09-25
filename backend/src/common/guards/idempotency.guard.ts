import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { Pool } from 'pg';
import { PG_POOL } from '../../config/database.constants';
import { createHash } from 'crypto';

const IDEMPOTENCY_HEADER = 'idempotency-key';
const IDEMPOTENCY_TTL_HOURS = 24;

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Solo aplicar a métodos mutables
    const method = request.method.toUpperCase();
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return true;
    }

    const idempotencyKey = request.headers[IDEMPOTENCY_HEADER] as string | undefined;
    
    // Si no hay clave, permitir (opcional: se puede hacer obligatorio)
    if (!idempotencyKey) {
      return true;
    }

    // Validar formato de clave (UUID v4 o string alfanumérico 32-64 chars)
    if (!/^[a-f0-9]{32,64}$/i.test(idempotencyKey) && !/^[a-f0-9-]{36}$/i.test(idempotencyKey)) {
      throw new ForbiddenException('Idempotency-Key inválida: use UUID v4 o string hex 32-64 chars');
    }

    const userId = (request as any).user?.id;
    const route = request.route?.path || request.originalUrl;
    const requestBody = JSON.stringify(request.body || {});
    const requestHash = createHash('sha256').update(requestBody).digest('hex');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Intentar insertar la clave (upsert con conflict detection)
      const insertResult = await client.query(
        `INSERT INTO idempotency_keys (clave, metodo, ruta, usuario_id, request_hash, expira_at)
         VALUES ($1, $2, $3, $4, $5, now() + INTERVAL '${IDEMPOTENCY_TTL_HOURS} hours')
         ON CONFLICT (clave) DO UPDATE SET
           request_hash = EXCLUDED.request_hash,
           expira_at = GREATEST(idempotency_keys.expira_at, EXCLUDED.expira_at)
         RETURNING id, request_hash, response_status, response_body`,
        [idempotencyKey, method, route, userId || null, requestHash],
      );

      const existing = insertResult.rows[0];

      // Si ya existía con mismo hash y ya tiene respuesta, devolver respuesta cacheada
      if (existing.response_status && existing.request_hash === requestHash) {
        // Marcar en response headers para que el interceptor la use
        (request as any).idempotencyCached = {
          status: existing.response_status,
          body: existing.response_body,
        };
        await client.query('COMMIT');
        return true;
      }

      // Si existe con diferente hash, rechazar (replay attack o bug cliente)
      if (existing.request_hash !== requestHash) {
        await client.query('ROLLBACK');
        throw new ForbiddenException(
          'Idempotency-Key ya usada con diferente payload. Genere una nueva clave.',
        );
      }

      // Primera vez con este hash: continuar, el interceptor guardará la respuesta
      (request as any).idempotencyKey = idempotencyKey;
      (request as any).idempotencyRequestHash = requestHash;
      
      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}