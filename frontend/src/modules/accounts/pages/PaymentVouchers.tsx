import { VoucherPage } from "@/modules/accounts/components/VoucherPage"

export default function PaymentVouchers() {
  return (
    <VoucherPage
      type="Payment"
      title="Payment Vouchers"
      description="Capture every cash or bank outflow with supporting approvals and balancing entries."
      primaryActionLabel="New payment voucher"
      counterpartyLabel="Paid to"
      counterpartyPlaceholder="Supplier, employee, or other payee"
    />
  )
}
