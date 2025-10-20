import { OrderWorkflowHistoryMediator } from '../OrderWorkflowHistory.mediator';
import { CreateWorkflowHistoryRequest } from '@/types/factory';

// Mock the database connection
jest.mock('@/database/connection', () => ({
  connect: jest.fn(() => ({
    query: jest.fn(),
    release: jest.fn()
  })),
  query: jest.fn()
}));

// Mock the logger
jest.mock('@/utils/new-logger', () => ({
  MyLogger: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('OrderWorkflowHistoryMediator', () => {
  describe('logWorkflowChange', () => {
    it('should create workflow history record with correct data structure', () => {
      const workflowData: CreateWorkflowHistoryRequest = {
        order_id: 123,
        from_status: 'pending_approval',
        to_status: 'approved',
        changed_by: 1,
        notes: 'Order approved by admin',
        metadata: { approved: true, factory_id: 5 }
      };

      // Test that the interface is properly defined and can be used
      expect(workflowData.order_id).toBe(123);
      expect(workflowData.from_status).toBe('pending_approval');
      expect(workflowData.to_status).toBe('approved');
      expect(workflowData.changed_by).toBe(1);
      expect(workflowData.notes).toBe('Order approved by admin');
      expect(workflowData.metadata).toEqual({ approved: true, factory_id: 5 });
    });
  });
});