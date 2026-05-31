import { Request, Response } from 'express';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { ChequeMediator } from '../mediators/cheques/Cheque.mediator';
import { ChequeQueryParams, CreateChequeRequest } from '@/types/accounts';

export const getAllCheques = async (req: Request, res: Response) => {
  const query = req.query as unknown as ChequeQueryParams;
  MyLogger.info('GET /api/accounts/cheques', { query });
  const result = await ChequeMediator.list({
    page: query.page ? Number(query.page) : undefined,
    limit: query.limit ? Number(query.limit) : undefined,
    status: query.status,
    instrument_type: query.instrument_type,
    bank_account_id: query.bank_account_id ? Number(query.bank_account_id) : undefined,
    search: (query as any).search,
  });
  serializeSuccessResponse(res, result, 'SUCCESS');
};

export const getChequeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const cheque = await ChequeMediator.getById(Number(id));
  if (!cheque) {
    res.status(404);
    serializeSuccessResponse(res, null, 'Cheque not found');
    return;
  }
  serializeSuccessResponse(res, cheque, 'SUCCESS');
};

export const createCheque = async (req: Request, res: Response) => {
  const data: CreateChequeRequest = req.body;
  const userId = req.user?.user_id || 1;
  MyLogger.info('POST /api/accounts/cheques', { data, userId });
  const cheque = await ChequeMediator.create(data, userId);
  res.status(201);
  serializeSuccessResponse(res, cheque, 'SUCCESS');
};

export const updateChequeStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, cleared_date } = req.body as { status: any; cleared_date?: string };
  const userId = req.user?.user_id || 1;
  MyLogger.info('PUT /api/accounts/cheques/:id/status', { id, status, userId });
  const cheque = await ChequeMediator.updateStatus(Number(id), status, cleared_date, userId);
  serializeSuccessResponse(res, cheque, 'SUCCESS');
};
