import Joi from 'joi';

// Attendance record type validation schema
export const attendanceRecordTypeSchema = Joi.string().valid(
  'check_in',
  'check_out',
  'break_start',
  'break_end',
  'overtime_start',
  'overtime_end'
).required();

// Attendance status validation schema
export const attendanceStatusSchema = Joi.string().valid(
  'present',
  'absent',
  'late',
  'half_day',
  'overtime'
).required();

// Work schedule type validation schema
export const workScheduleTypeSchema = Joi.string().valid(
  'regular',
  'shift',
  'flexible',
  'remote'
).required();

// Create work schedule validation schema
export const createWorkScheduleSchema = Joi.object({
  name: Joi.string().max(255).required(),
  code: Joi.string().max(50).required(),
  schedule_type: workScheduleTypeSchema,
  start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:MM format
  end_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:MM format
  break_start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  break_end_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  working_days: Joi.array().items(
    Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ).min(1).required(),
  is_active: Joi.boolean().optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// Update work schedule validation schema
export const updateWorkScheduleSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  code: Joi.string().max(50).optional(),
  schedule_type: workScheduleTypeSchema.optional(),
  start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  end_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  break_start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  break_end_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  working_days: Joi.array().items(
    Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ).min(1).optional(),
  is_active: Joi.boolean().optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// Create attendance record validation schema
export const createAttendanceRecordSchema = Joi.object({
  employee_id: Joi.number().required(),
  record_date: Joi.date().iso().required(),
  record_type: attendanceRecordTypeSchema,
  record_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  location: Joi.string().max(255).optional(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Update attendance record validation schema
export const updateAttendanceRecordSchema = Joi.object({
  record_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  location: Joi.string().max(255).optional(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Mark attendance validation schema (bulk operation)
export const markAttendanceSchema = Joi.object({
  employee_ids: Joi.array().items(Joi.number()).min(1).required(),
  record_date: Joi.date().iso().required(),
  status: attendanceStatusSchema,
  check_in_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  check_out_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Attendance records query validation schema
export const attendanceRecordsQuerySchema = Joi.object({
  employee_id: Joi.number().optional(),
  record_date_from: Joi.date().iso().optional(),
  record_date_to: Joi.date().iso().optional(),
  record_type: attendanceRecordTypeSchema.optional(),
  status: attendanceStatusSchema.optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort_by: Joi.string().valid('record_date', 'record_time', 'record_type').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional(),
});

// Attendance summary query validation schema
export const attendanceSummaryQuerySchema = Joi.object({
  employee_id: Joi.number().optional(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
  group_by: Joi.string().valid('day', 'week', 'month').optional(),
});

// Attendance dashboard query validation schema
export const attendanceDashboardQuerySchema = Joi.object({
  date: Joi.date().iso().optional(),
  department_id: Joi.number().optional(),
  employee_id: Joi.number().optional(),
});

// Attendance report query validation schema
export const attendanceReportQuerySchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
  employee_ids: Joi.array().items(Joi.number()).optional(),
  department_ids: Joi.array().items(Joi.number()).optional(),
  format: Joi.string().valid('summary', 'detailed', 'excel').optional(),
});

// Work schedule query validation schema
export const workScheduleQuerySchema = Joi.object({
  schedule_type: workScheduleTypeSchema.optional(),
  is_active: Joi.boolean().optional(),
  working_days: Joi.array().items(
    Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
  ).optional(),
});

// Bulk update attendance records validation schema
export const bulkUpdateAttendanceSchema = Joi.object({
  record_ids: Joi.array().items(Joi.number()).min(1).required(),
  updates: Joi.object({
    record_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    location: Joi.string().max(255).optional(),
    notes: Joi.string().max(1000).optional().allow(''),
  }).required(),
});

// Custom validation for attendance record time
export const attendanceRecordTimeSchema = Joi.object({
  record_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
}).custom((value, helpers) => {
  // Additional business logic validation can be added here
  // For example, validating that check-out time is after check-in time
  return value;
}, 'Attendance record time validation');

// Work schedule time validation
export const workScheduleTimeSchema = Joi.object({
  start_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  end_time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
}).custom((value, helpers) => {
  // Additional validation for work schedule times can be added here
  // For example, validating that end time is after start time
  return value;
}, 'Work schedule time validation');

// Attendance date range validation
export const attendanceDateRangeSchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
}).custom((value, helpers) => {
  // Additional validation for date ranges can be added here
  // For example, validating that date range doesn't exceed maximum allowed period
  return value;
}, 'Attendance date range validation');
