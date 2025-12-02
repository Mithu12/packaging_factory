import { Shift, ShiftAssignment, Employee } from "../types";

export const mockShifts: Shift[] = [
  {
    id: 1,
    name: "Morning Shift",
    code: "MS",
    description: "Standard morning shift from 9 AM to 6 PM",
    start_time: "09:00",
    end_time: "18:00",
    break_start_time: "13:00",
    break_end_time: "14:00",
    working_hours: 8,
    is_flexible: false,
    grace_period_minutes: 15,
    late_threshold_minutes: 30,
    early_going_threshold_minutes: 30,
    is_active: true,
    color_code: "#3B82F6",
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Afternoon Shift",
    code: "AS",
    description: "Afternoon shift from 2 PM to 11 PM",
    start_time: "14:00",
    end_time: "23:00",
    break_start_time: "18:00",
    break_end_time: "19:00",
    working_hours: 8,
    is_flexible: false,
    grace_period_minutes: 15,
    late_threshold_minutes: 30,
    early_going_threshold_minutes: 30,
    is_active: true,
    color_code: "#10B981",
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Night Shift",
    code: "NS",
    description: "Night shift for 24/7 operations",
    start_time: "22:00",
    end_time: "07:00",
    break_start_time: "02:00",
    break_end_time: "03:00",
    working_hours: 8,
    is_flexible: false,
    grace_period_minutes: 15,
    late_threshold_minutes: 30,
    early_going_threshold_minutes: 30,
    is_active: true,
    color_code: "#8B5CF6",
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    name: "Flexible Hours",
    code: "FH",
    description: "Flexible working hours for special roles",
    start_time: "08:00",
    end_time: "20:00",
    working_hours: 8,
    is_flexible: true,
    grace_period_minutes: 60,
    late_threshold_minutes: 120,
    early_going_threshold_minutes: 60,
    is_active: true,
    color_code: "#F59E0B",
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 5,
    name: "Part Time",
    code: "PT",
    description: "Part-time shift for 4 hours",
    start_time: "09:00",
    end_time: "13:00",
    working_hours: 4,
    is_flexible: false,
    grace_period_minutes: 10,
    late_threshold_minutes: 20,
    early_going_threshold_minutes: 20,
    is_active: true,
    color_code: "#EF4444",
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export const mockShiftAssignments: ShiftAssignment[] = [
  {
    id: 1,
    employee_id: 1,
    shift_id: 1,
    effective_from: "2024-01-01",
    is_primary: true,
    assigned_by: 1,
    notes: "CEO assigned to morning shift",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    employee_id: 2,
    shift_id: 1,
    effective_from: "2024-01-01",
    is_primary: true,
    assigned_by: 1,
    notes: "CTO assigned to morning shift",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    employee_id: 3,
    shift_id: 1,
    effective_from: "2024-01-01",
    is_primary: true,
    assigned_by: 1,
    notes: "HR Manager assigned to morning shift",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    employee_id: 4,
    shift_id: 1,
    effective_from: "2024-01-01",
    is_primary: true,
    assigned_by: 1,
    notes: "Senior Developer assigned to morning shift",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 5,
    employee_id: 5,
    shift_id: 1,
    effective_from: "2024-01-01",
    is_primary: true,
    assigned_by: 1,
    notes: "Junior Developer assigned to morning shift",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 6,
    employee_id: 6,
    shift_id: 2,
    effective_from: "2024-01-01",
    is_primary: true,
    assigned_by: 1,
    notes: "Accountant assigned to afternoon shift",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 7,
    employee_id: 7,
    shift_id: 2,
    effective_from: "2024-01-01",
    is_primary: true,
    assigned_by: 1,
    notes: "Operations Manager assigned to afternoon shift",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 8,
    employee_id: 8,
    shift_id: 2,
    effective_from: "2024-01-01",
    is_primary: true,
    assigned_by: 1,
    notes: "Marketing Executive assigned to afternoon shift",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Helper functions
export const getShiftOptions = () =>
  mockShifts.map((shift) => ({
    value: shift.id.toString(),
    label: `${shift.name} (${shift.start_time} - ${shift.end_time})`,
  }));

export const getShiftById = (id: number) =>
  mockShifts.find((shift) => shift.id === id);

export const getShiftAssignmentsByEmployee = (employeeId: number) =>
  mockShiftAssignments.filter(
    (assignment) => assignment.employee_id === employeeId
  );

export const getShiftAssignmentsByShift = (shiftId: number) =>
  mockShiftAssignments.filter((assignment) => assignment.shift_id === shiftId);

export const getActiveShiftForEmployee = (employeeId: number) => {
  const assignments = getShiftAssignmentsByEmployee(employeeId);
  const activeAssignment = assignments.find(
    (assignment) =>
      !assignment.effective_to ||
      new Date(assignment.effective_to) >= new Date()
  );
  return activeAssignment ? getShiftById(activeAssignment.shift_id) : null;
};

export const getEmployeesByShift = (shiftId: number) => {
  const assignments = getShiftAssignmentsByShift(shiftId);
  return assignments
    .filter(
      (assignment) =>
        !assignment.effective_to ||
        new Date(assignment.effective_to) >= new Date()
    )
    .map((assignment) => assignment.employee_id);
};
