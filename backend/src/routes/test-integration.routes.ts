import express from 'express';
import { moduleRegistry, MODULE_NAMES } from '@/utils/moduleRegistry';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { accountsIntegrationService } from '@/services/accountsIntegrationService';
import { MyLogger } from '@/utils/new-logger';
import { serializeSuccessResponse } from '@/utils/responseHelper';

const router = express.Router();

// Test endpoint to check module status
router.get('/modules', async (req, res) => {
  try {
    const availableModules = moduleRegistry.getAvailableModules();
    const accountsServices = moduleRegistry.getModuleServices(MODULE_NAMES.ACCOUNTS);
    const expensesServices = moduleRegistry.getModuleServices(MODULE_NAMES.EXPENSES);
    
    const status = {
      availableModules,
      accountsModule: {
        available: moduleRegistry.isModuleAvailable(MODULE_NAMES.ACCOUNTS),
        services: accountsServices ? Object.keys(accountsServices) : []
      },
      expensesModule: {
        available: moduleRegistry.isModuleAvailable(MODULE_NAMES.EXPENSES),
        services: expensesServices ? Object.keys(expensesServices) : []
      },
      eventBus: {
        registeredEvents: eventBus.getEventNames(),
        expenseApprovedListeners: eventBus.getListenerCount(EVENT_NAMES.EXPENSE_APPROVED)
      }
    };
    
    MyLogger.info('Test Integration Status', status);
    serializeSuccessResponse(res, status, 'SUCCESS');
  } catch (error) {
    MyLogger.error('Test Integration Status', error);
    res.status(500).json({ error: 'Failed to get integration status' });
  }
});

// Test endpoint to manually trigger expense integration
router.post('/trigger-expense-integration', async (req, res) => {
  try {
    const { expenseId } = req.body;
    
    if (!expenseId) {
      return res.status(400).json({ error: 'expenseId is required' });
    }
    
    MyLogger.info('Manual Integration Trigger', { expenseId });
    
    // Mock expense data for testing
    const mockExpenseData = {
      expenseId: parseInt(expenseId),
      expenseNumber: `EXP-${expenseId.toString().padStart(6, '0')}`,
      title: 'Test Expense for Integration',
      amount: 100.00,
      currency: 'BDT',
      expenseDate: new Date().toISOString().split('T')[0],
      categoryName: 'General',
      vendorName: 'Test Vendor',
      department: 'IT',
      project: 'Test Project',
      notes: 'Test expense for integration',
      createdBy: 1
    };
    
    // Check if integration is possible
    const canIntegrate = accountsIntegrationService.canIntegrateExpense(mockExpenseData);
    MyLogger.info('Integration Check', { expenseId, canIntegrate });
    
    if (!canIntegrate) {
      return serializeSuccessResponse(res, { 
        success: false, 
        message: 'Cannot integrate expense - accounts module not available or missing data' 
      }, 'INTEGRATION_NOT_POSSIBLE');
    }
    
    // Try to create voucher
    const result = await accountsIntegrationService.createExpenseVoucher(mockExpenseData);
    
    MyLogger.success('Manual Integration Result', { expenseId, result });
    serializeSuccessResponse(res, result, 'SUCCESS');
    
  } catch (error) {
    MyLogger.error('Manual Integration Trigger', error);
    res.status(500).json({ error: 'Failed to trigger integration' });
  }
});

// Test endpoint to emit expense approved event
router.post('/emit-expense-event', async (req, res) => {
  try {
    const { expenseId } = req.body;
    
    if (!expenseId) {
      return res.status(400).json({ error: 'expenseId is required' });
    }
    
    MyLogger.info('Manual Event Emission', { expenseId });
    
    // Mock expense data
    const mockExpenseData = {
      expenseId: parseInt(expenseId),
      expenseNumber: `EXP-${expenseId.toString().padStart(6, '0')}`,
      title: 'Test Expense for Event',
      amount: 150.00,
      currency: 'BDT',
      expenseDate: new Date().toISOString().split('T')[0],
      categoryName: 'General',
      vendorName: 'Test Vendor',
      department: 'IT',
      project: 'Test Project',
      notes: 'Test expense for event emission',
      createdBy: 1
    };
    
    // Emit the event
    await eventBus.emit(EVENT_NAMES.EXPENSE_APPROVED, {
      expenseData: mockExpenseData,
      userId: 1,
      timestamp: new Date().toISOString()
    });
    
    MyLogger.success('Event Emitted', { expenseId, event: EVENT_NAMES.EXPENSE_APPROVED });
    serializeSuccessResponse(res, { 
      success: true, 
      message: 'Event emitted successfully',
      event: EVENT_NAMES.EXPENSE_APPROVED,
      listeners: eventBus.getListenerCount(EVENT_NAMES.EXPENSE_APPROVED)
    }, 'SUCCESS');
    
  } catch (error) {
    MyLogger.error('Manual Event Emission', error);
    res.status(500).json({ error: 'Failed to emit event' });
  }
});

export default router;

