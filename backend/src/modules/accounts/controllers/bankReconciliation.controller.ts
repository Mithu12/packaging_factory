import { Request, Response } from 'express';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { BankReconciliationMediator } from '../mediators/bankReconciliation/BankReconciliation.mediator';
import { SaveReconciliationRequest } from '@/types/accounts';

export const getReconciliationEntries = async (req: Request, res: Response) => {
  const bankAccountId = Number(req.query.bank_account_id);
  const statementDate = String(req.query.statement_date);
  MyLogger.info('GET /api/accounts/bank-reconciliation/entries', { bankAccountId, statementDate });
  const result = await BankReconciliationMediator.start(bankAccountId, statementDate);
  serializeSuccessResponse(res, result, 'SUCCESS');
};

export const saveReconciliation = async (req: Request, res: Response) => {
  const data: SaveReconciliationRequest = req.body;
  const userId = req.user?.user_id || 1;
  MyLogger.info('POST /api/accounts/bank-reconciliation', { data, userId });
  const result = await BankReconciliationMediator.save(data, userId);
  res.status(201);
  serializeSuccessResponse(res, result, 'SUCCESS');
};

export const listReconciliations = async (req: Request, res: Response) => {
  const result = await BankReconciliationMediator.list({
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    bank_account_id: req.query.bank_account_id ? Number(req.query.bank_account_id) : undefined,
    status: (req.query.status as string) || undefined,
  });
  serializeSuccessResponse(res, result, 'SUCCESS');
};

export const getReconciliationById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await BankReconciliationMediator.getById(Number(id));
  if (!result) {
    res.status(404);
    serializeSuccessResponse(res, null, 'Reconciliation not found');
    return;
  }
  serializeSuccessResponse(res, result, 'SUCCESS');
};
