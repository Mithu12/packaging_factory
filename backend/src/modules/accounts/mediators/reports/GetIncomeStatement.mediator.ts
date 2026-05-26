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

      // Build the main query to get account balances from ledger entries.
      // net_amount uses (credit - debit) so Revenue/Income come out positive and
      // expenses come out negative, matching how the sections are summed below.
      // The chart_of_accounts.category CHECK constraint only permits the five base
      // categories, so finer P&L buckets (COGS vs Operating vs Other) are derived
      // from the account code prefix instead: 50xx = COGS, 7xxx = Other Expenses,
      // 6xxx Revenue accounts = Other Income.
      const query = `
        WITH account_balances AS (
          SELECT
            coa.id,
            coa.code,
            coa.name,
            coa.category,
            coa.type,
            coa.parent_id,
            COALESCE(SUM(le.credit - le.debit), 0) as net_amount
          FROM chart_of_accounts coa
          INNER JOIN ledger_entries le ON coa.id = le.account_id
          INNER JOIN vouchers v ON le.voucher_id = v.id
          WHERE
            coa.type = 'Posting'
            AND v.date >= $1 AND v.date <= $2 AND v.status = 'Posted'
            ${costCenterId ? 'AND le.cost_center_id = $3' : ''}
          GROUP BY coa.id, coa.code, coa.name, coa.category, coa.type, coa.parent_id
        ),
        categorized_accounts AS (
          SELECT
            *,
            CASE
              WHEN category = 'Revenue' AND code LIKE '6%' THEN 'Other Income'
              WHEN category = 'Revenue' THEN 'Revenue'
              WHEN category = 'Expenses' AND code LIKE '50%' THEN 'Cost of Goods Sold'
              WHEN category = 'Expenses' AND code LIKE '7%' THEN 'Other Expenses'
              WHEN category = 'Expenses' THEN 'Operating Expenses'
              ELSE 'Other'
            END as statement_category
          FROM account_balances
          WHERE category IN ('Revenue', 'Expenses')
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

      // Build income statement sections. net_amount is already sign-normalized:
      // Revenue/Other Income are positive, expense buckets are negative.
      const sections: IncomeStatementSection[] = [];

      const mapChildren = (accounts: any[]): IncomeStatementSection[] =>
        accounts.map((account: any) => ({
          label: account.name,
          amount: parseFloat(account.net_amount || 0)
        }));

      // Revenue Section
      const revenue = calculateCategoryTotal(groupedAccounts['Revenue'] || []);
      if (groupedAccounts['Revenue']) {
        sections.push({
          label: 'Revenue',
          amount: revenue,
          children: mapChildren(groupedAccounts['Revenue'])
        });
      }

      // Cost of Goods Sold Section (negative)
      const cogs = calculateCategoryTotal(groupedAccounts['Cost of Goods Sold'] || []);
      if (groupedAccounts['Cost of Goods Sold']) {
        sections.push({
          label: 'Cost of Goods Sold',
          amount: cogs,
          children: mapChildren(groupedAccounts['Cost of Goods Sold'])
        });
      }

      // Calculate Gross Profit
      const grossProfit = revenue + cogs; // COGS is already negative

      if (revenue !== 0 || cogs !== 0) {
        sections.push({
          label: 'Gross Profit',
          amount: grossProfit
        });
      }

      // Operating Expenses Section (negative)
      const operatingExpenses = calculateCategoryTotal(groupedAccounts['Operating Expenses'] || []);
      if (groupedAccounts['Operating Expenses']) {
        sections.push({
          label: 'Operating Expenses',
          amount: operatingExpenses,
          children: mapChildren(groupedAccounts['Operating Expenses'])
        });
      }

      // Calculate Operating Income
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
      const otherAmount =
        calculateCategoryTotal(otherIncomeAccounts) + calculateCategoryTotal(otherExpenseAccounts);

      if (otherIncomeAccounts.length > 0 || otherExpenseAccounts.length > 0) {
        sections.push({
          label: 'Other Income / Expense',
          amount: otherAmount,
          children: [...mapChildren(otherIncomeAccounts), ...mapChildren(otherExpenseAccounts)]
        });
      }

      // Calculate Net Income
      const netIncome = operatingIncome + otherAmount;

      sections.push({
        label: 'Net Income',
        amount: netIncome
      });

      // Calculate totals. Expense buckets are negative, so summing and negating
      // yields the positive magnitude of total expenses.
      const totals = {
        revenue,
        expenses: -(cogs + operatingExpenses + (otherAmount < 0 ? otherAmount : 0)),
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
