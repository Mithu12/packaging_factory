import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AddMaterialConsumptionMediator } from '../mediators/materialConsumptions/AddMaterialConsumption.mediator';
import { GetMaterialConsumptionInfoMediator } from '../mediators/materialConsumptions/GetMaterialConsumptionInfo.mediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';

/**
 * @desc    Get all material consumptions
 * @route   GET /api/factory/material-consumptions
 * @access  Private (FACTORY_CONSUMPTIONS_READ)
 */
export const getConsumptions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.user_id;
  const params = req.query;

  const result = await GetMaterialConsumptionInfoMediator.getConsumptions(params, userId);

  serializeSuccessResponse(res, result, 'Material consumptions retrieved successfully');
});

/**
 * @desc    Get material consumption by ID
 * @route   GET /api/factory/material-consumptions/:id
 * @access  Private (FACTORY_CONSUMPTIONS_READ)
 */
export const getConsumptionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.user_id;

  const consumption = await GetMaterialConsumptionInfoMediator.getConsumptionById(id, userId);

  serializeSuccessResponse(res, consumption, 'Material consumption retrieved successfully');
});

/**
 * @desc    Create material consumption
 * @route   POST /api/factory/material-consumptions
 * @access  Private (FACTORY_CONSUMPTIONS_CREATE)
 */
export const createConsumption = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.user_id;
  const data = req.body;

  const consumption = await AddMaterialConsumptionMediator.recordConsumption(data, userId);

  res.status(201);
  serializeSuccessResponse(res, consumption, 'Material consumption created successfully');
});

/**
 * @desc    Get material consumption stats
 * @route   GET /api/factory/material-consumptions/stats
 * @access  Private (FACTORY_CONSUMPTIONS_READ)
 */
export const getConsumptionStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.user_id;

  const stats = await GetMaterialConsumptionInfoMediator.getConsumptionStats(userId);

  serializeSuccessResponse(res, stats, 'Material consumption statistics retrieved successfully');
});

