"use client";

import { VoucherPage } from "@/modules/accounts/components/VoucherPage"
import { VoucherType } from "@/services/accounts-api"

export default function PaymentVouchers() {
  return (
    <VoucherPage
      type={VoucherType.PAYMENT }
      title="Payment Vouchers"
      description="Capture every cash or bank outflow with supporting approvals and balancing entries."
      primaryActionLabel="New payment voucher"
      counterpartyLabel="Paid to"
      counterpartyPlaceholder="Supplier, employee, or other payee"
    />
  )
}
