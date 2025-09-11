export interface MediatorInterface{
    process(data:any): Promise<any>
}

// Export all types
export * from './supplier';
export * from './category';
export * from './product';
export * from './stockAdjustment';
export * from './purchaseOrder';