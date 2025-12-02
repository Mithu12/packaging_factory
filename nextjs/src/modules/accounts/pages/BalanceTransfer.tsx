"use client";

import { VoucherPage } from "@/modules/accounts/components/VoucherPage"
import { VoucherType } from "@/services/accounts-api"

export default function BalanceTransfer() {
  return (
    <VoucherPage
      type={VoucherType.BALANCE_TRANSFER}
      title="Balance Transfer"
      description="Move balances between cash and bank accounts while maintaining a clear audit trail."
      primaryActionLabel="New balance transfer"
      counterpartyLabel="Transfer reference"
      counterpartyPlaceholder="Internal memo"
    />
  )
}
