import { LeaveType, LeaveEntitlementRule, LeaveDocumentationRequirement } from '../types';

export const mockLeaveTypes = [
  {
    id: 1,
    name: 'Annual Leave',
    code: 'AL',
    description: 'Standard annual leave entitlement for all permanent employees',
    color_code: '#22c55e', // Green
    is_active: true,

    // Entitlement Rules
    annual_allocation_days: 25,
    accrual_method: 'beginning_of_year',
    prorated_for_new_joiners: true,
    max_accumulation_days: 50,
    max_carry_forward_days: 10,
    encashment_eligible: true,
    min_days_per_request: 1,
    max_days_per_request: 15,

    // Applicability
    applicable_department_ids: undefined, // All departments
    applicable_designation_ids: undefined, // All designations
    gender_restriction: 'both',
    employment_type_restrictions: ['permanent', 'contract'],

    // Documentation
    requires_documentation: false,
    mandatory_document_types: [],
    optional_document_types: [],

    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Sick Leave',
    code: 'SL',
    description: 'Medical leave for illness or medical appointments',
    color_code: '#ef4444', // Red
    is_active: true,

    // Entitlement Rules
    annual_allocation_days: 12,
    accrual_method: 'monthly_accrual',
    prorated_for_new_joiners: true,
    max_accumulation_days: 24,
    max_carry_forward_days: 6,
    encashment_eligible: false,
    min_days_per_request: 1,
    max_days_per_request: 5,

    // Applicability
    applicable_department_ids: undefined,
    applicable_designation_ids: undefined,
    gender_restriction: 'both',
    employment_type_restrictions: ['permanent', 'contract', 'intern'],

    // Documentation
    requires_documentation: true,
    mandatory_document_types: ['Medical Certificate', 'Doctor\'s Note'],
    optional_document_types: ['Prescription', 'Lab Reports'],

    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'Casual Leave',
    code: 'CL',
    description: 'Short-term personal leave for urgent matters',
    color_code: '#f59e0b', // Amber
    is_active: true,

    // Entitlement Rules
    annual_allocation_days: 10,
    accrual_method: 'beginning_of_year',
    prorated_for_new_joiners: true,
    max_accumulation_days: 20,
    max_carry_forward_days: 3,
    encashment_eligible: false,
    min_days_per_request: 1,
    max_days_per_request: 3,

    // Applicability
    applicable_department_ids: undefined,
    applicable_designation_ids: undefined,
    gender_restriction: 'both',
    employment_type_restrictions: ['permanent', 'contract'],

    // Documentation
    requires_documentation: false,
    mandatory_document_types: [],
    optional_document_types: [],

    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Maternity Leave',
    code: 'ML',
    description: 'Leave for female employees before and after childbirth',
    color_code: '#ec4899', // Pink
    is_active: true,

    // Entitlement Rules
    annual_allocation_days: 90,
    accrual_method: 'custom',
    prorated_for_new_joiners: false,
    max_accumulation_days: 90,
    max_carry_forward_days: 0,
    encashment_eligible: false,
    min_days_per_request: 30,
    max_days_per_request: 90,

    // Applicability
    applicable_department_ids: undefined,
    applicable_designation_ids: undefined,
    gender_restriction: 'female',
    employment_type_restrictions: ['permanent'],

    // Documentation
    requires_documentation: true,
    mandatory_document_types: ['Medical Certificate', 'Birth Certificate'],
    optional_document_types: ['Ultrasound Reports', 'Doctor\'s Recommendation'],

    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 5,
    name: 'Paternity Leave',
    code: 'PL',
    description: 'Leave for male employees after childbirth',
    color_code: '#3b82f6', // Blue
    is_active: true,

    // Entitlement Rules
    annual_allocation_days: 7,
    accrual_method: 'custom',
    prorated_for_new_joiners: false,
    max_accumulation_days: 7,
    max_carry_forward_days: 0,
    encashment_eligible: false,
    min_days_per_request: 1,
    max_days_per_request: 7,

    // Applicability
    applicable_department_ids: undefined,
    applicable_designation_ids: undefined,
    gender_restriction: 'male',
    employment_type_restrictions: ['permanent'],

    // Documentation
    requires_documentation: true,
    mandatory_document_types: ['Birth Certificate'],
    optional_document_types: ['Marriage Certificate'],

    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 6,
    name: 'Emergency Leave',
    code: 'EL',
    description: 'Unplanned leave for emergencies and urgent situations',
    color_code: '#8b5cf6', // Purple
    is_active: true,

    // Entitlement Rules
    annual_allocation_days: 5,
    accrual_method: 'beginning_of_year',
    prorated_for_new_joiners: true,
    max_accumulation_days: 10,
    max_carry_forward_days: 2,
    encashment_eligible: false,
    min_days_per_request: 1,
    max_days_per_request: 3,

    // Applicability
    applicable_department_ids: undefined,
    applicable_designation_ids: undefined,
    gender_restriction: 'both',
    employment_type_restrictions: ['permanent', 'contract'],

    // Documentation
    requires_documentation: false,
    mandatory_document_types: [],
    optional_document_types: ['Supporting Documents'],

    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 7,
    name: 'Study Leave',
    code: 'STL',
    description: 'Leave for educational purposes and skill development',
    color_code: '#06b6d4', // Cyan
    is_active: false,

    // Entitlement Rules
    annual_allocation_days: 15,
    accrual_method: 'beginning_of_year',
    prorated_for_new_joiners: true,
    max_accumulation_days: 30,
    max_carry_forward_days: 5,
    encashment_eligible: false,
    min_days_per_request: 5,
    max_days_per_request: 15,

    // Applicability
    applicable_department_ids: [2], // Only IT department
    applicable_designation_ids: [4, 5], // Software Engineers only
    gender_restriction: 'both',
    employment_type_restrictions: ['permanent'],

    // Documentation
    requires_documentation: true,
    mandatory_document_types: ['Course Enrollment Letter', 'Training Certificate'],
    optional_document_types: ['Study Material', 'Course Outline'],

    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 8,
    name: 'Compensatory Leave',
    code: 'COL',
    description: 'Leave granted in lieu of overtime work',
    color_code: '#84cc16', // Lime
    is_active: true,

    // Entitlement Rules
    annual_allocation_days: 0, // No annual allocation - earned through overtime
    accrual_method: 'custom',
    prorated_for_new_joiners: false,
    max_accumulation_days: 30,
    max_carry_forward_days: 10,
    encashment_eligible: true,
    min_days_per_request: 1,
    max_days_per_request: 5,

    // Applicability
    applicable_department_ids: undefined,
    applicable_designation_ids: undefined,
    gender_restriction: 'both',
    employment_type_restrictions: ['permanent', 'contract'],

    // Documentation
    requires_documentation: true,
    mandatory_document_types: ['Overtime Approval Form'],
    optional_document_types: ['Timesheet'],

    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockLeaveEntitlementRules = [
  {
    id: 1,
    leave_type_id: 1,
    annual_allocation_days: 25,
    accrual_method: 'beginning_of_year',
    prorated_for_new_joiners: true,
    max_accumulation_days: 50,
    max_carry_forward_days: 10,
    encashment_eligible: true,
    min_days_per_request: 1,
    max_days_per_request: 15,
    applicable_department_ids: undefined,
    applicable_designation_ids: undefined,
    gender_restriction: 'both',
    employment_type_restrictions: ['permanent', 'contract'],
    effective_from: '2024-01-01',
    is_active: true,
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    leave_type_id: 4,
    annual_allocation_days: 90,
    accrual_method: 'custom',
    prorated_for_new_joiners: false,
    max_accumulation_days: 90,
    max_carry_forward_days: 0,
    encashment_eligible: false,
    min_days_per_request: 30,
    max_days_per_request: 90,
    applicable_department_ids: undefined,
    applicable_designation_ids: undefined,
    gender_restriction: 'female',
    employment_type_restrictions: ['permanent'],
    effective_from: '2024-01-01',
    is_active: true,
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const mockLeaveDocumentationRequirements = [
  {
    id: 1,
    leave_type_id: 2,
    requires_documentation: true,
    mandatory_document_types: ['Medical Certificate', 'Doctor\'s Note'],
    optional_document_types: ['Prescription', 'Lab Reports'],
    is_active: true,
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    leave_type_id: 4,
    requires_documentation: true,
    mandatory_document_types: ['Medical Certificate', 'Birth Certificate'],
    optional_document_types: ['Ultrasound Reports', 'Doctor\'s Recommendation'],
    is_active: true,
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// Helper functions
export const getLeaveTypeOptions = () =>
  mockLeaveTypes.map(leaveType => ({
    value: leaveType.id.toString(),
    label: `${leaveType.code} - ${leaveType.name}`,
  }));

export const getAccrualMethodOptions = () => [
  { value: 'beginning_of_year', label: 'Beginning of Year' },
  { value: 'monthly_accrual', label: 'Monthly Accrual' },
  { value: 'anniversary_based', label: 'Anniversary Based' },
  { value: 'custom', label: 'Custom' },
];

export const getGenderRestrictionOptions = () => [
  { value: 'both', label: 'Both Genders' },
  { value: 'male', label: 'Male Only' },
  { value: 'female', label: 'Female Only' },
];

export const getEmploymentTypeOptions = () => [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'intern', label: 'Intern' },
  { value: 'consultant', label: 'Consultant' },
];

export const getDocumentTypeOptions = () => [
  'Medical Certificate',
  'Doctor\'s Note',
  'Birth Certificate',
  'Marriage Certificate',
  'Death Certificate',
  'Prescription',
  'Lab Reports',
  'Ultrasound Reports',
  'Doctor\'s Recommendation',
  'Course Enrollment Letter',
  'Training Certificate',
  'Study Material',
  'Course Outline',
  'Overtime Approval Form',
  'Timesheet',
  'Supporting Documents',
  'Police Report',
  'Court Order',
  'Travel Documents',
  'Visa Documents',
];

export const getColorOptions = () => [
  { value: '#22c55e', label: 'Green' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#f97316', label: 'Orange' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f43f5e', label: 'Rose' },
];

// Utility functions
export const getLeaveTypeById = (id: number) =>
  mockLeaveTypes.find(leaveType => leaveType.id === id);

export const getActiveLeaveTypes = () =>
  mockLeaveTypes.filter(leaveType => leaveType.is_active);

export const getLeaveTypesByDepartment = (departmentId: number) =>
  mockLeaveTypes.filter(leaveType =>
    leaveType.is_active &&
    (!leaveType.applicable_department_ids || leaveType.applicable_department_ids.includes(departmentId))
  );

export const getLeaveTypesByDesignation = (designationId: number) =>
  mockLeaveTypes.filter(leaveType =>
    leaveType.is_active &&
    (!leaveType.applicable_designation_ids || leaveType.applicable_designation_ids.includes(designationId))
  );

export const calculateLeaveBalance = (leaveType: LeaveType, joinDate: string, currentDate: string = new Date().toISOString()): number => {
  const joinDateObj = new Date(joinDate);
  const currentDateObj = new Date(currentDate);

  let allocatedDays = 0;

  switch (leaveType.accrual_method) {
    case 'beginning_of_year':
      // Full allocation at the beginning of each year
      const currentYear = currentDateObj.getFullYear();
      const joinYear = joinDateObj.getFullYear();

      if (currentYear > joinYear) {
        allocatedDays = leaveType.annual_allocation_days;
      } else if (currentYear === joinYear && leaveType.prorated_for_new_joiners) {
        // Prorate for new joiners
        const daysInYear = 365;
        const daysSinceJoin = Math.floor((currentDateObj.getTime() - joinDateObj.getTime()) / (1000 * 60 * 60 * 24));
        allocatedDays = Math.floor((daysSinceJoin / daysInYear) * leaveType.annual_allocation_days);
      }
      break;

    case 'monthly_accrual':
      // Monthly accrual
      const monthsWorked = Math.max(0,
        (currentDateObj.getFullYear() - joinDateObj.getFullYear()) * 12 +
        (currentDateObj.getMonth() - joinDateObj.getMonth())
      );
      allocatedDays = Math.floor((leaveType.annual_allocation_days / 12) * monthsWorked);
      break;

    case 'anniversary_based':
      // Accrual based on join anniversary
      const monthsSinceJoin = Math.max(0,
        (currentDateObj.getFullYear() - joinDateObj.getFullYear()) * 12 +
        (currentDateObj.getMonth() - joinDateObj.getMonth())
      );
      const yearsOfService = Math.floor(monthsSinceJoin / 12);
      allocatedDays = yearsOfService * leaveType.annual_allocation_days;
      break;

    case 'custom':
      // Custom accrual - use full allocation for now
      allocatedDays = leaveType.annual_allocation_days;
      break;
  }

  return Math.min(allocatedDays, leaveType.max_accumulation_days || allocatedDays);
};
