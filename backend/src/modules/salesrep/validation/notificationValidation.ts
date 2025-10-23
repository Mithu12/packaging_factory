import Joi from 'joi';

// Mark notification as read validation schema (for body)
export const markNotificationAsReadSchema = Joi.object({
  // No body validation needed for mark as read
});

// Mark all notifications as read validation schema
export const markAllNotificationsAsReadSchema = Joi.object({
  // No body validation needed for mark all as read
});

// Notification filters validation schema
export const notificationFiltersSchema = Joi.object({
  unread_only: Joi.boolean().optional().messages({
    'boolean.base': 'Unread only must be a boolean',
  }),
  type: Joi.string().valid('info', 'warning', 'error', 'success').optional().messages({
    'any.only': 'Type must be one of: info, warning, error, success',
  }),
  page: Joi.number().integer().min(1).optional().default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).optional().default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
});

// Parameter validation schemas
export const notificationIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Notification ID must be a number',
    'number.integer': 'Notification ID must be an integer',
    'number.positive': 'Notification ID must be positive',
    'any.required': 'Notification ID is required',
  }),
});

