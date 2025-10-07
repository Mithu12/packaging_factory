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
  const userId = req.user!.id;
  const params = req.query;

  const result = await GetMaterialConsumptionInfoMediator.getConsumptions(params, userId);

  res.status(200).json(serializeSuccessResponse(result));
});

/**
 * @desc    Get material consumption by ID
 * @route   GET /api/factory/material-consumptions/:id
 * @access  Private (FACTORY_CONSUMPTIONS_READ)
 */
export const getConsumptionById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const consumption = await GetMaterialConsumptionInfoMediator.getConsumptionById(id, userId);

  res.status(200).json(serializeSuccessResponse(consumption));
});

/**
 * @desc    Create material consumption
 * @route   POST /api/factory/material-consumptions
 * @access  Private (FACTORY_CONSUMPTIONS_CREATE)
 */
export const createConsumption = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const data = req.body;

  const consumption = await AddMaterialConsumptionMediator.execute(data, userId);

  res.status(201).json(serializeSuccessResponse(consumption));
});

/**
 * @desc    Get material consumption stats
 * @route   GET /api/factory/material-consumptions/stats
 * @access  Private (FACTORY_CONSUMPTIONS_READ)
 */
export const getConsumptionStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const stats = await GetMaterialConsumptionInfoMediator.getConsumptionStats(userId);

  res.status(200).json(serializeSuccessResponse(stats));
});

