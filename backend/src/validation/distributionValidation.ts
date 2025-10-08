import Joi from 'joi';

// Distribution Center Validation
export const createDistributionCenterSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid('warehouse', 'distribution_center', 'retail_store', 'cross_dock').default('warehouse'),
  address: Joi.string().max(500).optional().allow(null, ''),
  city: Joi.string().max(100).optional().allow(null, ''),
  state: Joi.string().max(100).optional().allow(null, ''),
  zip_code: Joi.string().max(20).optional().allow(null, ''),
  country: Joi.string().max(100).default('USA'),
  latitude: Joi.number().min(-90).max(90).precision(8).optional().allow(null),
  longitude: Joi.number().min(-180).max(180).precision(8).optional().allow(null),
  contact_person: Joi.string().max(255).optional().allow(null, ''),
  phone: Joi.string().max(50).optional().allow(null, ''),
  email: Joi.string().email().max(255).optional().allow(null, ''),
  capacity_volume: Joi.number().positive().precision(2).optional().allow(null),
  capacity_weight: Joi.number().positive().precision(2).optional().allow(null),
  operating_hours: Joi.object().pattern(
    Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    })
  ).optional().allow(null),
  facilities: Joi.array().items(Joi.string().max(100)).optional().allow(null),
  manager_id: Joi.number().integer().positive().optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

export const updateDistributionCenterSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  type: Joi.string().valid('warehouse', 'distribution_center', 'retail_store', 'cross_dock').optional(),
  address: Joi.string().max(500).optional().allow(null, ''),
  city: Joi.string().max(100).optional().allow(null, ''),
  state: Joi.string().max(100).optional().allow(null, ''),
  zip_code: Joi.string().max(20).optional().allow(null, ''),
  country: Joi.string().max(100).optional(),
  latitude: Joi.number().min(-90).max(90).precision(8).optional().allow(null),
  longitude: Joi.number().min(-180).max(180).precision(8).optional().allow(null),
  contact_person: Joi.string().max(255).optional().allow(null, ''),
  phone: Joi.string().max(50).optional().allow(null, ''),
  email: Joi.string().email().max(255).optional().allow(null, ''),
  capacity_volume: Joi.number().positive().precision(2).optional().allow(null),
  capacity_weight: Joi.number().positive().precision(2).optional().allow(null),
  operating_hours: Joi.object().pattern(
    Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
    Joi.object({
      open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    })
  ).optional().allow(null),
  facilities: Joi.array().items(Joi.string().max(100)).optional().allow(null),
  manager_id: Joi.number().integer().positive().optional().allow(null),
  status: Joi.string().valid('active', 'inactive', 'maintenance').optional(),
  is_primary: Joi.boolean().optional(),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

// Product Location Validation
export const createProductLocationSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  distribution_center_id: Joi.number().integer().positive().required(),
  current_stock: Joi.number().min(0).precision(2).required(),
  min_stock_level: Joi.number().min(0).precision(2).default(0),
  max_stock_level: Joi.number().min(0).precision(2).optional().allow(null),
  reorder_point: Joi.number().min(0).precision(2).optional().allow(null),
  location_in_warehouse: Joi.string().max(100).optional().allow(null, '')
});

export const updateProductLocationSchema = Joi.object({
  current_stock: Joi.number().min(0).precision(2).optional(),
  min_stock_level: Joi.number().min(0).precision(2).optional(),
  max_stock_level: Joi.number().min(0).precision(2).optional().allow(null),
  reorder_point: Joi.number().min(0).precision(2).optional().allow(null),
  location_in_warehouse: Joi.string().max(100).optional().allow(null, ''),
  status: Joi.string().valid('active', 'inactive', 'blocked').optional()
});

// Stock Transfer Validation
export const createStockTransferSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  from_center_id: Joi.number().integer().positive().optional().allow(null),
  to_center_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().positive().precision(2).required(),
  unit_cost: Joi.number().positive().precision(2).optional().allow(null),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  tracking_number: Joi.string().max(100).optional().allow(null, ''),
  carrier: Joi.string().max(100).optional().allow(null, ''),
  shipping_cost: Joi.number().min(0).precision(2).optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, '')
}).custom((value, helpers) => {
  if (value.from_center_id === value.to_center_id) {
    return helpers.error('custom.same_centers');
  }
  return value;
}, 'Same centers validation').messages({
  'custom.same_centers': 'From and to distribution centers cannot be the same'
});

export const updateStockTransferSchema = Joi.object({
  quantity: Joi.number().positive().precision(2).optional(),
  unit_cost: Joi.number().positive().precision(2).optional().allow(null),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  status: Joi.string().valid('', 'pending', 'approved', 'shipped', 'in_transit', 'received', 'cancelled').optional(),
  shipped_date: Joi.date().iso().optional().allow(null),
  received_date: Joi.date().iso().optional().allow(null),
  tracking_number: Joi.string().max(100).optional().allow(null, ''),
  carrier: Joi.string().max(100).optional().allow(null, ''),
  shipping_cost: Joi.number().min(0).precision(2).optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

// Distribution Route Validation
export const createDistributionRouteSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  from_center_id: Joi.number().integer().positive().required(),
  to_center_id: Joi.number().integer().positive().required(),
  distance_km: Joi.number().positive().precision(2).optional().allow(null),
  estimated_transit_time: Joi.number().integer().positive().optional().allow(null),
  transport_type: Joi.string().max(50).optional().allow(null, ''),
  carrier: Joi.string().max(255).optional().allow(null, ''),
  cost_per_kg: Joi.number().positive().precision(4).optional().allow(null),
  cost_per_km: Joi.number().positive().precision(4).optional().allow(null),
  max_weight: Joi.number().positive().precision(2).optional().allow(null),
  max_volume: Joi.number().positive().precision(2).optional().allow(null),
  service_days: Joi.array().items(Joi.number().integer().min(1).max(7)).optional().allow(null),
  cutoff_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, '')
}).custom((value, helpers) => {
  if (value.from_center_id === value.to_center_id) {
    return helpers.error('custom.same_centers');
  }
  return value;
}, 'Same centers validation').messages({
  'custom.same_centers': 'From and to distribution centers cannot be the same'
});

export const updateDistributionRouteSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  distance_km: Joi.number().positive().precision(2).optional().allow(null),
  estimated_transit_time: Joi.number().integer().positive().optional().allow(null),
  transport_type: Joi.string().max(50).optional().allow(null, ''),
  carrier: Joi.string().max(255).optional().allow(null, ''),
  cost_per_kg: Joi.number().positive().precision(4).optional().allow(null),
  cost_per_km: Joi.number().positive().precision(4).optional().allow(null),
  max_weight: Joi.number().positive().precision(2).optional().allow(null),
  max_volume: Joi.number().positive().precision(2).optional().allow(null),
  service_days: Joi.array().items(Joi.number().integer().min(1).max(7)).optional().allow(null),
  cutoff_time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional().allow(null, ''),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional()
});

// Shipment Validation
export const createShipmentSchema = Joi.object({
  route_id: Joi.number().integer().positive().required(),
  shipment_type: Joi.string().valid('regular', 'express', 'priority', 'emergency').default('regular'),
  planned_departure: Joi.date().iso().optional().allow(null),
  planned_arrival: Joi.date().iso().optional().allow(null),
  tracking_number: Joi.string().max(100).optional().allow(null, ''),
  carrier: Joi.string().max(100).optional().allow(null, ''),
  driver_name: Joi.string().max(255).optional().allow(null, ''),
  driver_phone: Joi.string().max(50).optional().allow(null, ''),
  vehicle_info: Joi.string().max(255).optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

export const updateShipmentSchema = Joi.object({
  shipment_type: Joi.string().valid('regular', 'express', 'priority', 'emergency').optional(),
  status: Joi.string().valid('planning', 'ready', 'in_transit', 'delivered', 'cancelled', 'delayed').optional(),
  planned_departure: Joi.date().iso().optional().allow(null),
  planned_arrival: Joi.date().iso().optional().allow(null),
  actual_departure: Joi.date().iso().optional().allow(null),
  actual_arrival: Joi.date().iso().optional().allow(null),
  total_weight: Joi.number().min(0).precision(2).optional().allow(null),
  total_volume: Joi.number().min(0).precision(2).optional().allow(null),
  total_cost: Joi.number().min(0).precision(2).optional().allow(null),
  tracking_number: Joi.string().max(100).optional().allow(null, ''),
  carrier: Joi.string().max(100).optional().allow(null, ''),
  driver_name: Joi.string().max(255).optional().allow(null, ''),
  driver_phone: Joi.string().max(50).optional().allow(null, ''),
  vehicle_info: Joi.string().max(255).optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

// Shipment Item Validation
export const createShipmentItemSchema = Joi.object({
  shipment_id: Joi.number().integer().positive().required(),
  transfer_id: Joi.number().integer().positive().optional().allow(null),
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().positive().precision(2).required(),
  unit_weight: Joi.number().positive().precision(2).optional().allow(null),
  unit_volume: Joi.number().positive().precision(2).optional().allow(null),
  condition_on_departure: Joi.string().valid('good', 'damaged', 'expired').default('good'),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

// Order Fulfillment Validation
export const createOrderFulfillmentSchema = Joi.object({
  sales_order_id: Joi.number().integer().positive().required(),
  distribution_center_id: Joi.number().integer().positive().required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  delivery_address: Joi.string().max(500).optional().allow(null, ''),
  delivery_instructions: Joi.string().max(1000).optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

export const updateOrderFulfillmentSchema = Joi.object({
  status: Joi.string().valid('pending', 'picking', 'packed', 'shipped', 'delivered', 'cancelled').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  shipment_id: Joi.number().integer().positive().optional().allow(null),
  assigned_picker: Joi.number().integer().positive().optional().allow(null),
  assigned_packer: Joi.number().integer().positive().optional().allow(null),
  tracking_number: Joi.string().max(100).optional().allow(null, ''),
  shipping_cost: Joi.number().min(0).precision(2).optional().allow(null),
  delivery_address: Joi.string().max(500).optional().allow(null, ''),
  delivery_instructions: Joi.string().max(1000).optional().allow(null, ''),
  pick_start_time: Joi.date().iso().optional().allow(null),
  pick_complete_time: Joi.date().iso().optional().allow(null),
  pack_complete_time: Joi.date().iso().optional().allow(null),
  ship_time: Joi.date().iso().optional().allow(null),
  delivery_time: Joi.date().iso().optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

// Product Allocation Validation
export const productAllocationSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().positive().precision(2).required(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  preferred_center_ids: Joi.array().items(Joi.number().integer().positive()).optional().allow(null),
  delivery_location: Joi.object({
    latitude: Joi.number().min(-90).max(90).precision(8).required(),
    longitude: Joi.number().min(-180).max(180).precision(8).required()
  }).optional().allow(null)
});

export const bulkProductAllocationSchema = Joi.array().items(productAllocationSchema).min(1).max(100);

// Query Parameter Validation
export const distributionCenterQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(255).optional().allow(''),
  type: Joi.string().valid('warehouse', 'distribution_center', 'retail_store', 'cross_dock').optional(),
  status: Joi.string().valid('active', 'inactive', 'maintenance').optional(),
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(100).optional().allow(''),
  sortBy: Joi.string().valid('name', 'type', 'city', 'state', 'created_at', 'updated_at').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

export const productLocationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
  search: Joi.string().max(255).optional().allow(''),
  distribution_center_id: Joi.number().integer().positive().optional(),
  product_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('active', 'inactive', 'blocked').optional(),
  stock_status: Joi.string().valid('low_stock', 'out_of_stock', 'in_stock').optional(),
  sortBy: Joi.string().valid('product_name', 'center_name', 'current_stock', 'available_stock', 'updated_at').default('product_name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

export const stockTransferQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(255).optional().allow(''),
  product_id: Joi.number().integer().positive().optional(),
  from_center_id: Joi.number().integer().positive().optional(),
  to_center_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('', 'pending', 'approved', 'shipped', 'in_transit', 'received', 'cancelled').optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  sortBy: Joi.string().valid('transfer_number', 'product_name', 'quantity', 'status', 'request_date', 'updated_at').default('request_date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});
