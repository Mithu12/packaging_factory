// Customer Order Management Types

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderDate: string;
  requiredDate: string;
  status:
    | "draft"
    | "pending"
    | "quoted"
    | "approved"
    | "rejected"
    | "in_production"
    | "completed"
    | "shipped";
  priority: "low" | "medium" | "high" | "urgent";
  totalValue: number;
  currency: string;
  salesPerson: string;
  notes?: string;
  terms?: string;
  paymentTerms: "net_15" | "net_30" | "net_45" | "net_60" | "cash" | "advance";
  shippingAddress: Address;
  billingAddress: Address;
  lineItems: OrderLineItem[];
  attachments: string[];
  createdBy: string;
  createdDate: string;
  updatedBy?: string;
  updatedDate?: string;
  approvedBy?: string;
  approvedDate?: string;
}

export interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  discountAmount?: number;
  lineTotal: number;
  unitOfMeasure: string;
  specifications?: string;
  deliveryDate?: string;
  isOptional: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  contactName?: string;
  contactPhone?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: Address;
  creditLimit?: number;
  paymentTerms: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  unitPrice: number;
  unitOfMeasure: string;
  isActive: boolean;
  stockQuantity?: number;
  leadTimeDays?: number;
}

export interface CreateOrderRequest {
  customerId: string;
  requiredDate: string;
  priority: "low" | "medium" | "high" | "urgent";
  notes?: string;
  terms?: string;
  paymentTerms: "net_15" | "net_30" | "net_45" | "net_60" | "cash" | "advance";
  shippingAddress: Address;
  billingAddress: Address;
  lineItems: CreateOrderLineItemRequest[];
}

export interface CreateOrderLineItemRequest {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  specifications?: string;
  deliveryDate?: string;
  isOptional?: boolean;
}

export interface UpdateOrderRequest {
  requiredDate?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  notes?: string;
  terms?: string;
  paymentTerms?: "net_15" | "net_30" | "net_45" | "net_60" | "cash" | "advance";
  shippingAddress?: Address;
  billingAddress?: Address;
  lineItems?: UpdateOrderLineItemRequest[];
}

export interface UpdateOrderLineItemRequest {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  specifications?: string;
  deliveryDate?: string;
  isOptional?: boolean;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  quotedOrders: number;
  approvedOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  totalValue: number;
  averageOrderValue: number;
  onTimeDelivery: number;
}

export interface OrderFilter {
  status?: string;
  priority?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  salesPerson?: string;
}

export interface OrderSearch {
  searchTerm: string;
  filters: OrderFilter;
  sortBy: "orderDate" | "requiredDate" | "totalValue" | "customerName";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}
