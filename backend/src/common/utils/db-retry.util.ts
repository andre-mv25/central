import { Pool, PoolClient, QueryResult } from 'pg';

export const TRANSIENT_ERROR_CODES = new Set<string>([
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '53300', // too_many_connections
  '53400', // configuration_limit_exceeded
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  'XX000', // internal_error
]);

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  shouldRetry: (error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error) {
      return TRANSIENT_ERROR_CODES.has(String((error as { code: string }).code));
    }
    return false;
  },
  onRetry: (attempt, error, delayMs) => {
    console.warn(`[db-retry] Intento ${attempt}: ${error instanceof Error ? error.message : String(error)} (espera ${delayMs}ms)`);
  },
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === opts.maxRetries;
      const shouldRetry = !isLastAttempt && opts.shouldRetry(error);

      if (!shouldRetry) {
        throw error;
      }

      const delayMs = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        opts.maxDelayMs,
      );

      opts.onRetry(attempt + 1, error, delayMs);
      await sleep(delayMs);
    }
  }

  throw lastError;
}

export async function withTransactionRetry<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  return withRetry(async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore rollback error
      }
      throw error;
    } finally {
      client.release();
    }
  }, options);
}

export function isTransientError(error: unknown): boolean {
  return DEFAULT_OPTIONS.shouldRetry(error);
}