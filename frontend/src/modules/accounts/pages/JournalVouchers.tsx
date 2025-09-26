import { VoucherPage } from "@/modules/accounts/components/VoucherPage"

export default function JournalVouchers() {
  return (
    <VoucherPage
      type="Journal"
      title="Journal Vouchers"
      description="Handle accruals, reclassifications, depreciation, and other non-cash adjustments with proper audit trails."
      primaryActionLabel="New journal voucher"
      showCounterparty={false}
      narrationLabel="Journal narrative"
    />
  )
}
