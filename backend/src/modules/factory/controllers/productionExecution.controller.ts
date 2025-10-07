import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { AddProductionRunMediator } from '../mediators/productionExecution/AddProductionRun.mediator';
import { GetProductionRunInfoMediator } from '../mediators/productionExecution/GetProductionRunInfo.mediator';
import { UpdateProductionRunStatusMediator } from '../mediators/productionExecution/UpdateProductionRunStatus.mediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';

/**
 * @desc    Get all production runs
 * @route   GET /api/factory/production-runs
 * @access  Private (FACTORY_PRODUCTION_RUNS_READ)
 */
export const getProductionRuns = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const params = req.query;

  const result = await GetProductionRunInfoMediator.getProductionRuns(params, userId);

  res.status(200).json(serializeSuccessResponse(result));
});

/**
 * @desc    Get production run by ID
 * @route   GET /api/factory/production-runs/:id
 * @access  Private (FACTORY_PRODUCTION_RUNS_READ)
 */
export const getProductionRunById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const productionRun = await GetProductionRunInfoMediator.getProductionRunById(id, userId);

  res.status(200).json(serializeSuccessResponse(productionRun));
});

/**
 * @desc    Create production run
 * @route   POST /api/factory/production-runs
 * @access  Private (FACTORY_PRODUCTION_RUNS_CREATE)
 */
export const createProductionRun = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const data = req.body;

  const productionRun = await AddProductionRunMediator.execute(data, userId);

  res.status(201).json(serializeSuccessResponse(productionRun));
});

/**
 * @desc    Start production run
 * @route   POST /api/factory/production-runs/:id/start
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
export const startProductionRun = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const result = await UpdateProductionRunStatusMediator.startProductionRun(id, userId);

  res.status(200).json(serializeSuccessResponse(result));
});

/**
 * @desc    Pause production run
 * @route   POST /api/factory/production-runs/:id/pause
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
export const pauseProductionRun = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user!.id;

  const result = await UpdateProductionRunStatusMediator.pauseProductionRun(id, userId, notes);

  res.status(200).json(serializeSuccessResponse(result));
});

/**
 * @desc    Complete production run
 * @route   POST /api/factory/production-runs/:id/complete
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
export const completeProductionRun = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;
  const userId = req.user!.id;

  const result = await UpdateProductionRunStatusMediator.completeProductionRun(id, data, userId);

  res.status(200).json(serializeSuccessResponse(result));
});

/**
 * @desc    Record downtime
 * @route   POST /api/factory/production-runs/downtime
 * @access  Private (FACTORY_PRODUCTION_RUNS_UPDATE)
 */
export const recordDowntime = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const data = req.body;

  const downtime = await UpdateProductionRunStatusMediator.recordDowntime(data, userId);

  res.status(201).json(serializeSuccessResponse(downtime));
});

/**
 * @desc    Get production run stats
 * @route   GET /api/factory/production-runs/stats
 * @access  Private (FACTORY_PRODUCTION_RUNS_READ)
 */
export const getProductionRunStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const stats = await GetProductionRunInfoMediator.getProductionRunStats(userId);

  res.status(200).json(serializeSuccessResponse(stats));
});

