import { Request } from 'express';
import { UserRole } from './auth';

// Extend Express Request interface to include user property added by auth middleware
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number;
        username: string;
        role: UserRole;
        role_id?: number;
        permissions?: string[];
        factory_id?: number;
        distribution_center_id?: number;
      };
    }
  }
}

export interface MediatorInterface{
    process(data:any): Promise<any>
}

// Export all types
export * from './supplier';
export * from './category';
export * from './purchaseOrder';
export * from './auth';
export * from './brand';

// Export product types (includes StockAdjustment from product.ts)
export * from './product';

// Export additional stock adjustment types with explicit re-exports to avoid conflicts
export type {
  CreateStockAdjustmentRequest,
  StockAdjustmentQueryParams,
  StockAdjustmentStats
} from './stockAdjustment';

// Export HRM types
export * from './hrm';