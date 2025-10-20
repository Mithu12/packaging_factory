import { RouteOrderRequest, FactoryCapacity } from '@/types/factory';

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
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Factory Routing System', () => {
  describe('RouteOrderRequest interface', () => {
    it('should have correct structure for factory routing', () => {
      const routeRequest: RouteOrderRequest = {
        order_id: 123,
        factory_id: '5',
        notes: 'Routing to Factory A for production'
      };

      expect(routeRequest.order_id).toBe(123);
      expect(routeRequest.factory_id).toBe('5');
      expect(routeRequest.notes).toBe('Routing to Factory A for production');
    });
  });

  describe('FactoryCapacity interface', () => {
    it('should have correct structure for capacity information', () => {
      const capacity: FactoryCapacity = {
        factory_id: 5,
        factory_name: 'Factory A',
        factory_code: 'FA001',
        current_orders: 10,
        active_work_orders: 25,
        production_lines_count: 4,
        available_production_lines: 2,
        capacity_utilization: 75.5,
        estimated_completion_date: '2025-01-15T10:00:00Z',
        is_over_capacity: false,
        warning_message: undefined
      };

      expect(capacity.factory_id).toBe(5);
      expect(capacity.factory_name).toBe('Factory A');
      expect(capacity.capacity_utilization).toBe(75.5);
      expect(capacity.is_over_capacity).toBe(false);
    });

    it('should handle over-capacity scenarios', () => {
      const overCapacityFactory: FactoryCapacity = {
        factory_id: 3,
        factory_name: 'Factory B',
        factory_code: 'FB001',
        current_orders: 50,
        active_work_orders: 100,
        production_lines_count: 2,
        available_production_lines: 0,
        capacity_utilization: 95.0,
        is_over_capacity: true,
        warning_message: 'No production lines available'
      };

      expect(overCapacityFactory.is_over_capacity).toBe(true);
      expect(overCapacityFactory.warning_message).toBe('No production lines available');
    });
  });
});