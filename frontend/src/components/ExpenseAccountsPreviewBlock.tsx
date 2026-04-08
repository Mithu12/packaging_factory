"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { ExpenseAccountPreviewResponse } from '@/services/types';

type Props = {
  loading: boolean;
  preview: ExpenseAccountPreviewResponse | null;
};

function accountLine(
  label: string,
  account: { code: string; name: string } | null,
  missingMessage: string
) {
  return (
    <p className="text-sm text-muted-foreground">
      {label}:{' '}
      {account ? (
        <span className="font-medium text-foreground">
          {account.code} — {account.name}
        </span>
      ) : (
        <span className="text-destructive">{missingMessage}</span>
      )}
    </p>
  );
}

export function ExpenseAccountsPreviewBlock({ loading, preview }: Props) {
  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading accounts preview...</p>
    );
  }

  if (!preview) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Could not load account preview. Try again or check your connection.
        </AlertDescription>
      </Alert>
    );
  }

  const moduleOn = preview.accounts_module_available !== false;

  if (!moduleOn) {
    return (
      <Alert>
        <AlertDescription>
          Accounting integration is not active. No voucher is created automatically when
          expenses are approved.
        </AlertDescription>
      </Alert>
    );
  }

  const missingExpense = !preview.account;
  const missingPayment = !preview.payment_account;

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <p className="text-sm font-medium text-foreground">Accounts affected when approved</p>
      <p className="text-xs text-muted-foreground">
        When this expense is approved, the system creates a payment voucher with the following
        ledger lines.
      </p>
      {accountLine(
        'Debit (expense)',
        preview.account,
        'No expense account matched this category and cost center.'
      )}
      {accountLine(
        'Credit (payment)',
        preview.payment_account,
        'No default cash account found (Assets, name contains Cash).'
      )}
      {(missingExpense || missingPayment) && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {missingExpense && missingPayment
              ? 'Voucher creation will fail until chart of accounts is configured.'
              : missingExpense
                ? 'Expense side is missing — voucher creation may fail when approved.'
                : 'Payment side is missing — voucher creation may fail when approved.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
