// =====================================================
// Distribution System Types
// =====================================================

export interface DistributionCenter {
  id: number;
  code: string;
  name: string;
  type: 'warehouse' | 'distribution_center' | 'retail_store' | 'cross_dock';
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contact_person?: string;
  phone?: string;
  email?: string;
  capacity_volume?: number; // cubic meters
  capacity_weight?: number; // kg
  operating_hours?: Record<string, { open: string; close: string }>;
  facilities?: string[]; // ["loading_dock", "refrigeration", "security"]
  status: 'active' | 'inactive' | 'maintenance';
  is_primary: boolean;
  manager_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDistributionCenterRequest {
  name: string;
  type?: 'warehouse' | 'distribution_center' | 'retail_store' | 'cross_dock';
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contact_person?: string;
  phone?: string;
  email?: string;
  capacity_volume?: number;
  capacity_weight?: number;
  operating_hours?: Record<string, { open: string; close: string }>;
  facilities?: string[];
  manager_id?: number;
  notes?: string;
}

export interface UpdateDistributionCenterRequest extends Partial<CreateDistributionCenterRequest> {
  status?: 'active' | 'inactive' | 'maintenance';
  is_primary?: boolean;
}

export interface ProductLocation {
  id: number;
  product_id: number;
  distribution_center_id: number;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point?: number;
  location_in_warehouse?: string; // e.g., "A-12-B", "Zone-C-Shelf-5"
  last_count_date?: string;
  last_movement_date?: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
  center_name?: string;
  center_type?: string;
}

export interface CreateProductLocationRequest {
  product_id: number;
  distribution_center_id: number;
  current_stock: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  location_in_warehouse?: string;
}

export interface UpdateProductLocationRequest extends Partial<CreateProductLocationRequest> {
  status?: 'active' | 'inactive' | 'blocked';
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  product_id: number;
  from_center_id?: number;
  to_center_id: number;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  request_date: string;
  shipped_date?: string;
  received_date?: string;
  status: 'pending' | 'approved' | 'shipped' | 'in_transit' | 'received' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requested_by: number;
  approved_by?: number;
  shipped_by?: number;
  received_by?: number;
  tracking_number?: string;
  carrier?: string;
  shipping_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
  from_center_name?: string;
  to_center_name?: string;
  requested_by_name?: string;
  approved_by_name?: string;
}

export interface CreateStockTransferRequest {
  product_id: number;
  from_center_id?: number;
  to_center_id: number;
  quantity: number;
  unit_cost?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tracking_number?: string;
  carrier?: string;
  shipping_cost?: number;
  notes?: string;
}

export interface UpdateStockTransferRequest extends Partial<CreateStockTransferRequest> {
  status?: 'pending' | 'approved' | 'shipped' | 'in_transit' | 'received' | 'cancelled';
  shipped_date?: string;
  received_date?: string;
  approved_by?: number;
  shipped_by?: number;
  received_by?: number;
}

export interface DistributionRoute {
  id: number;
  route_code: string;
  name: string;
  from_center_id: number;
  to_center_id: number;
  distance_km?: number;
  estimated_transit_time?: number; // hours
  transport_type?: string; // truck, air, rail, sea
  carrier?: string;
  cost_per_kg?: number;
  cost_per_km?: number;
  max_weight?: number;
  max_volume?: number;
  service_days?: number[]; // [1,2,3,4,5] for Mon-Fri
  cutoff_time?: string; // "14:30"
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  // Joined fields
  from_center_name?: string;
  to_center_name?: string;
}

export interface CreateDistributionRouteRequest {
  name: string;
  from_center_id: number;
  to_center_id: number;
  distance_km?: number;
  estimated_transit_time?: number;
  transport_type?: string;
  carrier?: string;
  cost_per_kg?: number;
  cost_per_km?: number;
  max_weight?: number;
  max_volume?: number;
  service_days?: number[];
  cutoff_time?: string;
}

export interface UpdateDistributionRouteRequest extends Partial<CreateDistributionRouteRequest> {
  status?: 'active' | 'inactive' | 'suspended';
}

export interface Shipment {
  id: number;
  shipment_number: string;
  route_id: number;
  from_center_id: number;
  to_center_id: number;
  shipment_type: 'regular' | 'express' | 'priority' | 'emergency';
  total_weight?: number;
  total_volume?: number;
  total_cost?: number;
  planned_departure?: string;
  actual_departure?: string;
  planned_arrival?: string;
  actual_arrival?: string;
  status: 'planning' | 'ready' | 'in_transit' | 'delivered' | 'cancelled' | 'delayed';
  tracking_number?: string;
  carrier?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_info?: string;
  created_by: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  route_name?: string;
  from_center_name?: string;
  to_center_name?: string;
  created_by_name?: string;
  items_count?: number;
}

export interface CreateShipmentRequest {
  route_id: number;
  shipment_type?: 'regular' | 'express' | 'priority' | 'emergency';
  planned_departure?: string;
  planned_arrival?: string;
  tracking_number?: string;
  carrier?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_info?: string;
  notes?: string;
}

export interface UpdateShipmentRequest extends Partial<CreateShipmentRequest> {
  status?: 'planning' | 'ready' | 'in_transit' | 'delivered' | 'cancelled' | 'delayed';
  actual_departure?: string;
  actual_arrival?: string;
  total_weight?: number;
  total_volume?: number;
  total_cost?: number;
}

export interface ShipmentItem {
  id: number;
  shipment_id: number;
  transfer_id?: number;
  product_id: number;
  quantity: number;
  unit_weight?: number;
  unit_volume?: number;
  total_weight?: number;
  total_volume?: number;
  condition_on_departure: 'good' | 'damaged' | 'expired';
  condition_on_arrival?: 'good' | 'damaged' | 'expired';
  notes?: string;
  created_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
}

export interface CreateShipmentItemRequest {
  shipment_id: number;
  transfer_id?: number;
  product_id: number;
  quantity: number;
  unit_weight?: number;
  unit_volume?: number;
  condition_on_departure?: 'good' | 'damaged' | 'expired';
  notes?: string;
}

export interface OrderFulfillment {
  id: number;
  sales_order_id: number;
  fulfillment_number: string;
  distribution_center_id: number;
  shipment_id?: number;
  status: 'pending' | 'picking' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  pick_start_time?: string;
  pick_complete_time?: string;
  pack_complete_time?: string;
  ship_time?: string;
  delivery_time?: string;
  assigned_picker?: number;
  assigned_packer?: number;
  tracking_number?: string;
  shipping_cost?: number;
  delivery_address?: string;
  delivery_instructions?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  order_number?: string;
  customer_name?: string;
  center_name?: string;
  picker_name?: string;
  packer_name?: string;
  items_count?: number;
}

export interface CreateOrderFulfillmentRequest {
  sales_order_id: number;
  distribution_center_id: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  delivery_address?: string;
  delivery_instructions?: string;
  notes?: string;
}

export interface UpdateOrderFulfillmentRequest extends Partial<CreateOrderFulfillmentRequest> {
  status?: 'pending' | 'picking' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  shipment_id?: number;
  assigned_picker?: number;
  assigned_packer?: number;
  tracking_number?: string;
  shipping_cost?: number;
  pick_start_time?: string;
  pick_complete_time?: string;
  pack_complete_time?: string;
  ship_time?: string;
  delivery_time?: string;
}

export interface FulfillmentItem {
  id: number;
  fulfillment_id: number;
  sales_order_item_id: number;
  product_id: number;
  requested_quantity: number;
  picked_quantity: number;
  shipped_quantity: number;
  location_in_warehouse?: string;
  pick_notes?: string;
  created_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
  unit_price?: number;
}

// Distribution Analytics Types
export interface DistributionCenterStats {
  id: number;
  name: string;
  type: string;
  status: string;
  total_products: number;
  total_stock: number;
  total_inventory_value: number;
  low_stock_products: number;
  outbound_transfers: number;
  inbound_transfers: number;
}

export interface ProductAllocationView {
  product_id: number;
  sku: string;
  product_name: string;
  distribution_center_id: number;
  center_name: string;
  center_type: string;
  city?: string;
  state?: string;
  available_stock: number;
  reserved_stock: number;
  current_stock: number;
  latitude?: number;
  longitude?: number;
  stock_status: 'out_of_stock' | 'low_stock' | 'in_stock';
}

// Query Parameters
export interface DistributionCenterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  city?: string;
  state?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductLocationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  distribution_center_id?: number;
  product_id?: number;
  status?: string;
  stock_status?: 'low_stock' | 'out_of_stock' | 'in_stock';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StockTransferQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  product_id?: number;
  from_center_id?: number;
  to_center_id?: number;
  status?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ShipmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  route_id?: number;
  from_center_id?: number;
  to_center_id?: number;
  status?: string;
  shipment_type?: string;
  date_from?: string;
  date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrderFulfillmentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sales_order_id?: number;
  distribution_center_id?: number;
  status?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Distribution Algorithm Types
export interface AllocationRequest {
  product_id: number;
  quantity: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  preferred_center_ids?: number[];
  delivery_location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AllocationResult {
  product_id: number;
  allocations: {
    distribution_center_id: number;
    center_name: string;
    quantity: number;
    available_stock: number;
    distance_score?: number;
    confidence: number;
  }[];
  total_allocated: number;
  total_requested: number;
  is_fully_allocated: boolean;
  reasons: string[];
}

export interface DistributionSummary {
  total_centers: number;
  active_centers: number;
  total_products_distributed: number;
  total_inventory_value: number;
  pending_transfers: number;
  active_shipments: number;
  pending_fulfillments: number;
  low_stock_locations: number;
}
