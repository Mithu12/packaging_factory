import { Request, Response } from 'express';
import { ReturnsMediator } from '@/mediators/returns/ReturnsMediator';
import { MyLogger } from '@/utils/new-logger';
import { serializeSuccessResponse } from '@/utils/responseHelper';

export class ReturnsController {
  
  // Get all returns with pagination and filtering
  static async getAllReturns(req: Request, res: Response) {
    const action = 'ReturnsController.getAllReturns';
    try {
      MyLogger.info(action, { query: req.query });
      
      const returns = await ReturnsMediator.getAllReturns(req.query);
      
      MyLogger.success(action, { count: returns.data?.length || 0 });
      serializeSuccessResponse(res, returns, 'Returns fetched successfully');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Get return statistics
  static async getReturnStats(req: Request, res: Response) {
    const action = 'ReturnsController.getReturnStats';
    try {
      MyLogger.info(action, { query: req.query });
      
      const stats = await ReturnsMediator.getReturnStats(req.query);
      
      MyLogger.success(action, { stats });
      serializeSuccessResponse(res, stats, 'Return statistics fetched successfully');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Check return eligibility for an order
  static async checkReturnEligibility(req: Request, res: Response) {
    const action = 'ReturnsController.checkReturnEligibility';
    try {
      const orderId = parseInt(req.params.orderId);
      MyLogger.info(action, { orderId });
      
      const eligibility = await ReturnsMediator.checkReturnEligibility(orderId);
      
      MyLogger.success(action, { orderId, eligible: eligibility.eligible });
      serializeSuccessResponse(res, eligibility, 'Return eligibility checked successfully');
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
      MyLogger.info(action, { customerId });
      
      const returns = await ReturnsMediator.getReturnsByCustomer(customerId, req.query);
      
      MyLogger.success(action, { customerId, count: returns.length });
      serializeSuccessResponse(res, returns, 'Returns by customer fetched successfully');
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
      MyLogger.info(action, { orderId });
      
      const returns = await ReturnsMediator.getReturnsByOrder(orderId);
      
      MyLogger.success(action, { orderId, count: returns.length });
      serializeSuccessResponse(res, returns, 'Returns by order fetched successfully');
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
      MyLogger.info(action, { returnId });
      
      const salesReturn = await ReturnsMediator.getReturnById(returnId);
      
      MyLogger.success(action, { returnId });
      serializeSuccessResponse(res, salesReturn, 'Return fetched successfully');
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }
  
  // Create a new return
  static async createReturn(req: Request, res: Response) {
    const action = 'ReturnsController.createReturn';
    try {
      MyLogger.info(action, { 
        original_order_id: req.body.original_order_id,
        return_type: req.body.return_type,
        items_count: req.body.items?.length || 0
      });
      
      const returnData = await ReturnsMediator.createReturn(req.body, req.user?.user_id);
      
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

  // Process return (approve/reject)
  static async processReturn(req: Request, res: Response) {
    const action = 'ReturnsController.processReturn';
    try {
      const returnId = parseInt(req.params.id);
      const userId = req.user?.user_id;
      
      MyLogger.info(action, { 
        returnId, 
        return_status: req.body.return_status,
        processedBy: userId 
      });
      
      const updatedReturn = await ReturnsMediator.processReturn(returnId, req.body, userId);
      
      MyLogger.success(action, { 
        returnId, 
        newStatus: updatedReturn.return_status,
        processedBy: userId
      });
      
      serializeSuccessResponse(res, updatedReturn, 'Return processed successfully');
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
      const userId = req.user?.user_id;
      
      MyLogger.info(action, { returnId, completedBy: userId });
      
      const completedReturn = await ReturnsMediator.completeReturn(returnId, userId);
      
      MyLogger.success(action, { 
        returnId, 
        return_number: completedReturn.return_number,
        completedBy: userId
      });
      
      serializeSuccessResponse(res, completedReturn, 'Return completed and inventory updated successfully');
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
      const userId = req.user?.user_id;
      
      MyLogger.info(action, { 
        returnId, 
        return_status: req.body.return_status,
        updatedBy: userId 
      });
      
      const updatedReturn = await ReturnsMediator.updateReturnStatus(
        returnId, 
        req.body.return_status, 
        req.body.notes,
        userId
      );
      
      MyLogger.success(action, { 
        returnId, 
        newStatus: updatedReturn.return_status,
        updatedBy: userId
      });
      
      serializeSuccessResponse(res, updatedReturn, 'Return status updated successfully');
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
      const userId = req.user?.user_id;
      
      MyLogger.info(action, { 
        returnId, 
        refund_amount: req.body.refund_amount,
        refund_method: req.body.refund_method,
        processedBy: userId 
      });
      
      const refundTransaction = await ReturnsMediator.processRefund(returnId, req.body, userId);
      
      MyLogger.success(action, { 
        returnId, 
        refundTransactionId: refundTransaction.id,
        amount: refundTransaction.refund_amount,
        processedBy: userId
      });
      
      res.status(201).json({
        success: true,
        message: 'Refund processed successfully',
        data: refundTransaction
      });
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

export default ReturnsController;