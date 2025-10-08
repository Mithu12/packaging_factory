import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { MaterialWastageMediator } from '../mediators/wastage/MaterialWastageMediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';

/**
 * @desc    Get all wastage records
 * @route   GET /api/factory/wastage
 * @access  Private (FACTORY_WASTAGE_READ)
 */
export const getWastageRecords = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.user_id;
  const params = req.query;

  const result = await MaterialWastageMediator.getWastageRecords(params, userId);

  serializeSuccessResponse(res, result, 'Wastage records retrieved successfully');
});

/**
 * @desc    Get wastage record by ID
 * @route   GET /api/factory/wastage/:id
 * @access  Private (FACTORY_WASTAGE_READ)
 */
export const getWastageById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.user_id;

  const wastage = await MaterialWastageMediator.getWastageById(id, userId);

  serializeSuccessResponse(res, wastage, 'Wastage record retrieved successfully');
});

/**
 * @desc    Approve wastage record
 * @route   POST /api/factory/wastage/:id/approve
 * @access  Private (FACTORY_WASTAGE_APPROVE)
 */
export const approveWastage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user!.user_id;

  const result = await MaterialWastageMediator.approveWastage(id, userId, notes);

  serializeSuccessResponse(res, result, 'Wastage approved successfully');
});

/**
 * @desc    Reject wastage record
 * @route   POST /api/factory/wastage/:id/reject
 * @access  Private (FACTORY_WASTAGE_REJECT)
 */
export const rejectWastage = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user!.user_id;

  const result = await MaterialWastageMediator.rejectWastage(id, userId, notes);

  serializeSuccessResponse(res, result, 'Wastage rejected successfully');
});

/**
 * @desc    Get wastage stats
 * @route   GET /api/factory/wastage/stats
 * @access  Private (FACTORY_WASTAGE_READ)
 */
export const getWastageStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.user_id;

  const stats = await MaterialWastageMediator.getWastageStats(userId);

  serializeSuccessResponse(res, stats, 'Wastage statistics retrieved successfully');
});

