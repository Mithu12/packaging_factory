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