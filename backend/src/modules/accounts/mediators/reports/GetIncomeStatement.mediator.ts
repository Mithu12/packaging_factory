import {
  IncomeStatementQueryParams,
  IncomeStatementResponse,
  IncomeStatementSection,
  FinancialMetric,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";

export class GetIncomeStatementMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  static async getIncomeStatement(params: IncomeStatementQueryParams): Promise<IncomeStatementResponse> {
    const action = 'Get Income Statement';
    try {
      MyLogger.info(action, { params });

      const {
        dateFrom,
        dateTo,
        costCenterId,
        scenario = 'actual'
      } = params;

      // Set default date range if not provided (current year)
      const currentYear = new Date().getFullYear();
      const defaultDateFrom = dateFrom || `${currentYear}-01-01`;
      const defaultDateTo = dateTo || `${currentYear}-12-31`;

      // Build the main query to get account balances from ledger entries
      const query = `
        WITH account_balances AS (
          SELECT 
            coa.id,
            coa.code,
            coa.name,
            coa.category,
            coa.type,
            coa.parent_id,
            COALESCE(SUM(le.debit - le.credit), 0) as net_amount
          FROM chart_of_accounts coa
          LEFT JOIN ledger_entries le ON coa.id = le.account_id
          LEFT JOIN vouchers v ON le.voucher_id = v.id
          WHERE 
            coa.type = 'Posting'
            AND (le.id IS NULL OR (v.date >= $1 AND v.date <= $2 AND v.status = 'Posted'))
            ${costCenterId ? 'AND (le.cost_center_id = $3 OR le.cost_center_id IS NULL)' : ''}
          GROUP BY coa.id, coa.code, coa.name, coa.category, coa.type, coa.parent_id
        ),
        categorized_accounts AS (
          SELECT 
            *,
            CASE 
              WHEN category IN ('Revenue', 'Income') THEN 'Revenue'
              WHEN category IN ('Cost of Goods Sold', 'COGS') THEN 'Cost of Goods Sold'
              WHEN category IN ('Expense', 'Expenses', 'Operating Expenses') THEN 'Operating Expenses'
              WHEN category IN ('Other Income') THEN 'Other Income'
              WHEN category IN ('Other Expenses', 'Finance Charges') THEN 'Other Expenses'
              ELSE 'Other'
            END as statement_category
          FROM account_balances
          WHERE category IN ('Revenue', 'Income', 'Cost of Goods Sold', 'COGS', 'Expense', 'Expenses', 'Operating Expenses', 'Other Income', 'Other Expenses', 'Finance Charges')
        )
        SELECT 
          statement_category,
          category,
          name,
          net_amount
        FROM categorized_accounts
        ORDER BY statement_category, category, name
      `;

      const values = costCenterId 
        ? [defaultDateFrom, defaultDateTo, costCenterId]
        : [defaultDateFrom, defaultDateTo];

      const result = await pool.query(query, values);
      const accounts = result.rows;

      // Group accounts by statement category
      const groupedAccounts = accounts.reduce((acc: any, account: any) => {
        const category = account.statement_category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(account);
        return acc;
      }, {});

      // Calculate totals for each category
      const calculateCategoryTotal = (accounts: any[]) => {
        return accounts.reduce((sum, account) => sum + parseFloat(account.net_amount || 0), 0);
      };

      // Build income statement sections
      const sections: IncomeStatementSection[] = [];

      // Revenue Section
      if (groupedAccounts['Revenue']) {
        const revenueTotal = calculateCategoryTotal(groupedAccounts['Revenue']);
        sections.push({
          label: 'Revenue',
          amount: revenueTotal,
          children: groupedAccounts['Revenue'].map((account: any) => ({
            label: account.name,
            amount: parseFloat(account.net_amount || 0)
          }))
        });
      }

      // Cost of Goods Sold Section
      if (groupedAccounts['Cost of Goods Sold']) {
        const cogsTotal = -calculateCategoryTotal(groupedAccounts['Cost of Goods Sold']);
        sections.push({
          label: 'Cost of Goods Sold',
          amount: cogsTotal,
          children: groupedAccounts['Cost of Goods Sold'].map((account: any) => ({
            label: account.name,
            amount: -parseFloat(account.net_amount || 0)
          }))
        });
      }

      // Calculate Gross Profit
      const revenue = sections.find(s => s.label === 'Revenue')?.amount || 0;
      const cogs = sections.find(s => s.label === 'Cost of Goods Sold')?.amount || 0;
      const grossProfit = revenue + cogs; // COGS is already negative

      if (revenue > 0 || cogs < 0) {
        sections.push({
          label: 'Gross Profit',
          amount: grossProfit
        });
      }

      // Operating Expenses Section
      if (groupedAccounts['Operating Expenses']) {
        const expensesTotal = -calculateCategoryTotal(groupedAccounts['Operating Expenses']);
        sections.push({
          label: 'Operating Expenses',
          amount: expensesTotal,
          children: groupedAccounts['Operating Expenses'].map((account: any) => ({
            label: account.name,
            amount: -parseFloat(account.net_amount || 0)
          }))
        });
      }

      // Calculate Operating Income
      const operatingExpenses = sections.find(s => s.label === 'Operating Expenses')?.amount || 0;
      const operatingIncome = grossProfit + operatingExpenses; // Operating expenses is already negative

      if (grossProfit !== 0 || operatingExpenses !== 0) {
        sections.push({
          label: 'Operating Income',
          amount: operatingIncome
        });
      }

      // Other Income/Expenses Section
      const otherIncomeAccounts = groupedAccounts['Other Income'] || [];
      const otherExpenseAccounts = groupedAccounts['Other Expenses'] || [];
      
      if (otherIncomeAccounts.length > 0 || otherExpenseAccounts.length > 0) {
        const otherIncomeTotal = calculateCategoryTotal(otherIncomeAccounts);
        const otherExpenseTotal = -calculateCategoryTotal(otherExpenseAccounts);
        const netOtherAmount = otherIncomeTotal + otherExpenseTotal;

        const otherChildren: IncomeStatementSection[] = [];
        
        otherIncomeAccounts.forEach((account: any) => {
          otherChildren.push({
            label: account.name,
            amount: parseFloat(account.net_amount || 0)
          });
        });

        otherExpenseAccounts.forEach((account: any) => {
          otherChildren.push({
            label: account.name,
            amount: -parseFloat(account.net_amount || 0)
          });
        });

        sections.push({
          label: 'Other Income / Expense',
          amount: netOtherAmount,
          children: otherChildren
        });
      }

      // Calculate Net Income
      const otherAmount = sections.find(s => s.label === 'Other Income / Expense')?.amount || 0;
      const netIncome = operatingIncome + otherAmount;

      sections.push({
        label: 'Net Income',
        amount: netIncome
      });

      // Calculate totals
      const totals = {
        revenue,
        expenses: Math.abs(cogs + operatingExpenses + (otherAmount < 0 ? otherAmount : 0)),
        grossProfit,
        netIncome
      };

      // Generate financial highlights (simplified for now)
      const highlights: FinancialMetric[] = [
        {
          label: 'Net Profit',
          amount: netIncome,
          trend: netIncome > 0 ? 'up' : netIncome < 0 ? 'down' : 'flat'
        },
        {
          label: 'Operating Margin',
          amount: revenue > 0 ? operatingIncome / revenue : 0,
          trend: 'flat' // Would need historical data to calculate trend
        },
        {
          label: 'Gross Margin',
          amount: revenue > 0 ? grossProfit / revenue : 0,
          trend: 'flat' // Would need historical data to calculate trend
        },
        {
          label: 'Total Revenue',
          amount: revenue,
          trend: 'flat' // Would need historical data to calculate trend
        }
      ];

      const response: IncomeStatementResponse = {
        sections,
        highlights,
        period: {
          from: defaultDateFrom,
          to: defaultDateTo,
          label: `${defaultDateFrom} to ${defaultDateTo}`
        },
        totals
      };

      MyLogger.success(action, {
        sectionsCount: sections.length,
        totalRevenue: revenue,
        netIncome,
        period: response.period.label
      });

      return response;

    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }
}

export default new GetIncomeStatementMediator();
