import * as yup from 'yup';

export const createInvoiceValidation = yup.object({
  body: yup.object({
    order_id: yup.number().required('Order ID is required').positive('Invalid order ID'),
  }),
});

export const sendInvoiceValidation = yup.object({
  params: yup.object({
    id: yup.number().required('Invoice ID is required').positive('Invalid invoice ID'),
  }),
});

export const invoiceFiltersValidation = yup.object({
  query: yup.object({
    customer_id: yup.number().positive('Invalid customer ID'),
    status: yup.string().oneOf(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
    date_from: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    date_to: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    min_amount: yup.number().min(0),
    max_amount: yup.number().min(0),
    overdue_only: yup.boolean(),
    page: yup.number().min(1).default(1),
    limit: yup.number().min(1).max(100).default(10),
  }),
});

