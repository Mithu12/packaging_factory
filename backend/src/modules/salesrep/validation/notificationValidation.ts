import * as yup from 'yup';

export const markNotificationAsReadValidation = yup.object({
  params: yup.object({
    id: yup.number().required('Notification ID is required').positive('Invalid notification ID'),
  }),
});

export const markAllNotificationsAsReadValidation = yup.object({
  body: yup.object({}),
});

export const notificationFiltersValidation = yup.object({
  query: yup.object({
    unread_only: yup.boolean(),
    type: yup.string().oneOf(['info', 'warning', 'error', 'success']),
    page: yup.number().min(1).default(1),
    limit: yup.number().min(1).max(100).default(10),
  }),
});

