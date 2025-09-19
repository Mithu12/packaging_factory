import pool from '@/database/connection';
import { ApprovalHistory } from '@/types/purchaseOrder';
import { MyLogger } from '@/utils/new-logger';

export class ApprovalMediator {
    
    /**
     * Submit an entity for approval
     */
    static async submitForApproval(
        entityType: 'purchase_order' | 'payment' | 'expense',
        entityId: number,
        submittedBy: number,
        notes?: string
    ): Promise<void> {
        const action = 'ApprovalMediator.submitForApproval';
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            MyLogger.info(action, { entityType, entityId, submittedBy });

            // Get table name
            const tableName = this.getTableName(entityType);
            
            // Update entity approval status
            const updateQuery = `
                UPDATE ${tableName} 
                SET approval_status = 'submitted',
                    submitted_at = CURRENT_TIMESTAMP,
                    submitted_by = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND approval_status = 'draft'
            `;
            
            const result = await client.query(updateQuery, [submittedBy, entityId]);
            
            if (result.rowCount === 0) {
                throw new Error(`${entityType} with ID ${entityId} not found or not in draft status`);
            }

            // Record in approval history
            await this.recordApprovalHistory(
                client,
                entityType,
                entityId,
                'submitted',
                submittedBy,
                'draft',
                'submitted',
                notes
            );

            await client.query('COMMIT');
            MyLogger.success(action, { entityType, entityId, submittedBy });
            
        } catch (error) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error, { entityType, entityId, submittedBy });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Approve or reject an entity
     */
    static async processApproval(
        entityType: 'purchase_order' | 'payment' | 'expense',
        entityId: number,
        approvedBy: number,
        action: 'approve' | 'reject',
        notes?: string
    ): Promise<void> {
        const mediatorAction = 'ApprovalMediator.processApproval';
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            MyLogger.info(mediatorAction, { entityType, entityId, approvedBy, action });

            // Get table name
            const tableName = this.getTableName(entityType);
            
            // Determine new status
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            
            // Update entity approval status
            const updateQuery = `
                UPDATE ${tableName} 
                SET approval_status = $1,
                    approved_at = CURRENT_TIMESTAMP,
                    approved_by = $2,
                    approval_notes = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $4 AND approval_status = 'submitted'
            `;
            
            const result = await client.query(updateQuery, [newStatus, approvedBy, notes, entityId]);
            
            if (result.rowCount === 0) {
                throw new Error(`${entityType} with ID ${entityId} not found or not in submitted status`);
            }

            // Record in approval history
            await this.recordApprovalHistory(
                client,
                entityType,
                entityId,
                action === 'approve' ? 'approved' : 'rejected',
                approvedBy,
                'submitted',
                newStatus,
                notes
            );

            await client.query('COMMIT');
            MyLogger.success(mediatorAction, { entityType, entityId, approvedBy, action, newStatus });
            
        } catch (error) {
            await client.query('ROLLBACK');
            MyLogger.error(mediatorAction, error, { entityType, entityId, approvedBy, action });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get approval history for an entity
     */
    static async getApprovalHistory(
        entityType: 'purchase_order' | 'payment' | 'expense',
        entityId: number
    ): Promise<ApprovalHistory[]> {
        const action = 'ApprovalMediator.getApprovalHistory';
        
        try {
            MyLogger.info(action, { entityType, entityId });

            const query = `
                SELECT 
                    ah.*,
                    u.full_name as performer_name
                FROM approval_history ah
                LEFT JOIN users u ON ah.performed_by = u.id
                WHERE ah.entity_type = $1 AND ah.entity_id = $2
                ORDER BY ah.performed_at DESC
            `;
            
            const result = await pool.query(query, [entityType, entityId]);
            
            MyLogger.success(action, { entityType, entityId, historyCount: result.rows.length });
            return result.rows;
            
        } catch (error) {
            MyLogger.error(action, error, { entityType, entityId });
            throw error;
        }
    }

    /**
     * Get entities pending approval for a specific role
     */
    static async getPendingApprovals(
        entityType: 'purchase_order' | 'payment' | 'expense',
        userRole: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{
        entities: any[];
        total: number;
        page: number;
        limit: number;
    }> {
        const action = 'ApprovalMediator.getPendingApprovals';
        
        try {
            MyLogger.info(action, { entityType, userRole, page, limit });

            // Only admin and accounts can approve
            if (!['admin', 'accounts'].includes(userRole)) {
                return { entities: [], total: 0, page, limit };
            }

            const tableName = this.getTableName(entityType);
            const offset = (page - 1) * limit;
            
            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM ${tableName}
                WHERE approval_status = 'submitted'
            `;
            const countResult = await pool.query(countQuery);
            const total = parseInt(countResult.rows[0].total);

            // Get entities
            let selectFields = this.getSelectFields(entityType);
            const query = `
                SELECT ${selectFields}
                FROM ${tableName} e
                LEFT JOIN users u ON e.submitted_by = u.id
                WHERE e.approval_status = 'submitted'
                ORDER BY e.submitted_at ASC
                LIMIT $1 OFFSET $2
            `;
            
            const result = await pool.query(query, [limit, offset]);
            
            MyLogger.success(action, { entityType, userRole, total, entitiesCount: result.rows.length });
            
            return {
                entities: result.rows,
                total,
                page,
                limit
            };
            
        } catch (error) {
            MyLogger.error(action, error, { entityType, userRole, page, limit });
            throw error;
        }
    }

    /**
     * Check if user can approve entity type
     */
    static canApprove(userRole: string): boolean {
        return ['admin', 'accounts'].includes(userRole);
    }

    /**
     * Check if user can submit entity type
     */
    static canSubmit(userRole: string): boolean {
        return ['admin', 'manager', 'accounts', 'employee'].includes(userRole);
    }

    // Private helper methods
    private static getTableName(entityType: 'purchase_order' | 'payment' | 'expense'): string {
        switch (entityType) {
            case 'purchase_order':
                return 'purchase_orders';
            case 'payment':
                return 'payments';
            case 'expense':
                return 'expenses';
            default:
                throw new Error(`Unknown entity type: ${entityType}`);
        }
    }

    private static getSelectFields(entityType: 'purchase_order' | 'payment' | 'expense'): string {
        switch (entityType) {
            case 'purchase_order':
                return `
                    e.*,
                    u.full_name as submitted_by_name,
                    s.name as supplier_name
                `;
            case 'payment':
                return `
                    e.*,
                    u.full_name as submitted_by_name,
                    s.name as supplier_name
                `;
            case 'expense':
                return `
                    e.*,
                    u.full_name as submitted_by_name,
                    ec.name as category_name
                `;
            default:
                return 'e.*';
        }
    }

    private static async recordApprovalHistory(
        client: any,
        entityType: 'purchase_order' | 'payment' | 'expense',
        entityId: number,
        action: 'submitted' | 'approved' | 'rejected' | 'revised',
        performedBy: number,
        previousStatus?: string,
        newStatus?: string,
        notes?: string
    ): Promise<void> {
        const insertQuery = `
            INSERT INTO approval_history (
                entity_type,
                entity_id,
                action,
                performed_by,
                previous_status,
                new_status,
                notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        await client.query(insertQuery, [
            entityType,
            entityId,
            action,
            performedBy,
            previousStatus,
            newStatus,
            notes
        ]);
    }
}
