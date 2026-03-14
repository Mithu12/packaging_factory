import { Request, Response } from 'express';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import GetVoucherFailuresMediator, {
  VoucherFailureQueryParams,
} from '../mediators/voucherFailures/GetVoucherFailures.mediator';

export const getVoucherFailures = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as VoucherFailureQueryParams;
  MyLogger.info('GET /api/accounts/voucher-failures', { query });

  const result = await GetVoucherFailuresMediator.getVoucherFailures(query);

  MyLogger.success('GET /api/accounts/voucher-failures', {
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  });

  serializeSuccessResponse(res, result, 'SUCCESS');
};
