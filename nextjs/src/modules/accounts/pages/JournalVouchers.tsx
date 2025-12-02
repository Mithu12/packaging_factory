"use client";

import { VoucherPage } from "@/modules/accounts/components/VoucherPage"
import { VoucherType } from "@/services/accounts-api"

export default function JournalVouchers() {
  return (
    <VoucherPage
      type={VoucherType.JOURNAL}
      title="Journal Vouchers"
      description="Handle accruals, reclassifications, depreciation, and other non-cash adjustments with proper audit trails."
      primaryActionLabel="New journal voucher"
      showCounterparty={false}
      narrationLabel="Journal narrative"
    />
  )
}
