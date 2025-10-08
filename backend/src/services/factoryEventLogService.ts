/**
 * Factory Event Log Service
 * Handles event logging for idempotency and failed voucher queue management
 * 
 * Purpose:
 * - Prevent duplicate voucher creation (idempotency)
 * - Track event processing status
 * - Queue failed vouchers for retry
 * - Support manual resolution by finance team
 */

import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface EventLogEntry {
  id: number;
  eventId: string;
  eventType: string;
  eventSource: string;
  sourceId: number;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  voucherIds?: number[];
  voucherCount: number;
  errorMessage?: string;
  retryCount: number;
  createdBy: number;
}

export interface FailedVoucherEntry {
  id: number;
  eventLogId: number;
  eventType: string;
  eventSource: string;
  sourceId: number;
  eventPayload: any;
  failureReason: string;
  failureCategory: 'missing_accounts' | 'validation_error' | 'system_error' | 'network_error' | 'other';
  stackTrace?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  status: 'pending' | 'in_progress' | 'resolved' | 'abandoned';
}

export class FactoryEventLogService {
  /**
   * Generate unique event ID
   * Format: {event_type}_{source_id}_{unix_timestamp}
   * Example: "order_approved_12345_1696800000"
   */
  generateEventId(eventType: string, sourceId: number, timestamp?: Date): string {
    const ts = timestamp || new Date();
    const unixTimestamp = Math.floor(ts.getTime() / 1000);
    return `${eventType.toLowerCase()}_${sourceId}_${unixTimestamp}`;
  }

  /**
   * Check if event has already been processed (idempotency check)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT EXISTS (
          SELECT 1 FROM factory_event_log 
          WHERE event_id = $1 
          AND status IN ('completed', 'processing')
        ) as exists`,
        [eventId]
      );

      return result.rows[0].exists;
    } catch (error) {
      MyLogger.error('Check Event Processed', error, { eventId });
      // On error, assume not processed to be safe
      return false;
    }
  }

  /**
   * Log event start (mark as processing)
   * Returns event log ID
   */
  async logEventStart(
    eventId: string,
    eventType: string,
    eventSource: string,
    sourceId: number,
    payload: any,
    userId: number
  ): Promise<number> {
    try {
      const result = await pool.query(
        `INSERT INTO factory_event_log (
          event_id,
          event_type,
          event_source,
          source_id,
          payload,
          status,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, 'processing', $6)
        RETURNING id`,
        [eventId, eventType, eventSource, sourceId, JSON.stringify(payload), userId]
      );

      MyLogger.info('Event Log Start', {
        eventLogId: result.rows[0].id,
        eventId,
        eventType,
        sourceId
      });

      return result.rows[0].id;
    } catch (error) {
      MyLogger.error('Event Log Start', error, { eventId, eventType, sourceId });
      throw error;
    }
  }

  /**
   * Log event success (mark as completed)
   */
  async logEventSuccess(
    eventLogId: number,
    voucherIds: number[]
  ): Promise<void> {
    try {
      await pool.query(
        `UPDATE factory_event_log 
         SET status = 'completed',
             processed_at = CURRENT_TIMESTAMP,
             voucher_ids = $1,
             voucher_count = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [voucherIds, voucherIds.length, eventLogId]
      );

      MyLogger.success('Event Log Success', {
        eventLogId,
        voucherCount: voucherIds.length,
        voucherIds
      });
    } catch (error) {
      MyLogger.error('Event Log Success', error, { eventLogId, voucherIds });
      // Don't throw - this is logging, shouldn't break main flow
    }
  }

  /**
   * Log event failure and add to failed voucher queue
   */
  async logEventFailure(
    eventLogId: number,
    error: Error,
    eventType: string,
    eventSource: string,
    sourceId: number,
    eventPayload: any,
    failureCategory: FailedVoucherEntry['failureCategory'] = 'system_error'
  ): Promise<number | null> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update event log
      await client.query(
        `UPDATE factory_event_log 
         SET status = 'failed',
             error_message = $1,
             retry_count = retry_count + 1,
             last_retry_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [error.message, eventLogId]
      );

      // Add to failed voucher queue
      const nextRetryAt = this.calculateNextRetry(0); // First retry
      
      const result = await client.query(
        `INSERT INTO failed_voucher_queue (
          event_log_id,
          event_type,
          event_source,
          source_id,
          event_payload,
          failure_reason,
          failure_category,
          stack_trace,
          next_retry_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          eventLogId,
          eventType,
          eventSource,
          sourceId,
          JSON.stringify(eventPayload),
          error.message,
          failureCategory,
          error.stack || null,
          nextRetryAt
        ]
      );

      await client.query('COMMIT');

      const failedVoucherId = result.rows[0].id;

      MyLogger.warn('Event Log Failure', {
        eventLogId,
        failedVoucherId,
        error: error.message,
        category: failureCategory,
        nextRetryAt
      });

      return failedVoucherId;
    } catch (logError) {
      await client.query('ROLLBACK');
      MyLogger.error('Event Log Failure', logError, { eventLogId, originalError: error.message });
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate next retry time with exponential backoff
   * Base delay: 5 minutes
   * Max delay: 24 hours
   */
  private calculateNextRetry(retryCount: number): Date {
    const baseDelayMinutes = 5;
    const maxDelayMinutes = 24 * 60; // 24 hours
    
    const delayMinutes = Math.min(
      baseDelayMinutes * Math.pow(2, retryCount),
      maxDelayMinutes
    );
    
    const nextRetry = new Date();
    nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);
    
    return nextRetry;
  }

  /**
   * Get failed vouchers pending retry
   */
  async getFailedVouchersPendingRetry(): Promise<FailedVoucherEntry[]> {
    try {
      const result = await pool.query(
        `SELECT 
          fvq.*,
          el.created_by
        FROM failed_voucher_queue fvq
        JOIN factory_event_log el ON fvq.event_log_id = el.id
        WHERE fvq.status = 'pending'
          AND fvq.retry_count < fvq.max_retries
          AND (fvq.next_retry_at IS NULL OR fvq.next_retry_at <= CURRENT_TIMESTAMP)
        ORDER BY fvq.created_at
        LIMIT 50`
      );

      return result.rows;
    } catch (error) {
      MyLogger.error('Get Failed Vouchers Pending Retry', error);
      return [];
    }
  }

  /**
   * Update failed voucher retry
   */
  async updateFailedVoucherRetry(
    failedVoucherId: number,
    error: Error
  ): Promise<void> {
    try {
      const result = await pool.query(
        `UPDATE failed_voucher_queue 
         SET retry_count = retry_count + 1,
             last_retry_at = CURRENT_TIMESTAMP,
             last_retry_error = $1,
             next_retry_at = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING retry_count`,
        [error.message, this.calculateNextRetry(0), failedVoucherId]
      );

      const retryCount = result.rows[0]?.retry_count || 0;

      MyLogger.info('Failed Voucher Retry Updated', {
        failedVoucherId,
        retryCount,
        nextRetryAt: this.calculateNextRetry(retryCount)
      });
    } catch (updateError) {
      MyLogger.error('Update Failed Voucher Retry', updateError, { failedVoucherId });
    }
  }

  /**
   * Mark failed voucher as resolved
   */
  async markFailedVoucherResolved(
    failedVoucherId: number,
    voucherId: number,
    resolvedBy: number,
    notes?: string
  ): Promise<void> {
    try {
      await pool.query(
        `UPDATE failed_voucher_queue 
         SET status = 'resolved',
             resolved_at = CURRENT_TIMESTAMP,
             resolved_by = $1,
             voucher_id = $2,
             resolution_notes = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [resolvedBy, voucherId, notes, failedVoucherId]
      );

      MyLogger.success('Failed Voucher Resolved', {
        failedVoucherId,
        voucherId,
        resolvedBy
      });
    } catch (error) {
      MyLogger.error('Mark Failed Voucher Resolved', error, { failedVoucherId, voucherId });
    }
  }

  /**
   * Mark failed voucher as abandoned (max retries exceeded)
   */
  async markFailedVoucherAbandoned(failedVoucherId: number): Promise<void> {
    try {
      await pool.query(
        `UPDATE failed_voucher_queue 
         SET status = 'abandoned',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [failedVoucherId]
      );

      MyLogger.warn('Failed Voucher Abandoned', { failedVoucherId });
    } catch (error) {
      MyLogger.error('Mark Failed Voucher Abandoned', error, { failedVoucherId });
    }
  }

  /**
   * Get event log entry by event ID
   */
  async getEventLogByEventId(eventId: string): Promise<EventLogEntry | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM factory_event_log WHERE event_id = $1',
        [eventId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      MyLogger.error('Get Event Log By Event ID', error, { eventId });
      return null;
    }
  }

  /**
   * Get event processing statistics
   */
  async getEventProcessingStats(): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM factory_event_processing_stats ORDER BY total_events DESC'
      );

      return result.rows;
    } catch (error) {
      MyLogger.error('Get Event Processing Stats', error);
      return [];
    }
  }

  /**
   * Get recent failed vouchers
   */
  async getRecentFailedVouchers(limit: number = 50): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM recent_failed_vouchers LIMIT $1',
        [limit]
      );

      return result.rows;
    } catch (error) {
      MyLogger.error('Get Recent Failed Vouchers', error);
      return [];
    }
  }

  /**
   * Determine failure category from error
   */
  determineFailureCategory(error: Error): FailedVoucherEntry['failureCategory'] {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('account') && errorMessage.includes('not') && errorMessage.includes('found')) {
      return 'missing_accounts';
    }

    if (errorMessage.includes('required accounts not configured')) {
      return 'missing_accounts';
    }

    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return 'validation_error';
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      return 'network_error';
    }

    return 'system_error';
  }
}

// Export singleton instance
export const factoryEventLogService = new FactoryEventLogService();

