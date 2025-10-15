-- Migration V54: HRM Core Tables
-- Description: Creates core HRM tables for employee management, departments, and designations

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    manager_id BIGINT, -- References employees(id) - nullable initially
    parent_department_id BIGINT, -- References departments(id) for hierarchy
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_departments_parent FOREIGN KEY (parent_department_id) REFERENCES departments(id) DEFERRABLE INITIALLY DEFERRED
);

-- Create designations table
CREATE TABLE IF NOT EXISTS designations (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    department_id BIGINT, -- References departments(id)
--     grade VARCHAR(20), -- e.g., 'entry', 'mid', 'senior', 'executive'
    description TEXT,
    min_salary DECIMAL(12,2),
    max_salary DECIMAL(12,2),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_designations_department FOREIGN KEY (department_id) REFERENCES departments(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT designations_salary_check CHECK (min_salary <= max_salary)
);

-- Enhanced employees table (extends existing operators)
-- First, rename existing operators table to employees if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operators') THEN
        -- Drop existing constraints that reference operators
        ALTER TABLE IF EXISTS material_consumptions DROP CONSTRAINT IF EXISTS fk_material_consumptions_operator;
        ALTER TABLE IF EXISTS production_runs DROP CONSTRAINT IF EXISTS fk_production_runs_operator;

        -- Rename table
        ALTER TABLE operators RENAME TO employees;

        -- Rename primary key constraint
        ALTER TABLE employees RENAME CONSTRAINT operators_pkey TO employees_pkey;

        -- Rename indexes
        ALTER INDEX IF EXISTS idx_operators_factory_id RENAME TO idx_employees_factory_id;
        ALTER INDEX IF EXISTS idx_operators_user_id RENAME TO idx_employees_user_id;
        ALTER INDEX IF EXISTS idx_operators_employee_id RENAME TO idx_employees_employee_id;
        ALTER INDEX IF EXISTS idx_operators_skill_level RENAME TO idx_employees_skill_level;
        ALTER INDEX IF EXISTS idx_operators_availability_status RENAME TO idx_employees_availability_status;
        ALTER INDEX IF EXISTS idx_operators_is_active RENAME TO idx_employees_is_active;
        ALTER INDEX IF EXISTS idx_operators_department RENAME TO idx_employees_department;

        -- Rename trigger
        DROP TRIGGER IF EXISTS trigger_operators_updated_at ON employees;
        ALTER TABLE employees RENAME CONSTRAINT operators_hourly_rate_check TO employees_hourly_rate_check;

        -- Add new columns to employees table
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_of_birth DATE;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other'));
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed'));
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS address TEXT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS city VARCHAR(100);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS state VARCHAR(100);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'Pakistan';
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS blood_group VARCHAR(5);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS cnic VARCHAR(15) UNIQUE;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS passport_number VARCHAR(20);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS designation_id BIGINT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS reporting_manager_id BIGINT;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS employment_type VARCHAR(20) DEFAULT 'permanent' CHECK (employment_type IN ('permanent', 'contract', 'intern', 'consultant'));
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS join_date DATE;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS confirmation_date DATE;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS termination_date DATE;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_period_months INTEGER DEFAULT 6;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS notice_period_days INTEGER DEFAULT 30;
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_location VARCHAR(100);
        ALTER TABLE employees ADD COLUMN IF NOT EXISTS shift_type VARCHAR(20) DEFAULT 'day' CHECK (shift_type IN ('day', 'night', 'rotating'));

        -- Update foreign key constraints
        ALTER TABLE employees ADD CONSTRAINT fk_employees_designation FOREIGN KEY (designation_id) REFERENCES designations(id) DEFERRABLE INITIALLY DEFERRED;
        ALTER TABLE employees ADD CONSTRAINT fk_employees_reporting_manager FOREIGN KEY (reporting_manager_id) REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED;

        -- Update existing references to point to employees table
        ALTER TABLE material_consumptions ADD CONSTRAINT fk_material_consumptions_operator FOREIGN KEY (operator_id) REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED;
        ALTER TABLE production_runs ADD CONSTRAINT fk_production_runs_operator FOREIGN KEY (operator_id) REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED;

        -- Create trigger for updated_at
        CREATE OR REPLACE FUNCTION update_employees_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER trigger_employees_updated_at
            BEFORE UPDATE ON employees
            FOR EACH ROW
            EXECUTE FUNCTION update_employees_updated_at();

    END IF;
END $$;

-- Create employees table if it doesn't exist (for fresh installations)
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    factory_id BIGINT,
    user_id BIGINT REFERENCES users(id),
    employee_id VARCHAR(50) UNIQUE NOT NULL,

    -- Personal Information
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
    marital_status VARCHAR(20) CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    nationality VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Pakistan',
    phone VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    blood_group VARCHAR(5),
    cnic VARCHAR(15) UNIQUE,
    passport_number VARCHAR(20),
    tax_id VARCHAR(20),

    -- Employment Information
    designation_id BIGINT,
    reporting_manager_id BIGINT,
    department_id BIGINT,
    employment_type VARCHAR(20) DEFAULT 'permanent' CHECK (employment_type IN ('permanent', 'contract', 'intern', 'consultant')),
    join_date DATE,
    confirmation_date DATE,
    termination_date DATE,
    probation_period_months INTEGER DEFAULT 6,
    notice_period_days INTEGER DEFAULT 30,
    work_location VARCHAR(100),
    shift_type VARCHAR(20) DEFAULT 'day' CHECK (shift_type IN ('day', 'night', 'rotating')),

    -- Banking Information
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),

    -- Legacy fields (for backward compatibility)
    skill_level VARCHAR(20) DEFAULT 'beginner' CHECK (skill_level IN ('beginner', 'intermediate', 'expert', 'master')),
    department VARCHAR(100), -- Keep for backward compatibility
    current_work_order_id BIGINT,
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'off_duty', 'on_leave')),
    hourly_rate DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employees_factory FOREIGN KEY (factory_id) REFERENCES factories(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_employees_designation FOREIGN KEY (designation_id) REFERENCES designations(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_employees_reporting_manager FOREIGN KEY (reporting_manager_id) REFERENCES employees(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments(id) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT employees_hourly_rate_check CHECK (hourly_rate >= 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_factory_id ON employees(factory_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_designation_id ON employees(designation_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_reporting_manager_id ON employees(reporting_manager_id);
CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON employees(employment_type);
CREATE INDEX IF NOT EXISTS idx_employees_join_date ON employees(join_date);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_skill_level ON employees(skill_level);
CREATE INDEX IF NOT EXISTS idx_employees_availability_status ON employees(availability_status);
CREATE INDEX IF NOT EXISTS idx_employees_cnic ON employees(cnic);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_employees_updated_at ON employees;
CREATE TRIGGER trigger_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW
    EXECUTE FUNCTION update_employees_updated_at();

-- Create employee_contracts table
CREATE TABLE IF NOT EXISTS employee_contracts (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    contract_type VARCHAR(50) NOT NULL, -- 'permanent', 'contract', 'probation', etc.
    start_date DATE NOT NULL,
    end_date DATE,
    salary DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PKR',
    working_hours_per_week INTEGER DEFAULT 40,
    working_days_per_week INTEGER DEFAULT 5,
    notice_period_days INTEGER DEFAULT 30,
    probation_period_months INTEGER DEFAULT 6,
    contract_document_url TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'terminated', 'expired', 'suspended')),
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_contracts_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_employee_contracts_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create indexes for employee_contracts
CREATE INDEX IF NOT EXISTS idx_employee_contracts_employee_id ON employee_contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_status ON employee_contracts(status);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_start_date ON employee_contracts(start_date);
CREATE INDEX IF NOT EXISTS idx_employee_contracts_end_date ON employee_contracts(end_date);

-- Create trigger for employee_contracts updated_at
CREATE OR REPLACE FUNCTION update_employee_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_employee_contracts_updated_at ON employee_contracts;
CREATE TRIGGER trigger_employee_contracts_updated_at
    BEFORE UPDATE ON employee_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_contracts_updated_at();
