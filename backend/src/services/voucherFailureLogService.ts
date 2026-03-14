/**
 * Voucher Failure Log Service
 * Logs failed voucher creation attempts to voucher_failures table for visibility in UI
 */

import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export type FailureCategory = 'missing_accounts' | 'validation_error' | 'system_error' | 'other';

export interface LogVoucherFailureParams {
  sourceModule: string;
  operationType: string;
  sourceEntityType: string;
  sourceEntityId: number;
  errorMessage: string;
  failureCategory: FailureCategory;
  payload?: Record<string, unknown>;
  userId?: number;
}

function inferFailureCategory(errorMessage: string): FailureCategory {
  const msg = errorMessage.toLowerCase();
  if (
    (msg.includes('account') && msg.includes('not') && msg.includes('found')) ||
    msg.includes('required accounts not configured')
  ) {
    return 'missing_accounts';
  }
  if (msg.includes('validation') || msg.includes('invalid') || msg.includes('cost center')) {
    return 'validation_error';
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('connection')) {
    return 'system_error';
  }
  return 'other';
}

export async function logVoucherFailure(params: LogVoucherFailureParams): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO voucher_failures (
        source_module,
        operation_type,
        source_entity_type,
        source_entity_id,
        error_message,
        failure_category,
        payload,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        params.sourceModule,
        params.operationType,
        params.sourceEntityType,
        params.sourceEntityId,
        params.errorMessage,
        params.failureCategory,
        params.payload ? JSON.stringify(params.payload) : null,
        params.userId ?? null,
      ]
    );
    MyLogger.info('Voucher Failure Logged', {
      operationType: params.operationType,
      sourceEntityType: params.sourceEntityType,
      sourceEntityId: params.sourceEntityId,
      failureCategory: params.failureCategory,
    });
  } catch (err) {
    MyLogger.error('Log Voucher Failure', err, {
      operationType: params.operationType,
      sourceEntityId: params.sourceEntityId,
    });
  }
}

export function logVoucherFailureFromError(
  params: Omit<LogVoucherFailureParams, 'failureCategory'> & { errorMessage: string }
): void {
  const failureCategory = inferFailureCategory(params.errorMessage);
  logVoucherFailure({ ...params, failureCategory }).catch(() => {});
}
