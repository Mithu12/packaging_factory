import { apiClient } from "@/services/apiClient";

export type SupplierLedgerEntryType = "invoice" | "payment" | "discount" | "return";

export interface SupplierLedgerEntry {
  entry_date: string; // YYYY-MM-DD
  entry_type: SupplierLedgerEntryType;
  source_id: number;
  reference: string;
  description: string;
  /** Decreases the payable (payments, discounts, returns). */
  debit: number;
  /** Increases the payable (purchase invoices). */
  credit: number;
  /** Running payable balance after this entry. */
  balance: number;
}

export interface SupplierLedgerSupplier {
  id: number;
  supplier_code: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface SupplierLedger {
  supplier: SupplierLedgerSupplier;
  period: { start_date: string | null; end_date: string | null };
  opening_balance: number;
  entries: SupplierLedgerEntry[];
  totals: {
    total_debit: number;
    total_credit: number;
    closing_balance: number;
  };
}

export interface SupplierLedgerParams {
  supplierId: number;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  endDate?: string;
}

export const SupplierLedgerApi = {
  async getSupplierLedger(params: SupplierLedgerParams): Promise<SupplierLedger> {
    const response = await apiClient.get("/inventory/reports/supplier-ledger", {
      params: {
        supplier_id: params.supplierId,
        start_date: params.startDate || undefined,
        end_date: params.endDate || undefined,
      },
    });
    return response.data.data;
  },
};
