// =====================================================
// Accounts Module Types
// =====================================================

export type AccountCategory = 'Assets' | 'Liabilities' | 'Equity' | 'Revenue' | 'Expenses';
export type AccountStatus = 'Active' | 'Inactive';
export type AccountNodeType = 'Control' | 'Posting';
export type CostCenterType = 'Department' | 'Project' | 'Location';
export enum VoucherType {
  PAYMENT = 'Payment',
  RECEIPT = 'Receipt',
  JOURNAL = 'Journal',
  BALANCE_TRANSFER = 'Balance Transfer'
}
export enum VoucherStatus {
  DRAFT = 'Draft',
  PENDING_APPROVAL = 'Pending Approval',
  POSTED = 'Posted',
  VOID = 'Void'
}

// =====================================================
// Account Groups
// =====================================================

export interface AccountGroup {
  id: number;
  name: string;
  code: string;
  category: AccountCategory;
  parentId?: number;
  description?: string;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
  children?: AccountGroup[];
}

export interface CreateAccountGroupRequest {
  name: string;
  code: string;
  category: AccountCategory;
  parentId?: number;
  description?: string;
  status?: AccountStatus;
}

export interface UpdateAccountGroupRequest {
  name?: string;
  code?: string;
  category?: AccountCategory;
  parentId?: number;
  description?: string;
  status?: AccountStatus;
}

export interface AccountGroupQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: AccountCategory;
  status?: AccountStatus;
  parentId?: number;
  sortBy?: 'id' | 'name' | 'code' | 'category' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface AccountGroupStats {
  totalGroups: number;
  groupsByCategory: Record<AccountCategory, number>;
  activeGroups: number;
  inactiveGroups: number;
  groupsWithChildren: number;
}

// =====================================================
// Chart of Accounts
// =====================================================

export interface ChartOfAccount {
  id: number;
  name: string;
  code: string;
  type: AccountNodeType;
  category: AccountCategory;
  parentId?: number;
  groupId?: number;
  balance: number;
  currency: string;
  status: AccountStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  children?: ChartOfAccount[];
  groupName?: string;
  parentName?: string;
}

export interface CreateChartOfAccountRequest {
  name: string;
  code: string;
  type: AccountNodeType;
  category: AccountCategory;
  parentId?: number;
  groupId?: number;
  currency?: string;
  status?: AccountStatus;
  notes?: string;
}

export interface UpdateChartOfAccountRequest {
  name?: string;
  code?: string;
  type?: AccountNodeType;
  category?: AccountCategory;
  parentId?: number;
  groupId?: number;
  currency?: string;
  status?: AccountStatus;
  notes?: string;
}

export interface ChartOfAccountQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: AccountCategory;
  type?: AccountNodeType;
  status?: AccountStatus;
  groupId?: number;
  parentId?: number;
  sortBy?: 'id' | 'name' | 'code' | 'category' | 'type' | 'balance' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// Cost Centers
// =====================================================

export interface CostCenter {
  id: number;
  name: string;
  code: string;
  owner?: string;
  department?: string;
  type: CostCenterType;
  status: AccountStatus;
  budget: number;
  actualSpend: number;
  variance: number;
  defaultAccountId?: number;
  startDate?: Date;
  endDate?: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  defaultAccountCode?: string;
  defaultAccountName?: string;
}

export interface CreateCostCenterRequest {
  name: string;
  code: string;
  owner?: string;
  department?: string;
  type: CostCenterType;
  status?: AccountStatus;
  budget?: number;
  defaultAccountId?: number;
  startDate?: Date;
  endDate?: Date;
  description?: string;
}

export interface UpdateCostCenterRequest {
  name?: string;
  code?: string;
  owner?: string;
  department?: string;
  type?: CostCenterType;
  status?: AccountStatus;
  budget?: number;
  defaultAccountId?: number;
  startDate?: Date;
  endDate?: Date;
  description?: string;
}

export interface CostCenterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: CostCenterType;
  status?: AccountStatus;
  department?: string;
  sortBy?: 'id' | 'name' | 'code' | 'type' | 'budget' | 'actual_spend' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// Vouchers
// =====================================================

export interface VoucherLine {
  id: number;
  voucherId: number;
  accountId: number;
  debit: number;
  credit: number;
  costCenterId?: number;
  description?: string;
  accountCode?: string;
  accountName?: string;
  costCenterName?: string;
}

export interface Voucher {
  id: number;
  voucherNo: string;
  type: VoucherType;
  date: Date;
  reference?: string;
  payee?: string;
  preparedBy: number;
  approvedBy?: number;
  status: VoucherStatus;
  amount: number;
  currency: string;
  costCenterId?: number;
  narration: string;
  attachments: number;
  lines: VoucherLine[];
  createdAt: Date;
  updatedAt: Date;
  preparedByName?: string;
  approvedByName?: string;
  costCenterName?: string;
}

export interface CreateVoucherRequest {
  type: VoucherType;
  date: Date;
  reference?: string;
  payee?: string;
  amount: number;
  currency?: string;
  costCenterId?: number;
  narration: string;
  lines: CreateVoucherLineRequest[];
}

export interface CreateVoucherLineRequest {
  accountId: number;
  debit: number;
  credit: number;
  costCenterId?: number;
  description?: string;
}

export interface UpdateVoucherRequest {
  type?: VoucherType;
  date?: Date;
  reference?: string;
  payee?: string;
  amount?: number;
  currency?: string;
  costCenterId?: number;
  narration?: string;
  lines?: CreateVoucherLineRequest[];
}

export interface VoucherQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: VoucherType;
  status?: VoucherStatus;
  dateFrom?: Date;
  dateTo?: Date;
  preparedBy?: number;
  approvedBy?: number;
  costCenterId?: number;
  sortBy?: 'id' | 'voucher_no' | 'date' | 'amount' | 'status' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// Ledger Entries
// =====================================================

export interface LedgerEntry {
  id: number;
  date: Date;
  voucherId?: number;
  voucherNo?: string;
  type: string;
  accountId: number;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  costCenterId?: number;
  createdBy: number;
  createdAt: Date;
  accountCode?: string;
  accountName?: string;
  costCenterName?: string;
  createdByName?: string;
}

export interface LedgerQueryParams {
  page?: number;
  limit?: number;
  accountId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  type?: string;
  costCenterId?: number;
  sortBy?: 'date' | 'voucher_no' | 'debit' | 'credit' | 'balance' | 'created_at';
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// Response Types
// =====================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// =====================================================
// Financial Reports
// =====================================================

export interface IncomeStatementSection {
  label: string;
  amount: number;
  children?: IncomeStatementSection[];
}

export interface FinancialMetric {
  label: string;
  amount: number;
  change?: number;
  trend?: "up" | "down" | "flat";
}

export interface IncomeStatementQueryParams {
  dateFrom?: string;
  dateTo?: string;
  costCenterId?: number;
  scenario?: 'actual' | 'budget' | 'forecast';
}

export interface IncomeStatementResponse {
  sections: IncomeStatementSection[];
  highlights: FinancialMetric[];
  period: {
    from: string;
    to: string;
    label: string;
  };
  totals: {
    revenue: number;
    expenses: number;
    grossProfit: number;
    netIncome: number;
  };
}

export interface BalanceSheetSection {
  label: string;
  amount: number;
  category: "Assets" | "Liabilities" | "Equity";
  children?: BalanceSheetSection[];
}

export interface BalanceSheetQueryParams {
  asOfDate?: string;
  costCenterId?: number;
  format?: 'consolidated' | 'entity';
}

export interface BalanceSheetResponse {
  assets: BalanceSheetSection[];
  liabilities: BalanceSheetSection[];
  equity: BalanceSheetSection[];
  asOfDate: string;
  totals: {
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    balanceCheck: boolean; // Assets = Liabilities + Equity
  };
}


