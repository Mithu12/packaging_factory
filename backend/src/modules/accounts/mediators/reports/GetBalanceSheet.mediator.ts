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

      // Build the main query to get account balances as of the specified date
      const query = `
        WITH account_balances AS (
          SELECT 
            coa.id,
            coa.code,
            coa.name,
            coa.category,
            coa.type,
            coa.parent_id,
            -- Calculate balance as of the specified date
            COALESCE(
              (SELECT SUM(le.debit - le.credit) 
               FROM ledger_entries le
               JOIN vouchers v ON le.voucher_id = v.id
               WHERE le.account_id = coa.id 
               AND v.date <= $1 
               AND v.status = 'Posted'
               ${costCenterId ? 'AND (le.cost_center_id = $2 OR le.cost_center_id IS NULL)' : ''}
              ), 
              0
            ) as balance
          FROM chart_of_accounts coa
          WHERE coa.type = 'Posting'
        ),
        categorized_accounts AS (
          SELECT 
            *,
            CASE 
              WHEN category IN ('Assets', 'Current Assets', 'Non-current Assets', 'Fixed Assets') THEN 'Assets'
              WHEN category IN ('Liabilities', 'Current Liabilities', 'Non-current Liabilities', 'Long-term Liabilities') THEN 'Liabilities'
              WHEN category IN ('Equity', 'Owner Equity', 'Shareholder Equity', 'Capital') THEN 'Equity'
              ELSE 
                CASE 
                  WHEN category LIKE '%Asset%' THEN 'Assets'
                  WHEN category LIKE '%Liability%' OR category LIKE '%Payable%' THEN 'Liabilities'
                  WHEN category LIKE '%Equity%' OR category LIKE '%Capital%' THEN 'Equity'
                  ELSE 'Assets' -- Default to Assets for unknown categories
                END
            END as balance_sheet_category,
            CASE 
              WHEN category IN ('Current Assets', 'Cash', 'Receivables', 'Inventory') THEN 'Current Assets'
              WHEN category IN ('Fixed Assets', 'Non-current Assets', 'Property Plant Equipment') THEN 'Non-current Assets'
              WHEN category IN ('Current Liabilities', 'Payables', 'Accrued Expenses') THEN 'Current Liabilities'
              WHEN category IN ('Non-current Liabilities', 'Long-term Liabilities', 'Term Loans') THEN 'Non-current Liabilities'
              WHEN category IN ('Owner Equity', 'Shareholder Equity', 'Capital', 'Retained Earnings') THEN 'Equity'
              ELSE category
            END as subcategory
          FROM account_balances
          WHERE balance != 0 OR category IN ('Assets', 'Liabilities', 'Equity', 'Current Assets', 'Non-current Assets', 'Current Liabilities', 'Non-current Liabilities')
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
