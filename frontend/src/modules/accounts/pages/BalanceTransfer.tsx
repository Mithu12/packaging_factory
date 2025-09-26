import { VoucherPage } from "@/modules/accounts/components/VoucherPage"

export default function BalanceTransfer() {
  return (
    <VoucherPage
      type="Balance Transfer"
      title="Balance Transfer"
      description="Move balances between cash and bank accounts while maintaining a clear audit trail."
      primaryActionLabel="New balance transfer"
      counterpartyLabel="Transfer reference"
      counterpartyPlaceholder="Internal memo"
    />
  )
}
