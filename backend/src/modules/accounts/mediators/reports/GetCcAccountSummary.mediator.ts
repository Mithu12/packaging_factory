import pool from "@/database/connection";
import { MediatorInterface } from "@/types";
import { MyLogger } from "@/utils/new-logger";

class GetCcAccountSummaryMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    let action = "Get CC Account Summary";
    const client = await pool.connect();
    try {
      MyLogger.info(action);

      // Get all posting accounts that have a cost center assigned
      const query = `
        SELECT 
          cc.id as "costCenterId",
          cc.name as "costCenterName",
          cc.code as "costCenterCode",
          coa.id as "accountId",
          coa.name as "accountName",
          coa.code as "accountCode",
          coa.category,
          coa.balance,
          coa.currency
        FROM cost_centers cc
        LEFT JOIN chart_of_accounts coa ON cc.id = coa.cost_center_id
        WHERE coa.id IS NOT NULL
        ORDER BY cc.name, coa.category, coa.name
      `;

      const result = await client.query(query);
      const rows = result.rows;

      // Group by cost center
      const summaryMap = new Map<number, any>();

      for (const row of rows) {
        if (!summaryMap.has(row.costCenterId)) {
          summaryMap.set(row.costCenterId, {
            costCenterId: row.costCenterId,
            costCenterName: row.costCenterName,
            costCenterCode: row.costCenterCode,
            accounts: [],
            totals: {
              assets: 0,
              liabilities: 0,
              equity: 0,
              revenue: 0,
              expenses: 0
            }
          });
        }

        const ccSummary = summaryMap.get(row.costCenterId);
        ccSummary.accounts.push({
          id: row.accountId,
          name: row.accountName,
          code: row.accountCode,
          category: row.category,
          balance: parseFloat(row.balance),
          currency: row.currency
        });

        // Update totals
        const category = row.category.toLowerCase();
        if (ccSummary.totals[category] !== undefined) {
          ccSummary.totals[category] += parseFloat(row.balance);
        }
      }

      const summary = Array.from(summaryMap.values());

      MyLogger.success(action, { ccCount: summary.length });
      return summary;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetCcAccountSummaryMediator();
