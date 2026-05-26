import {
  BalanceSheetQueryParams,
  BalanceSheetResponse,
  BalanceSheetSection,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";

export class GetBalanceSheetMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  static async getBalanceSheet(params: BalanceSheetQueryParams): Promise<BalanceSheetResponse> {
    const action = 'Get Balance Sheet';
    try {
      MyLogger.info(action, { params });

      const {
        asOfDate,
        costCenterId,
        format = 'consolidated'
      } = params;

      // Set default date if not provided (current date)
      const defaultAsOfDate = asOfDate || new Date().toISOString().split('T')[0];

      // Build the main query to get account balances as of the specified date.
      // Assets carry a natural debit balance, Liabilities and Equity a natural
      // credit balance, so balances are sign-normalized per category to come out
      // positive. The category CHECK constraint only permits the five base
      // categories, so Current vs Non-current is derived from the account code
      // prefix (Assets 15xx-19xx = Non-current; Liabilities 25xx-29xx = Non-current).
      const query = `
        WITH account_balances AS (
          SELECT
            coa.id,
            coa.code,
            coa.name,
            coa.category,
            coa.type,
            coa.parent_id,
            -- Calculate balance as of the specified date, sign-normalized per category
            COALESCE(
              (SELECT SUM(
                 CASE WHEN coa.category = 'Assets'
                      THEN le.debit - le.credit
                      ELSE le.credit - le.debit
                 END)
               FROM ledger_entries le
               JOIN vouchers v ON le.voucher_id = v.id
               WHERE le.account_id = coa.id
               AND v.date <= $1
               AND v.status = 'Posted'
               ${costCenterId ? 'AND le.cost_center_id = $2' : ''}
              ),
              0
            ) as balance
          FROM chart_of_accounts coa
          WHERE coa.type = 'Posting'
            AND coa.category IN ('Assets', 'Liabilities', 'Equity')
        ),
        categorized_accounts AS (
          SELECT
            *,
            category as balance_sheet_category,
            CASE
              WHEN category = 'Assets' AND code ~ '^1[5-9]' THEN 'Non-current Assets'
              WHEN category = 'Assets' THEN 'Current Assets'
              WHEN category = 'Liabilities' AND code ~ '^2[5-9]' THEN 'Non-current Liabilities'
              WHEN category = 'Liabilities' THEN 'Current Liabilities'
              ELSE 'Equity'
            END as subcategory
          FROM account_balances
          WHERE balance != 0
        )
        SELECT
          balance_sheet_category,
          subcategory,
          category,
          name,
          balance
        FROM categorized_accounts
        ORDER BY
          CASE balance_sheet_category
            WHEN 'Assets' THEN 1
            WHEN 'Liabilities' THEN 2
            WHEN 'Equity' THEN 3
          END,
          subcategory,
          name
      `;

      const values = costCenterId
        ? [defaultAsOfDate, costCenterId]
        : [defaultAsOfDate];

      const result = await pool.query(query, values);
      const accounts = result.rows;

      // Retained earnings: cumulative net income (Revenue credits less Expense
      // debits) for all posted vouchers up to the as-of date. P&L accounts are not
      // on the balance sheet, but their net must roll into equity for it to balance.
      const retainedEarningsQuery = `
        SELECT COALESCE(SUM(le.credit - le.debit), 0) as retained_earnings
        FROM ledger_entries le
        JOIN vouchers v ON le.voucher_id = v.id
        JOIN chart_of_accounts coa ON le.account_id = coa.id
        WHERE v.date <= $1
          AND v.status = 'Posted'
          AND coa.category IN ('Revenue', 'Expenses')
          ${costCenterId ? 'AND le.cost_center_id = $2' : ''}
      `;
      const retainedEarningsResult = await pool.query(retainedEarningsQuery, values);
      const retainedEarnings = parseFloat(retainedEarningsResult.rows[0]?.retained_earnings || 0);

      // Group accounts by balance sheet category and subcategory
      const groupedAccounts = accounts.reduce((acc: any, account: any) => {
        const category = account.balance_sheet_category;
        const subcategory = account.subcategory;
        
        if (!acc[category]) {
          acc[category] = {};
        }
        if (!acc[category][subcategory]) {
          acc[category][subcategory] = [];
        }
        acc[category][subcategory].push(account);
        return acc;
      }, {});

      // Helper function to build sections with children
      const buildSections = (categoryData: any): BalanceSheetSection[] => {
        const sections: BalanceSheetSection[] = [];
        
        Object.keys(categoryData).forEach(subcategory => {
          const accounts = categoryData[subcategory];
          const subcategoryTotal = accounts.reduce((sum: number, account: any) => 
            sum + parseFloat(account.balance || 0), 0);
          
          // Only include subcategories with non-zero balances or important structural accounts
          if (subcategoryTotal !== 0 || accounts.length > 0) {
            const section: BalanceSheetSection = {
              label: subcategory,
              amount: subcategoryTotal,
              category: accounts[0]?.balance_sheet_category as "Assets" | "Liabilities" | "Equity",
              children: accounts.map((account: any) => ({
                label: account.name,
                amount: parseFloat(account.balance || 0),
                category: account.balance_sheet_category as "Assets" | "Liabilities" | "Equity"
              }))
            };
            sections.push(section);
          }
        });
        
        return sections;
      };

      // Build Assets sections
      const assets = buildSections(groupedAccounts['Assets'] || {});
      
      // Build Liabilities sections  
      const liabilities = buildSections(groupedAccounts['Liabilities'] || {});
      
      // Build Equity sections
      const equity = buildSections(groupedAccounts['Equity'] || {});

      // Add cumulative net income as Retained Earnings so equity reflects P&L
      if (retainedEarnings !== 0) {
        equity.push({
          label: 'Retained Earnings',
          amount: retainedEarnings,
          category: 'Equity',
          children: [
            {
              label: 'Current & Accumulated Earnings',
              amount: retainedEarnings,
              category: 'Equity'
            }
          ]
        });
      }

      // Calculate totals
      const totalAssets = assets.reduce((sum, section) => sum + section.amount, 0);
      const totalLiabilities = liabilities.reduce((sum, section) => sum + section.amount, 0);
      const totalEquity = equity.reduce((sum, section) => sum + section.amount, 0);

      // Check if balance sheet balances (Assets = Liabilities + Equity)
      const balanceCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

      const response: BalanceSheetResponse = {
        assets,
        liabilities,
        equity,
        asOfDate: defaultAsOfDate,
        totals: {
          totalAssets,
          totalLiabilities,
          totalEquity,
          balanceCheck
        }
      };

      MyLogger.success(action, {
        asOfDate: defaultAsOfDate,
        assetsCount: assets.length,
        liabilitiesCount: liabilities.length,
        equityCount: equity.length,
        totalAssets,
        totalLiabilities,
        totalEquity,
        balanceCheck
      });

      return response;

    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }
}

export default new GetBalanceSheetMediator();
