import type { FactoryCustomerOrderStatus } from "../services/customer-orders-api";

/** Matches backend `ORDER_STATUSES_ALLOWING_PAYMENT` in FactoryCustomerPaymentsMediator. */
export const FACTORY_ORDER_STATUSES_ALLOWING_PAYMENT: FactoryCustomerOrderStatus[] = [
  "approved",
  "in_production",
  "completed",
  "shipped",
];

export function factoryOrderAllowsRecordingPayment(
  status: string
): boolean {
  return FACTORY_ORDER_STATUSES_ALLOWING_PAYMENT.includes(
    status as FactoryCustomerOrderStatus
  );
}
