-- Migration V56: HRM Attendance and Leave Tables
-- Description: Creates attendance tracking and leave management tables

-- Create work_schedules table
CREATE TABLE IF NOT EXISTS work_schedules (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    schedule_type VARCHAR(20) DEFAULT 'fixed' CHECK (schedule_type IN ('fixed', 'flexible', 'rotating')),
    monday_start TIME,
    monday_end TIME,
    tuesday_start TIME,
    tuesday_end TIME,
    wednesday_start TIME,
    wednesday_end TIME,
    thursday_start TIME,
    thursday_end TIME,
    friday_start TIME,
    friday_end TIME,
    saturday_start TIME,
    saturday_end TIME,
    sunday_start TIME,
    sunday_end TIME,
    total_hours_per_week DECIMAL(4,2),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_work_schedules_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create leave_types table
CREATE TABLE IF NOT EXISTS leave_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    max_days_per_year INTEGER,
    max_consecutive_days INTEGER,
    requires_approval BOOLEAN DEFAULT true,
    is_paid BOOLEAN DEFAULT true,
    is_carry_forward BOOLEAN DEFAULT false,
    max_carry_forward_days INTEGER DEFAULT 0,
    accrual_rate DECIMAL(4,2), -- Days per month
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_leave_types_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT leave_types_max_days_check CHECK (max_days_per_year > 0)
);

-- Create leave_balances table (employee leave entitlements)
CREATE TABLE IF NOT EXISTS leave_balances (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    allocated_days DECIMAL(6,2) DEFAULT 0,
    used_days DECIMAL(6,2) DEFAULT 0,
    pending_days DECIMAL(6,2) DEFAULT 0,
    remaining_days DECIMAL(6,2) DEFAULT 0,
    carried_forward_days DECIMAL(6,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_leave_balances_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_leave_balances_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
    CONSTRAINT leave_balances_year_check CHECK (year >= 2020 AND year <= 2100),
    CONSTRAINT leave_balances_days_check CHECK (allocated_days >= 0 AND used_days >= 0 AND pending_days >= 0)
);

-- Create leave_applications table
CREATE TABLE IF NOT EXISTS leave_applications (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type_id BIGINT NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_reason TEXT,
    emergency_contact VARCHAR(100),
    work_handover_notes TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_leave_applications_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_leave_applications_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
    CONSTRAINT fk_leave_applications_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT leave_applications_date_check CHECK (start_date <= end_date),
    CONSTRAINT leave_applications_days_check CHECK (total_days > 0)
);

-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    break_start_time TIME,
    break_end_time TIME,
    total_hours_worked DECIMAL(4,2),
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'holiday')),
    location VARCHAR(200), -- GPS location or IP address
    notes TEXT,
    recorded_by VARCHAR(50), -- 'manual', 'biometric', 'mobile_app', 'web'
    is_manual_entry BOOLEAN DEFAULT false,
    approved_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_attendance_records_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_attendance_records_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type VARCHAR(20) DEFAULT 'national' CHECK (holiday_type IN ('national', 'religious', 'company', 'optional')),
    description TEXT,
    is_paid BOOLEAN DEFAULT true,
    is_mandatory BOOLEAN DEFAULT true,
    applicable_departments BIGINT[], -- Array of department IDs
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_holidays_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT holidays_unique_date UNIQUE (holiday_date)
);

-- Create employee_transfers table (for tracking employee movements)
CREATE TABLE IF NOT EXISTS employee_transfers (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    from_department_id BIGINT REFERENCES departments(id),
    to_department_id BIGINT REFERENCES departments(id),
    from_designation_id BIGINT REFERENCES designations(id),
    to_designation_id BIGINT REFERENCES designations(id),
    transfer_date DATE NOT NULL,
    transfer_type VARCHAR(20) DEFAULT 'internal' CHECK (transfer_type IN ('internal', 'promotion', 'demotion', 'lateral')),
    reason TEXT,
    salary_change DECIMAL(10,2),
    new_salary DECIMAL(12,2),
    effective_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_transfers_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_employee_transfers_from_dept FOREIGN KEY (from_department_id) REFERENCES departments(id),
    CONSTRAINT fk_employee_transfers_to_dept FOREIGN KEY (to_department_id) REFERENCES departments(id),
    CONSTRAINT fk_employee_transfers_from_desig FOREIGN KEY (from_designation_id) REFERENCES designations(id),
    CONSTRAINT fk_employee_transfers_to_desig FOREIGN KEY (to_designation_id) REFERENCES designations(id),
    CONSTRAINT fk_employee_transfers_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT fk_employee_transfers_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_work_schedules_is_default ON work_schedules(is_default);
CREATE INDEX IF NOT EXISTS idx_work_schedules_is_active ON work_schedules(is_active);

CREATE INDEX IF NOT EXISTS idx_leave_types_is_active ON leave_types(is_active);
CREATE INDEX IF NOT EXISTS idx_leave_types_code ON leave_types(code);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_leave_type ON leave_balances(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(year);

CREATE INDEX IF NOT EXISTS idx_leave_applications_employee ON leave_applications(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_leave_type ON leave_applications(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_start_date ON leave_applications(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_applications_end_date ON leave_applications(end_date);

CREATE INDEX IF NOT EXISTS idx_attendance_records_employee ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON attendance_records(status);

CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_type ON holidays(holiday_type);

CREATE INDEX IF NOT EXISTS idx_employee_transfers_employee ON employee_transfers(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_transfer_date ON employee_transfers(transfer_date);
CREATE INDEX IF NOT EXISTS idx_employee_transfers_status ON employee_transfers(status);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_work_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_work_schedules_updated_at ON work_schedules;
CREATE TRIGGER trigger_work_schedules_updated_at
    BEFORE UPDATE ON work_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_work_schedules_updated_at();

CREATE OR REPLACE FUNCTION update_leave_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_leave_types_updated_at ON leave_types;
CREATE TRIGGER trigger_leave_types_updated_at
    BEFORE UPDATE ON leave_types
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_types_updated_at();

CREATE OR REPLACE FUNCTION update_leave_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_leave_applications_updated_at ON leave_applications;
CREATE TRIGGER trigger_leave_applications_updated_at
    BEFORE UPDATE ON leave_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_applications_updated_at();

CREATE OR REPLACE FUNCTION update_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER trigger_attendance_records_updated_at
    BEFORE UPDATE ON attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_records_updated_at();

CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_holidays_updated_at ON holidays;
CREATE TRIGGER trigger_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_holidays_updated_at();

CREATE OR REPLACE FUNCTION update_employee_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_employee_transfers_updated_at ON employee_transfers;
CREATE TRIGGER trigger_employee_transfers_updated_at
    BEFORE UPDATE ON employee_transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_transfers_updated_at();
