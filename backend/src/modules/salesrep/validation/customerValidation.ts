import * as yup from 'yup';

export const createCustomerValidation = yup.object({
  body: yup.object({
    name: yup.string().required('Customer name is required').min(2, 'Name must be at least 2 characters'),
    email: yup.string().email('Invalid email format').nullable(),
    phone: yup.string().nullable(),
    address: yup.string().nullable(),
    city: yup.string().nullable(),
    state: yup.string().nullable(),
    postal_code: yup.string().nullable(),
    credit_limit: yup.number().min(0, 'Credit limit must be non-negative').default(0),
  }),
});

export const updateCustomerValidation = yup.object({
  params: yup.object({
    id: yup.number().required('Customer ID is required').positive('Invalid customer ID'),
  }),
  body: yup.object({
    name: yup.string().min(2, 'Name must be at least 2 characters'),
    email: yup.string().email('Invalid email format').nullable(),
    phone: yup.string().nullable(),
    address: yup.string().nullable(),
    city: yup.string().nullable(),
    state: yup.string().nullable(),
    postal_code: yup.string().nullable(),
    credit_limit: yup.number().min(0, 'Credit limit must be non-negative'),
  }),
});

export const customerFiltersValidation = yup.object({
  query: yup.object({
    search: yup.string(),
    city: yup.string(),
    state: yup.string(),
    credit_limit_min: yup.number().min(0),
    credit_limit_max: yup.number().min(0),
    balance_min: yup.number().min(0),
    balance_max: yup.number().min(0),
    page: yup.number().min(1).default(1),
    limit: yup.number().min(1).max(100).default(10),
  }),
});

