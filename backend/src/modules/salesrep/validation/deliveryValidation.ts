import * as yup from 'yup';

export const createDeliveryValidation = yup.object({
  body: yup.object({
    order_id: yup.number().required('Order ID is required').positive('Invalid order ID'),
    delivery_address: yup.string().required('Delivery address is required'),
    contact_person: yup.string().required('Contact person is required'),
    contact_phone: yup.string().required('Contact phone is required'),
    tracking_number: yup.string().nullable(),
    courier_service: yup.string().nullable(),
    notes: yup.string().nullable(),
  }),
});

export const updateDeliveryValidation = yup.object({
  params: yup.object({
    id: yup.number().required('Delivery ID is required').positive('Invalid delivery ID'),
  }),
  body: yup.object({
    delivery_address: yup.string(),
    contact_person: yup.string(),
    contact_phone: yup.string(),
    tracking_number: yup.string().nullable(),
    courier_service: yup.string().nullable(),
    status: yup.string().oneOf(['pending', 'in_transit', 'delivered', 'cancelled']),
    notes: yup.string().nullable(),
  }),
});

export const updateDeliveryStatusValidation = yup.object({
  params: yup.object({
    id: yup.number().required('Delivery ID is required').positive('Invalid delivery ID'),
  }),
  body: yup.object({
    status: yup.string().required('Status is required').oneOf(['pending', 'in_transit', 'delivered', 'cancelled']),
    notes: yup.string().nullable(),
  }),
});

export const deliveryFiltersValidation = yup.object({
  query: yup.object({
    customer_id: yup.number().positive('Invalid customer ID'),
    status: yup.string().oneOf(['pending', 'in_transit', 'delivered', 'cancelled']),
    date_from: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    date_to: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    courier_service: yup.string(),
    page: yup.number().min(1).default(1),
    limit: yup.number().min(1).max(100).default(10),
  }),
});

