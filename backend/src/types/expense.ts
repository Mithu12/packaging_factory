export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  expense_number: string;
  title: string;
  description?: string;
  category_id: number;
  amount: number;
  currency: string;
  expense_date: string;
  payment_method: string;
  vendor_name?: string;
  vendor_contact?: string;
  receipt_number?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: number;
  approved_at?: string;
  paid_by?: number;
  paid_at?: string;
  // New approval fields
  submitted_at?: string;
  submitted_by?: number;
  approved_by_id?: number;
  approval_status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approval_notes?: string;
  department?: string;
  project?: string;
  tags?: string[];
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  cost_center_id?: number;
  cost_center_name?: string;
  cost_center_code?: string;
  created_by_name?: string;
  approved_by_name?: string;
  paid_by_name?: string;
}

export interface CreateExpenseRequest {
  title: string;
  description?: string;
  category_id: number;
  amount: number;
  currency?: string;
  expense_date: string;
  payment_method?: string;
  vendor_name?: string;
  vendor_contact?: string;
  receipt_number?: string;
  receipt_url?: string;
  department?: string;
  project?: string;
  tags?: string[];
  notes?: string;
  cost_center_id?: number;
}

export interface UpdateExpenseRequest {
  title?: string;
  description?: string;
  category_id?: number;
  amount?: number;
  currency?: string;
  expense_date?: string;
  payment_method?: string;
  vendor_name?: string;
  vendor_contact?: string;
  receipt_number?: string;
  receipt_url?: string;
  department?: string;
  project?: string;
  tags?: string[];
  notes?: string;
  cost_center_id?: number;
}

export interface ExpenseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'paid';
  payment_method?: string;
  department?: string;
  project?: string;
  cost_center_id?: number;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  created_by?: number;
  sortBy?: 'id' | 'expense_number' | 'title' | 'amount' | 'expense_date' | 'status' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseStats {
  total_expenses: number;
  pending_expenses: number;
  approved_expenses: number;
  rejected_expenses: number;
  paid_expenses: number;
  total_amount: number;
  pending_amount: number;
  approved_amount: number;
  paid_amount: number;
  expenses_this_month: number;
  expenses_this_year: number;
  average_expense_amount: number;
  top_categories: Array<{
    category_id: number;
    category_name: string;
    count: number;
    total_amount: number;
  }>;
  monthly_trends: Array<{
    month: string;
    count: number;
    total_amount: number;
  }>;
}

export interface CreateExpenseCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateExpenseCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface ExpenseCategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  sortBy?: 'id' | 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseCategoryListResponse {
  categories: ExpenseCategory[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Approval workflow interfaces for expenses
export interface SubmitExpenseRequest {
  notes?: string;
}

export interface ApproveExpenseRequest {
  action: 'approve' | 'reject';
  notes?: string;
}
