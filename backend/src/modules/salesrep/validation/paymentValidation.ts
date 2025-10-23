import * as yup from 'yup';

export const createPaymentValidation = yup.object({
  body: yup.object({
    invoice_id: yup.number().required('Invoice ID is required').positive('Invalid invoice ID'),
    amount: yup.number().required('Amount is required').positive('Amount must be positive'),
    payment_method: yup.string().required('Payment method is required').oneOf(['cash', 'bank_transfer', 'cheque', 'credit_card']),
    reference_number: yup.string().nullable(),
    notes: yup.string().nullable(),
  }),
});

export const paymentFiltersValidation = yup.object({
  query: yup.object({
    customer_id: yup.number().positive('Invalid customer ID'),
    payment_method: yup.string().oneOf(['cash', 'bank_transfer', 'cheque', 'credit_card']),
    date_from: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    date_to: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    min_amount: yup.number().min(0),
    max_amount: yup.number().min(0),
    page: yup.number().min(1).default(1),
    limit: yup.number().min(1).max(100).default(10),
  }),
});

