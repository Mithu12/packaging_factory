import { Request, Response } from 'express';
import { ReturnsMediator } from '@/mediators/returns/ReturnsMediator';
import { MyLogger } from '@/utils/new-logger';
import { serializeSuccessResponse } from '@/utils/responseHelper';

export class ReturnsController {
  
  // Create a new return
  static async createReturn(req: Request, res: Response) {
    const action = 'ReturnsController.createReturn';
    try {
      MyLogger.info(action, { 
        original_order_id: req.body.original_order_id,
        return_type: req.body.return_type,
        items_count: req.body.items?.length || 0
      });
      
      const returnData = await ReturnsMediator.createReturn(req.body, req.user?.id);
      
      MyLogger.success(action, { 
        return_id: returnData.id, 
        return_number: returnData.return_number,
        total_refund_amount: returnData.total_refund_amount
      });
      
      res.status(201).json({
        success: true,
        message: 'Return created successfully',
        data: returnData
      });
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Get all returns with pagination and filtering
  static async getAllReturns(req: Request, res: Response) {
    const action = 'ReturnsController.getAllReturns';
    try {
      MyLogger.info(action, req.query);
      
      const result = await ReturnsMediator.getAllReturns(req.query);
      
      MyLogger.success(action, { 
        returns_count: result.returns.length,
        total_count: result.total,
        page: result.page
      });
      
      serializeSuccessResponse(res, result, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Get return by ID with full details
  static async getReturnById(req: Request, res: Response) {
    const action = 'ReturnsController.getReturnById';
    try {
      const returnId = parseInt(req.params.id);
      MyLogger.info(action, { return_id: returnId });
      
      const returnData = await ReturnsMediator.getReturnById(returnId);
      
      if (!returnData) {
        res.status(404).json({
          success: false,
          message: 'Return not found'
        });
        return;
      }
      
      MyLogger.success(action, { 
        return_id: returnId,
        return_number: returnData.return_number,
        status: returnData.return_status
      });
      
      serializeSuccessResponse(res, returnData, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Process return (approve/reject)
  static async processReturn(req: Request, res: Response) {
    const action = 'ReturnsController.processReturn';
    try {
      const returnId = parseInt(req.params.id);
      MyLogger.info(action, { 
        return_id: returnId, 
        return_status: req.body.return_status,
        authorized_by: req.user?.id
      });
      
      const returnData = await ReturnsMediator.processReturn(
        returnId, 
        req.body, 
        req.user?.id
      );
      
      MyLogger.success(action, { 
        return_id: returnId,
        return_number: returnData.return_number,
        new_status: returnData.return_status
      });
      
      serializeSuccessResponse(res, returnData, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Complete return with inventory updates
  static async completeReturn(req: Request, res: Response) {
    const action = 'ReturnsController.completeReturn';
    try {
      const returnId = parseInt(req.params.id);
      MyLogger.info(action, { return_id: returnId, processed_by: req.user?.id });
      
      const returnData = await ReturnsMediator.completeReturn(returnId, req.user?.id);
      
      MyLogger.success(action, { 
        return_id: returnId,
        return_number: returnData.return_number,
        final_refund_amount: returnData.final_refund_amount
      });
      
      serializeSuccessResponse(res, returnData, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Process refund transaction
  static async processRefund(req: Request, res: Response) {
    const action = 'ReturnsController.processRefund';
    try {
      const returnId = parseInt(req.params.id);
      MyLogger.info(action, { 
        return_id: returnId, 
        transaction_type: req.body.transaction_type,
        amount: req.body.amount
      });
      
      const transaction = await ReturnsMediator.processRefund(
        returnId, 
        req.body, 
        req.user?.id
      );
      
      MyLogger.success(action, { 
        return_id: returnId,
        transaction_id: transaction.id,
        amount: transaction.amount,
        status: transaction.transaction_status
      });
      
      serializeSuccessResponse(res, transaction, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Get return eligibility for an order
  static async checkReturnEligibility(req: Request, res: Response) {
    const action = 'ReturnsController.checkReturnEligibility';
    try {
      const orderId = parseInt(req.params.orderId);
      MyLogger.info(action, { order_id: orderId });
      
      const eligibility = await ReturnsMediator.checkReturnEligibility(orderId);
      
      MyLogger.success(action, { 
        order_id: orderId,
        eligible: eligibility.eligible,
        restrictions_count: eligibility.restrictions ? Object.keys(eligibility.restrictions).length : 0
      });
      
      serializeSuccessResponse(res, eligibility, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Get return statistics
  static async getReturnStats(req: Request, res: Response) {
    const action = 'ReturnsController.getReturnStats';
    try {
      MyLogger.info(action, req.query);
      
      const stats = await ReturnsMediator.getReturnStats(req.query);
      
      MyLogger.success(action, { 
        total_returns: stats.total_returns,
        total_refund_amount: stats.total_refund_amount,
        return_rate: stats.return_rate_percentage
      });
      
      serializeSuccessResponse(res, stats, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Update return status
  static async updateReturnStatus(req: Request, res: Response) {
    const action = 'ReturnsController.updateReturnStatus';
    try {
      const returnId = parseInt(req.params.id);
      const { return_status, notes } = req.body;
      
      MyLogger.info(action, { 
        return_id: returnId, 
        new_status: return_status,
        updated_by: req.user?.id
      });
      
      const returnData = await ReturnsMediator.updateReturnStatus(
        returnId, 
        return_status, 
        notes, 
        req.user?.id
      );
      
      MyLogger.success(action, { 
        return_id: returnId,
        return_number: returnData.return_number,
        new_status: returnData.return_status
      });
      
      serializeSuccessResponse(res, returnData, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Get returns by customer
  static async getReturnsByCustomer(req: Request, res: Response) {
    const action = 'ReturnsController.getReturnsByCustomer';
    try {
      const customerId = parseInt(req.params.customerId);
      MyLogger.info(action, { customer_id: customerId });
      
      const returns = await ReturnsMediator.getReturnsByCustomer(customerId, req.query);
      
      MyLogger.success(action, { 
        customer_id: customerId,
        returns_count: returns.length
      });
      
      serializeSuccessResponse(res, returns, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Get returns by original order
  static async getReturnsByOrder(req: Request, res: Response) {
    const action = 'ReturnsController.getReturnsByOrder';
    try {
      const orderId = parseInt(req.params.orderId);
      MyLogger.info(action, { order_id: orderId });
      
      const returns = await ReturnsMediator.getReturnsByOrder(orderId);
      
      MyLogger.success(action, { 
        order_id: orderId,
        returns_count: returns.length
      });
      
      serializeSuccessResponse(res, returns, 'SUCCESS');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}
