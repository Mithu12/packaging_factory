export type AccountCategory = "Assets" | "Liabilities" | "Equity" | "Revenue" | "Expenses"

export type AccountStatus = "Active" | "Inactive"

export interface AccountGroupNode {
  id: string
  name: string
  code: string
  category: AccountCategory
  description?: string
  status: AccountStatus
  createdAt: string
  updatedAt: string
  children?: AccountGroupNode[]
}

export type AccountNodeType = "Control" | "Posting"

export interface AccountNode {
  id: string
  name: string
  code: string
  type: AccountNodeType
  group: AccountCategory
  parentId?: string
  balance: number
  currency: string
  status: AccountStatus
  notes?: string
  costCenters?: string[]
  children?: AccountNode[]
}

export type CostCenterType = "Department" | "Project" | "Location"

export interface CostCenter {
  id: string
  name: string
  code: string
  owner: string
  department: string
  type: CostCenterType
  status: AccountStatus
  budget: number
  actualSpend: number
  variance: number
  startDate: string
  endDate?: string
  description?: string
}

export type VoucherType = "Payment" | "Receipt" | "Journal" | "Balance Transfer"

export type VoucherStatus = "Draft" | "Pending Approval" | "Posted" | "Void"

export interface VoucherLine {
  id: string
  accountCode: string
  accountName: string
  debit: number
  credit: number
  costCenterId?: string
  narration?: string
}

export interface Voucher {
  id: string
  voucherNo: string
  type: VoucherType
  date: string
  reference?: string
  payee?: string
  preparedBy: string
  approvedBy?: string
  status: VoucherStatus
  amount: number
  currency: string
  costCenterId?: string
  narration: string
  attachments?: number
  lines: VoucherLine[]
  createdAt: string
}

export interface LedgerFilter {
  startDate: string
  endDate: string
  accountCode?: string
  costCenterId?: string
  voucherType?: VoucherType
}

export interface LedgerEntry {
  id: string
  date: string
  voucherNo: string
  type: VoucherType | "Opening Balance"
  accountCode: string
  accountName: string
  description: string
  debit: number
  credit: number
  balance: number
  costCenterName?: string
  createdBy: string
}

export interface FinancialMetric {
  label: string
  amount: number
  change?: number
  trend?: "up" | "down" | "flat"
}

export interface IncomeStatementSection {
  label: string
  amount: number
  children?: IncomeStatementSection[]
}

export interface BalanceSheetSection {
  label: string
  amount: number
  category: "Assets" | "Liabilities" | "Equity"
  children?: BalanceSheetSection[]
}
