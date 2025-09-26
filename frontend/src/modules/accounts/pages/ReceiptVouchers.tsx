import { VoucherPage } from "@/modules/accounts/components/VoucherPage"

export default function ReceiptVouchers() {
  return (
    <VoucherPage
      type="Receipt"
      title="Receipt Vouchers"
      description="Record incoming funds from customers, lenders, or other sources and keep bank balances reconciled."
      primaryActionLabel="New receipt voucher"
      counterpartyLabel="Received from"
      counterpartyPlaceholder="Customer or source"
    />
  )
}
