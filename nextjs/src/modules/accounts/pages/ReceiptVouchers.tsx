"use client";

import { VoucherPage } from "@/modules/accounts/components/VoucherPage"
import { VoucherType } from "@/services/accounts-api"

export default function ReceiptVouchers() {
  return (
    <VoucherPage
      type={VoucherType.RECEIPT}
      title="Receipt Vouchers"
      description="Record incoming funds from customers, lenders, or other sources and keep bank balances reconciled."
      primaryActionLabel="New receipt voucher"
      counterpartyLabel="Received from"
      counterpartyPlaceholder="Customer or source"
    />
  )
}
