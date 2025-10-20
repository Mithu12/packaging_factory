import { FactoryCustomerOrderStatus } from '@/types/factory';

/**
 * Defines valid status transitions for factory customer orders
 * Based on the sales rep workflow requirements
 */
export const ORDER_STATUS_TRANSITIONS: Record<FactoryCustomerOrderStatus, FactoryCustomerOrderStatus[]> = {
  [FactoryCustomerOrderStatus.DRAFT]: [
    FactoryCustomerOrderStatus.PENDING,
    FactoryCustomerOrderStatus.PENDING_APPROVAL,
    FactoryCustomerOrderStatus.CANCELLED
  ],
  [FactoryCustomerOrderStatus.PENDING]: [
    FactoryCustomerOrderStatus.QUOTED,
    FactoryCustomerOrderStatus.APPROVED,
    FactoryCustomerOrderStatus.REJECTED,
    FactoryCustomerOrderStatus.CANCELLED
  ],
  [FactoryCustomerOrderStatus.PENDING_APPROVAL]: [
    FactoryCustomerOrderStatus.APPROVED,
    FactoryCustomerOrderStatus.REJECTED,
    FactoryCustomerOrderStatus.CANCELLED
  ],
  [FactoryCustomerOrderStatus.QUOTED]: [
    FactoryCustomerOrderStatus.APPROVED,
    FactoryCustomerOrderStatus.REJECTED,
    FactoryCustomerOrderStatus.CANCELLED
  ],
  [FactoryCustomerOrderStatus.APPROVED]: [
    FactoryCustomerOrderStatus.ROUTED,
    FactoryCustomerOrderStatus.IN_PRODUCTION,
    FactoryCustomerOrderStatus.CANCELLED
  ],
  [FactoryCustomerOrderStatus.REJECTED]: [
    FactoryCustomerOrderStatus.DRAFT,
    FactoryCustomerOrderStatus.CANCELLED
  ],
  [FactoryCustomerOrderStatus.ROUTED]: [
    FactoryCustomerOrderStatus.IN_PRODUCTION,
    FactoryCustomerOrderStatus.CANCELLED
  ],
  [FactoryCustomerOrderStatus.IN_PRODUCTION]: [
    FactoryCustomerOrderStatus.COMPLETED,
    FactoryCustomerOrderStatus.CANCELLED
  ],
  [FactoryCustomerOrderStatus.COMPLETED]: [
    FactoryCustomerOrderStatus.SHIPPED
  ],
  [FactoryCustomerOrderStatus.SHIPPED]: [
    // Terminal state - no further transitions allowed
  ],
  [FactoryCustomerOrderStatus.CANCELLED]: [
    // Terminal state - no further transitions allowed
  ]
};

/**
 * Validates if a status transition is allowed
 * @param currentStatus - The current order status
 * @param newStatus - The desired new status
 * @returns boolean indicating if the transition is valid
 */
export function isValidStatusTransition(
  currentStatus: FactoryCustomerOrderStatus,
  newStatus: FactoryCustomerOrderStatus
): boolean {
  // Allow staying in the same status (no-op)
  if (currentStatus === newStatus) {
    return true;
  }

  const allowedTransitions = ORDER_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions.includes(newStatus);
}

/**
 * Gets all valid next statuses for a given current status
 * @param currentStatus - The current order status
 * @returns Array of valid next statuses
 */
export function getValidNextStatuses(currentStatus: FactoryCustomerOrderStatus): FactoryCustomerOrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Validates status transition and throws error if invalid
 * @param currentStatus - The current order status
 * @param newStatus - The desired new status
 * @param orderId - Order ID for error context
 * @throws Error if transition is invalid
 */
export function validateStatusTransition(
  currentStatus: FactoryCustomerOrderStatus,
  newStatus: FactoryCustomerOrderStatus,
  orderId?: number | string
): void {
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    const orderContext = orderId ? ` for order ${orderId}` : '';
    const validStatuses = getValidNextStatuses(currentStatus);
    
    throw new Error(
      `Invalid status transition${orderContext}: cannot change from '${currentStatus}' to '${newStatus}'. ` +
      `Valid transitions from '${currentStatus}' are: ${validStatuses.join(', ')}`
    );
  }
}

/**
 * Checks if a status is a terminal state (no further transitions allowed)
 * @param status - The status to check
 * @returns boolean indicating if the status is terminal
 */
export function isTerminalStatus(status: FactoryCustomerOrderStatus): boolean {
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[status];
  return allowedTransitions.length === 0;
}

/**
 * Gets workflow-specific statuses for sales rep workflow
 */
export const WORKFLOW_STATUSES = {
  SALES_REP_CREATED: [FactoryCustomerOrderStatus.DRAFT, FactoryCustomerOrderStatus.PENDING_APPROVAL],
  ADMIN_REVIEW: [FactoryCustomerOrderStatus.PENDING_APPROVAL],
  ADMIN_APPROVED: [FactoryCustomerOrderStatus.APPROVED],
  ADMIN_REJECTED: [FactoryCustomerOrderStatus.REJECTED],
  FACTORY_ROUTED: [FactoryCustomerOrderStatus.ROUTED],
  IN_PRODUCTION: [FactoryCustomerOrderStatus.IN_PRODUCTION],
  COMPLETED: [FactoryCustomerOrderStatus.COMPLETED, FactoryCustomerOrderStatus.SHIPPED],
  TERMINAL: [FactoryCustomerOrderStatus.SHIPPED, FactoryCustomerOrderStatus.CANCELLED]
} as const;