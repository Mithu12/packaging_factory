import pool from "@/database/connection";
import { MediatorInterface } from "@/types";
import { MyLogger } from "@/utils/new-logger";
import { AccountNodeType } from "@/types/accounts";

interface GenerateCcAccountsRequest {
  costCenterId?: number; // If provided, only generate for this CC. Otherwise all.
}

class GenerateCcAccountsMediator implements MediatorInterface {
  async process(data: GenerateCcAccountsRequest): Promise<any> {
    let action = "Generate CC-specific Accounts";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      MyLogger.info(action, { costCenterId: data.costCenterId });

      // 1. Get all leaf accounts without a cost_center_id
      // These are the "global templates"
      const templateResult = await client.query(
        `SELECT * FROM chart_of_accounts 
         WHERE cost_center_id IS NULL 
         AND status = 'Active'
         AND id NOT IN (SELECT DISTINCT parent_id FROM chart_of_accounts WHERE parent_id IS NOT NULL)`
      );
      const templates = templateResult.rows;

      // 2. Get active cost centers
      let ccQuery = "SELECT id, name, code FROM cost_centers WHERE status = 'Active'";
      let ccParams: any[] = [];
      if (data.costCenterId) {
        ccQuery += " AND id = $1";
        ccParams.push(data.costCenterId);
      }
      const ccResult = await client.query(ccQuery, ccParams);
      const costCenters = ccResult.rows;

      let createdCount = 0;
      let convertedToControl = 0;

      for (const template of templates) {
        // Convert template to Control if it's not already
        // Wait, if it has ledger entries, we might need caution, 
        // but typically in this model the parent becomes the aggregator.
        await client.query(
          "UPDATE chart_of_accounts SET type = 'Control' WHERE id = $1",
          [template.id]
        );
        convertedToControl++;

        for (const cc of costCenters) {
          // Check if CC-specific account already exists
          const existing = await client.query(
            "SELECT id FROM chart_of_accounts WHERE parent_id = $1 AND cost_center_id = $2",
            [template.id, cc.id]
          );

          if (existing.rows.length === 0) {
            const ccCode = `${template.code}-${cc.code}`;
            const ccName = `${template.name} - ${cc.name}`;

            await client.query(
              `INSERT INTO chart_of_accounts (
                name, code, type, category, parent_id, group_id, 
                balance, currency, status, notes, cost_center_id
              ) VALUES ($1, $2, 'Posting', $3, $4, $5, 0, $6, 'Active', $7, $8)`,
              [
                ccName,
                ccCode,
                template.category,
                template.id,
                template.group_id,
                template.currency,
                `Auto-generated for cost center ${cc.name}`,
                cc.id
              ]
            );
            createdCount++;
          }
        }
      }

      await client.query("COMMIT");
      MyLogger.success(action, { createdCount, convertedToControl });
      return {
        message: `Generated ${createdCount} accounts across ${costCenters.length} cost centers.`,
        createdCount,
        convertedToControl
      };
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GenerateCcAccountsMediator();
