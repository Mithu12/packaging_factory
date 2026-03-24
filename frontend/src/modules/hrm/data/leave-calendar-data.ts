import {
  LeaveApplication,
  LeaveBalance,
  LeaveCalendarEvent,
  Employee,
  LeaveType,
  Department,
  TeamAvailability,
} from "../types";

// Enhanced Leave Types with Color Coding
export const mockLeaveTypes = [
  {
    id: 1,
    name: "Annual Leave",
    code: "AL",
    description: "Standard annual vacation leave",
    color_code: "#22c55e",
    is_active: true,
    annual_allocation_days: 25,
    accrual_method: "beginning_of_year",
    prorated_for_new_joiners: true,
    max_accumulation_days: 60,
    max_carry_forward_days: 5,
    encashment_eligible: true,
    min_days_per_request: 1,
    max_days_per_request: 15,
    applicable_department_ids: [],
    applicable_designation_ids: [],
    requires_documentation: false,
    mandatory_document_types: [],
    optional_document_types: [],
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Sick Leave",
    code: "SL",
    description: "Medical leave for illness",
    color_code: "#ef4444",
    is_active: true,
    annual_allocation_days: 12,
    accrual_method: "monthly_accrual",
    prorated_for_new_joiners: true,
    max_accumulation_days: 90,
    max_carry_forward_days: 0,
    encashment_eligible: false,
    min_days_per_request: 1,
    max_days_per_request: 30,
    applicable_department_ids: [],
    applicable_designation_ids: [],
    requires_documentation: true,
    mandatory_document_types: ["Medical Certificate"],
    optional_document_types: ["Prescription", "Lab Reports"],
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Casual Leave",
    code: "CL",
    description: "Personal leave for urgent matters",
    color_code: "#f59e0b",
    is_active: true,
    annual_allocation_days: 10,
    accrual_method: "beginning_of_year",
    prorated_for_new_joiners: true,
    max_accumulation_days: 20,
    max_carry_forward_days: 3,
    encashment_eligible: false,
    min_days_per_request: 0.5,
    max_days_per_request: 3,
    applicable_department_ids: [],
    applicable_designation_ids: [],
    requires_documentation: false,
    mandatory_document_types: [],
    optional_document_types: [],
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    name: "Maternity Leave",
    code: "ML",
    description: "Maternity leave for childbirth",
    color_code: "#ec4899",
    is_active: true,
    annual_allocation_days: 90,
    accrual_method: "beginning_of_year",
    prorated_for_new_joiners: false,
    max_accumulation_days: 90,
    max_carry_forward_days: 0,
    encashment_eligible: false,
    min_days_per_request: 30,
    max_days_per_request: 90,
    applicable_department_ids: [],
    applicable_designation_ids: [],
    gender_restriction: "female",
    requires_documentation: true,
    mandatory_document_types: ["Medical Certificate", "Birth Certificate"],
    optional_document_types: ["Ultrasound Reports"],
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 5,
    name: "Paternity Leave",
    code: "PL",
    description: "Paternity leave for new fathers",
    color_code: "#3b82f6",
    is_active: true,
    annual_allocation_days: 7,
    accrual_method: "beginning_of_year",
    prorated_for_new_joiners: true,
    max_accumulation_days: 14,
    max_carry_forward_days: 0,
    encashment_eligible: false,
    min_days_per_request: 1,
    max_days_per_request: 7,
    applicable_department_ids: [],
    applicable_designation_ids: [],
    gender_restriction: "male",
    requires_documentation: true,
    mandatory_document_types: ["Birth Certificate"],
    optional_document_types: [],
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 6,
    name: "Emergency Leave",
    code: "EL",
    description: "Emergency leave for unforeseen situations",
    color_code: "#8b5cf6",
    is_active: true,
    annual_allocation_days: 5,
    accrual_method: "beginning_of_year",
    prorated_for_new_joiners: true,
    max_accumulation_days: 10,
    max_carry_forward_days: 2,
    encashment_eligible: false,
    min_days_per_request: 1,
    max_days_per_request: 5,
    applicable_department_ids: [],
    applicable_designation_ids: [],
    requires_documentation: false,
    mandatory_document_types: [],
    optional_document_types: [],
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 7,
    name: "Study Leave",
    code: "STL",
    description: "Leave for educational purposes",
    color_code: "#06b6d4",
    is_active: true,
    annual_allocation_days: 15,
    accrual_method: "beginning_of_year",
    prorated_for_new_joiners: true,
    max_accumulation_days: 30,
    max_carry_forward_days: 5,
    encashment_eligible: false,
    min_days_per_request: 1,
    max_days_per_request: 15,
    applicable_department_ids: [],
    applicable_designation_ids: [],
    requires_documentation: true,
    mandatory_document_types: ["Admission Letter", "Course Outline"],
    optional_document_types: ["Fee Receipt"],
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 8,
    name: "Compensatory Leave",
    code: "CPL",
    description: "Leave earned through overtime work",
    color_code: "#84cc16",
    is_active: true,
    annual_allocation_days: 0,
    accrual_method: "beginning_of_year",
    prorated_for_new_joiners: false,
    max_accumulation_days: 30,
    max_carry_forward_days: 10,
    encashment_eligible: true,
    min_days_per_request: 1,
    max_days_per_request: 5,
    applicable_department_ids: [],
    applicable_designation_ids: [],
    requires_documentation: false,
    mandatory_document_types: [],
    optional_document_types: [],
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Enhanced Departments
export const mockDepartments = [
  {
    id: 1,
    name: "Engineering",
    code: "ENG",
    description: "Software Development and IT",
    manager_id: 1,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Human Resources",
    code: "HR",
    description: "HR and Administration",
    manager_id: 3,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Finance",
    code: "FIN",
    description: "Accounting and Finance",
    manager_id: 6,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    name: "Marketing",
    code: "MKT",
    description: "Marketing and Sales",
    manager_id: 8,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 5,
    name: "Operations",
    code: "OPS",
    description: "Operations and Supply Chain",
    manager_id: 2,
    is_active: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Enhanced Employees
export const mockEmployees = [
  {
    id: 1,
    employee_id: "EMP001",
    first_name: "Ahmed",
    last_name: "Khan",
    full_name: "Ahmed Khan",
    designation_id: 1,
    department_id: 1,
    employment_type: "permanent",
    join_date: "2020-01-15",
    shift_type: "day",
    skill_level: "expert",
    availability_status: "available",
    is_active: true,
    created_at: "2020-01-15T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    employee_id: "EMP002",
    first_name: "Fatima",
    last_name: "Ali",
    full_name: "Fatima Ali",
    designation_id: 2,
    department_id: 5,
    employment_type: "permanent",
    join_date: "2019-03-10",
    shift_type: "day",
    skill_level: "expert",
    availability_status: "available",
    is_active: true,
    created_at: "2019-03-10T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    employee_id: "EMP003",
    first_name: "Usman",
    last_name: "Ahmed",
    full_name: "Usman Ahmed",
    designation_id: 3,
    department_id: 2,
    employment_type: "permanent",
    join_date: "2018-06-01",
    shift_type: "day",
    skill_level: "expert",
    availability_status: "available",
    is_active: true,
    created_at: "2018-06-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    employee_id: "EMP004",
    first_name: "Ayesha",
    last_name: "Siddiqui",
    full_name: "Ayesha Siddiqui",
    designation_id: 4,
    department_id: 1,
    employment_type: "permanent",
    join_date: "2021-02-20",
    shift_type: "day",
    skill_level: "intermediate",
    availability_status: "available",
    is_active: true,
    created_at: "2021-02-20T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 5,
    employee_id: "EMP005",
    first_name: "Bilal",
    last_name: "Hassan",
    full_name: "Bilal Hassan",
    designation_id: 5,
    department_id: 1,
    employment_type: "permanent",
    join_date: "2020-08-15",
    shift_type: "day",
    skill_level: "intermediate",
    availability_status: "available",
    is_active: true,
    created_at: "2020-08-15T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 6,
    employee_id: "EMP006",
    first_name: "Sara",
    last_name: "Malik",
    full_name: "Sara Malik",
    designation_id: 6,
    department_id: 3,
    employment_type: "permanent",
    join_date: "2019-11-01",
    shift_type: "day",
    skill_level: "expert",
    availability_status: "available",
    is_active: true,
    created_at: "2019-11-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 7,
    employee_id: "EMP007",
    first_name: "Omar",
    last_name: "Farooq",
    full_name: "Omar Farooq",
    designation_id: 7,
    department_id: 4,
    employment_type: "permanent",
    join_date: "2022-01-10",
    shift_type: "day",
    skill_level: "beginner",
    availability_status: "available",
    is_active: true,
    created_at: "2022-01-10T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 8,
    employee_id: "EMP008",
    first_name: "Zahra",
    last_name: "Noor",
    full_name: "Zahra Noor",
    designation_id: 8,
    department_id: 4,
    employment_type: "permanent",
    join_date: "2020-05-01",
    shift_type: "day",
    skill_level: "intermediate",
    availability_status: "available",
    is_active: true,
    created_at: "2020-05-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 9,
    employee_id: "EMP009",
    first_name: "Hassan",
    last_name: "Raza",
    full_name: "Hassan Raza",
    designation_id: 9,
    department_id: 5,
    employment_type: "permanent",
    join_date: "2021-09-15",
    shift_type: "day",
    skill_level: "intermediate",
    availability_status: "available",
    is_active: true,
    created_at: "2021-09-15T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 10,
    employee_id: "EMP010",
    first_name: "Maryam",
    last_name: "Khan",
    full_name: "Maryam Khan",
    designation_id: 10,
    department_id: 3,
    employment_type: "permanent",
    join_date: "2022-03-01",
    shift_type: "day",
    skill_level: "intermediate",
    availability_status: "available",
    is_active: true,
    created_at: "2022-03-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

// Public holidays for 2024 (Bangladesh — mock data; lunar dates are tentative)
export const mockPublicHolidays = [
  { date: "2024-01-01", name: "New Year's Day", type: "public" },
  { date: "2024-02-21", name: "Language Martyrs' Day", type: "public" },
  { date: "2024-03-26", name: "Independence Day", type: "public" },
  { date: "2024-04-11", name: "Eid-ul-Fitr (Tentative)", type: "religious" },
  { date: "2024-04-14", name: "Pahela Baishakh", type: "public" },
  { date: "2024-05-01", name: "May Day", type: "public" },
  { date: "2024-06-17", name: "Eid-ul-Adha (Tentative)", type: "religious" },
  { date: "2024-06-18", name: "Eid-ul-Adha Holiday", type: "religious" },
  { date: "2024-06-19", name: "Eid-ul-Adha Holiday", type: "religious" },
  { date: "2024-08-15", name: "National Mourning Day", type: "public" },
  { date: "2024-09-16", name: "Eid Milad-un-Nabi (Tentative)", type: "religious" },
  { date: "2024-12-16", name: "Victory Day", type: "public" },
  { date: "2024-12-25", name: "Christmas Day", type: "public" },
  { date: "2024-12-31", name: "New Year's Eve", type: "public" },
];

// Enhanced Leave Calendar Events
export const mockLeaveCalendarEvents = [
  // November 2024
  {
    id: "1",
    employee_id: 1,
    leave_type_id: 1,
    application_id: 1,
    title: "Ahmed Khan - Annual Leave",
    start_date: "2024-11-15",
    end_date: "2024-11-20",
    is_half_day: false,
    status: "approved",
    background_color: "#22c55e",
    text_color: "#ffffff",
  },
  {
    id: "2",
    employee_id: 4,
    leave_type_id: 2,
    application_id: 2,
    title: "Ayesha Siddiqui - Sick Leave",
    start_date: "2024-11-25",
    end_date: "2024-11-27",
    is_half_day: false,
    status: "pending",
    background_color: "#ef4444",
    text_color: "#ffffff",
  },
  {
    id: "3",
    employee_id: 6,
    leave_type_id: 3,
    application_id: 4,
    title: "Sara Malik - Casual Leave (Half Day)",
    start_date: "2024-11-01",
    end_date: "2024-11-01",
    is_half_day: true,
    status: "approved",
    background_color: "#f59e0b",
    text_color: "#ffffff",
  },
  {
    id: "4",
    employee_id: 2,
    leave_type_id: 5,
    application_id: 7,
    title: "Fatima Ali - Paternity Leave",
    start_date: "2024-11-05",
    end_date: "2024-11-11",
    is_half_day: false,
    status: "approved",
    background_color: "#3b82f6",
    text_color: "#ffffff",
  },
  {
    id: "5",
    employee_id: 8,
    leave_type_id: 4,
    application_id: 6,
    title: "Zahra Noor - Maternity Leave",
    start_date: "2024-12-01",
    end_date: "2025-02-28",
    is_half_day: false,
    status: "approved",
    background_color: "#ec4899",
    text_color: "#ffffff",
  },
  // December 2024
  {
    id: "6",
    employee_id: 5,
    leave_type_id: 1,
    application_id: 3,
    title: "Bilal Hassan - Annual Leave",
    start_date: "2024-12-20",
    end_date: "2024-12-25",
    is_half_day: false,
    status: "approved",
    background_color: "#22c55e",
    text_color: "#ffffff",
  },
  {
    id: "7",
    employee_id: 7,
    leave_type_id: 7,
    application_id: 9,
    title: "Omar Farooq - Study Leave",
    start_date: "2024-12-15",
    end_date: "2024-12-22",
    is_half_day: false,
    status: "approved",
    background_color: "#06b6d4",
    text_color: "#ffffff",
  },
  {
    id: "8",
    employee_id: 9,
    leave_type_id: 8,
    application_id: 10,
    title: "Hassan Raza - Compensatory Leave",
    start_date: "2024-12-10",
    end_date: "2024-12-12",
    is_half_day: false,
    status: "approved",
    background_color: "#84cc16",
    text_color: "#000000",
  },
  // January 2025
  {
    id: "9",
    employee_id: 10,
    leave_type_id: 3,
    application_id: 11,
    title: "Maryam Khan - Casual Leave",
    start_date: "2025-01-05",
    end_date: "2025-01-07",
    is_half_day: false,
    status: "pending",
    background_color: "#f59e0b",
    text_color: "#ffffff",
  },
  {
    id: "10",
    employee_id: 3,
    leave_type_id: 6,
    application_id: 8,
    title: "Usman Ahmed - Emergency Leave",
    start_date: "2024-11-30",
    end_date: "2024-11-30",
    is_half_day: false,
    status: "approved",
    background_color: "#8b5cf6",
    text_color: "#ffffff",
  },
];

// Generate team availability data for the current year
export const generateTeamAvailability = () => {
  const availability = [];
  const currentYear = new Date().getFullYear();

  // Generate data for each month
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(month + 1).padStart(
        2,
        "0"
      )}-${String(day).padStart(2, "0")}`;

      // Find leave events for this date
      const dayEvents = mockLeaveCalendarEvents.filter((event) => {
        const eventStart = new Date(event.start_date);
        const eventEnd = new Date(event.end_date);
        const currentDate = new Date(dateStr);
        return currentDate >= eventStart && currentDate <= eventEnd;
      });

      const onLeave = dayEvents.filter(
        (event) => event.status === "approved"
      ).length;
      const totalEmployees = mockEmployees.length;
      const available = totalEmployees - onLeave;

      // Check if it's a critical staffing day (more than 30% on leave)
      const criticalStaffing = onLeave > Math.ceil(totalEmployees * 0.3);

      availability.push({
        date: dateStr,
        total_employees: totalEmployees,
        on_leave: onLeave,
        available: available,
        critical_staffing: criticalStaffing,
        leave_events: dayEvents,
      });
    }
  }

  return availability;
};

export const mockTeamAvailability = generateTeamAvailability();

// Department-wise availability
export const getDepartmentAvailability = (
  departmentId: number
) => {
  return mockTeamAvailability.filter((availability) => {
    const dayEvents = availability.leave_events;
    return dayEvents.some((event) => {
      const employee = mockEmployees.find(
        (emp) => emp.id === event.employee_id
      );
      return employee?.department_id === departmentId;
    });
  });
};

// Employee-specific availability
export const getEmployeeAvailability = (
  employeeId: number
) => {
  return mockTeamAvailability.filter((availability) => {
    return availability.leave_events.some(
      (event) => event.employee_id === employeeId
    );
  });
};

// Calendar view options
export const calendarViewOptions = [
  { value: "monthly", label: "Monthly View" },
  { value: "weekly", label: "Weekly View" },
  { value: "yearly", label: "Yearly Overview" },
  { value: "department", label: "Department View" },
  { value: "employee", label: "Employee View" },
];

export const departmentOptions = mockDepartments.map((dept) => ({
  value: dept.id.toString(),
  label: dept.name,
}));

export const employeeOptions = mockEmployees.map((emp) => ({
  value: emp.id.toString(),
  label: emp.full_name,
}));

export const leaveTypeOptions = mockLeaveTypes.map((lt) => ({
  value: lt.id.toString(),
  label: lt.name,
}));

// Filter options
export const statusFilterOptions = [
  { value: "all", label: "All Status" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
];

export const holidayTypeOptions = [
  { value: "all", label: "All Holidays" },
  { value: "public", label: "Public Holidays" },
  { value: "religious", label: "Religious Holidays" },
];

// Utility functions
export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const isHoliday = (dateStr: string): boolean => {
  return mockPublicHolidays.some((holiday) => holiday.date === dateStr);
};

export const getHolidayInfo = (dateStr: string) => {
  return mockPublicHolidays.find((holiday) => holiday.date === dateStr);
};

export const getLeaveTypeById = (id: number) => {
  return mockLeaveTypes.find((lt) => lt.id === id);
};

export const getEmployeeById = (id: number) => {
  return mockEmployees.find((emp) => emp.id === id);
};

export const getDepartmentById = (id: number) => {
  return mockDepartments.find((dept) => dept.id === id);
};

// Headcount analysis
export const getHeadcountAnalysis = (startDate: string, endDate: string) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const analysis = {
    totalDays: 0,
    averageAvailability: 0,
    criticalDays: 0,
    maxLeaveDay: { date: "", count: 0 },
    departmentBreakdown: {} as Record<
      string,
      { total: number; available: number; onLeave: number }
    >,
  };

  let totalAvailability = 0;
  let totalDays = 0;

  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    const dateStr = date.toISOString().split("T")[0];
    const dayAvailability = mockTeamAvailability.find(
      (ta) => ta.date === dateStr
    );

    if (dayAvailability) {
      totalAvailability += dayAvailability.available;
      totalDays++;

      if (dayAvailability.critical_staffing) {
        analysis.criticalDays++;
      }

      if (dayAvailability.on_leave > analysis.maxLeaveDay.count) {
        analysis.maxLeaveDay = {
          date: dateStr,
          count: dayAvailability.on_leave,
        };
      }

      // Department breakdown
      dayAvailability.leave_events.forEach((event) => {
        const employee = getEmployeeById(event.employee_id);
        if (employee?.department_id) {
          const deptName =
            getDepartmentById(employee.department_id)?.name || "Unknown";
          if (!analysis.departmentBreakdown[deptName]) {
            analysis.departmentBreakdown[deptName] = {
              total: 0,
              available: 0,
              onLeave: 0,
            };
          }
          analysis.departmentBreakdown[deptName].total++;
          if (event.status === "approved") {
            analysis.departmentBreakdown[deptName].onLeave++;
          }
        }
      });
    }
  }

  analysis.totalDays = totalDays;
  analysis.averageAvailability =
    totalDays > 0 ? totalAvailability / totalDays : 0;

  return analysis;
};
