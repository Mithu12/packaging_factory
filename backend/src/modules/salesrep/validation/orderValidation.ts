import * as yup from 'yup';

export const createOrderValidation = yup.object({
  body: yup.object({
    customer_id: yup.number().required('Customer ID is required').positive('Invalid customer ID'),
    items: yup.array().of(
      yup.object({
        product_id: yup.number().positive('Invalid product ID').nullable(),
        product_name: yup.string().required('Product name is required'),
        quantity: yup.number().required('Quantity is required').positive('Quantity must be positive'),
        unit_price: yup.number().required('Unit price is required').min(0, 'Unit price must be non-negative'),
        discount: yup.number().min(0, 'Discount must be non-negative').default(0),
      })
    ).min(1, 'Order must have at least one item'),
    discount_amount: yup.number().min(0, 'Discount amount must be non-negative').default(0),
    tax_amount: yup.number().min(0, 'Tax amount must be non-negative').default(0),
    notes: yup.string().nullable(),
  }),
});

export const updateOrderValidation = yup.object({
  params: yup.object({
    id: yup.number().required('Order ID is required').positive('Invalid order ID'),
  }),
  body: yup.object({
    customer_id: yup.number().positive('Invalid customer ID'),
    items: yup.array().of(
      yup.object({
        product_id: yup.number().positive('Invalid product ID').nullable(),
        product_name: yup.string().required('Product name is required'),
        quantity: yup.number().required('Quantity is required').positive('Quantity must be positive'),
        unit_price: yup.number().required('Unit price is required').min(0, 'Unit price must be non-negative'),
        discount: yup.number().min(0, 'Discount must be non-negative').default(0),
      })
    ).min(1, 'Order must have at least one item'),
    discount_amount: yup.number().min(0, 'Discount amount must be non-negative'),
    tax_amount: yup.number().min(0, 'Tax amount must be non-negative'),
    status: yup.string().oneOf(['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
    notes: yup.string().nullable(),
  }),
});

export const updateOrderStatusValidation = yup.object({
  params: yup.object({
    id: yup.number().required('Order ID is required').positive('Invalid order ID'),
  }),
  body: yup.object({
    status: yup.string().required('Status is required').oneOf(['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
    notes: yup.string().nullable(),
  }),
});

export const orderFiltersValidation = yup.object({
  query: yup.object({
    customer_id: yup.number().positive('Invalid customer ID'),
    status: yup.string().oneOf(['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
    date_from: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    date_to: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    min_amount: yup.number().min(0),
    max_amount: yup.number().min(0),
    page: yup.number().min(1).default(1),
    limit: yup.number().min(1).max(100).default(10),
  }),
});

