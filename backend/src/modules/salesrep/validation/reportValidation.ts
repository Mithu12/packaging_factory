import * as yup from 'yup';

export const generateReportValidation = yup.object({
  body: yup.object({
    report_type: yup.string().required('Report type is required').oneOf([
      'sales_summary',
      'customer_performance',
      'order_analysis',
      'payment_collection'
    ]),
    date_from: yup.string().required('From date is required').matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    date_to: yup.string().required('To date is required').matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  }),
});

export const exportReportValidation = yup.object({
  params: yup.object({
    id: yup.number().required('Report ID is required').positive('Invalid report ID'),
  }),
  query: yup.object({
    format: yup.string().oneOf(['pdf', 'excel', 'csv']).default('pdf'),
  }),
});

export const reportFiltersValidation = yup.object({
  query: yup.object({
    report_type: yup.string().oneOf(['sales_summary', 'customer_performance', 'order_analysis', 'payment_collection']),
    date_from: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    date_to: yup.string().matches(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    page: yup.number().min(1).default(1),
    limit: yup.number().min(1).max(100).default(10),
  }),
});

