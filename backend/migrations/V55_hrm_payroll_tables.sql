-- Migration V55: HRM Payroll Tables
-- Description: Creates payroll-related tables for salary management, payroll processing, and components

-- Create payroll_periods table
CREATE TABLE IF NOT EXISTS payroll_periods (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'bi-weekly', 'weekly', 'daily')),
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed', 'cancelled')),
    description TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT payroll_periods_date_check CHECK (start_date <= end_date),
    CONSTRAINT fk_payroll_periods_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create payroll_components table (for salary structure)
CREATE TABLE IF NOT EXISTS payroll_components (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    component_type VARCHAR(20) NOT NULL CHECK (component_type IN ('earning', 'deduction')),
    category VARCHAR(50), -- 'basic', 'allowance', 'overtime', 'bonus', 'tax', 'loan', etc.
    is_taxable BOOLEAN DEFAULT true,
    is_mandatory BOOLEAN DEFAULT false,
    calculation_method VARCHAR(50), -- 'fixed', 'percentage', 'formula', 'manual'
    formula TEXT, -- For formula-based calculations
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payroll_components_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create employee_salary_structure table (links employees to payroll components)
CREATE TABLE IF NOT EXISTS employee_salary_structure (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_component_id BIGINT NOT NULL REFERENCES payroll_components(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    percentage DECIMAL(5,2), -- For percentage-based components
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN DEFAULT true,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_salary_structure_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_employee_salary_structure_component FOREIGN KEY (payroll_component_id) REFERENCES payroll_components(id),
    CONSTRAINT fk_employee_salary_structure_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT employee_salary_structure_amount_check CHECK (amount >= 0)
);

-- Create payroll_runs table (for processing payroll)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id BIGSERIAL PRIMARY KEY,
    payroll_period_id BIGINT NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    run_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'cancelled', 'posted')),
    total_employees INTEGER DEFAULT 0,
    total_gross_salary DECIMAL(15,2) DEFAULT 0,
    total_deductions DECIMAL(15,2) DEFAULT 0,
    total_net_salary DECIMAL(15,2) DEFAULT 0,
    processed_by BIGINT REFERENCES users(id),
    processed_at TIMESTAMP WITH TIME ZONE,
    posted_to_accounting BOOLEAN DEFAULT false,
    accounting_reference VARCHAR(100),
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payroll_runs_period FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id),
    CONSTRAINT fk_payroll_runs_processed_by FOREIGN KEY (processed_by) REFERENCES users(id),
    CONSTRAINT fk_payroll_runs_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create payroll_details table (individual employee payroll calculations)
CREATE TABLE IF NOT EXISTS payroll_details (
    id BIGSERIAL PRIMARY KEY,
    payroll_run_id BIGINT NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    basic_salary DECIMAL(12,2) DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    total_deductions DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) DEFAULT 0,
    working_days INTEGER DEFAULT 0,
    paid_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    overtime_hours DECIMAL(6,2) DEFAULT 0,
    overtime_amount DECIMAL(10,2) DEFAULT 0,
    leave_deductions DECIMAL(10,2) DEFAULT 0,
    loan_deductions DECIMAL(10,2) DEFAULT 0,
    tax_deduction DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'calculated' CHECK (status IN ('calculated', 'approved', 'paid', 'cancelled')),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    payment_date DATE,
    payment_reference VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payroll_details_run FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id),
    CONSTRAINT fk_payroll_details_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_payroll_details_approved_by FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Create payroll_component_details table (breakdown of components for each employee)
CREATE TABLE IF NOT EXISTS payroll_component_details (
    id BIGSERIAL PRIMARY KEY,
    payroll_detail_id BIGINT NOT NULL REFERENCES payroll_details(id) ON DELETE CASCADE,
    payroll_component_id BIGINT NOT NULL REFERENCES payroll_components(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    quantity DECIMAL(8,2), -- For hourly rates, etc.
    rate DECIMAL(10,2), -- Rate per unit/quantity
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payroll_component_details_payroll FOREIGN KEY (payroll_detail_id) REFERENCES payroll_details(id),
    CONSTRAINT fk_payroll_component_details_component FOREIGN KEY (payroll_component_id) REFERENCES payroll_components(id)
);

-- Create employee_loans table (for loan management)
CREATE TABLE IF NOT EXISTS employee_loans (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    loan_type VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    monthly_installment DECIMAL(10,2) NOT NULL,
    total_installments INTEGER NOT NULL,
    paid_installments INTEGER DEFAULT 0,
    remaining_amount DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_loans_employee FOREIGN KEY (employee_id) REFERENCES employees(id),
    CONSTRAINT fk_employee_loans_approved_by FOREIGN KEY (approved_by) REFERENCES users(id),
    CONSTRAINT fk_employee_loans_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    CONSTRAINT employee_loans_amount_check CHECK (amount > 0 AND monthly_installment > 0),
    CONSTRAINT employee_loans_installments_check CHECK (total_installments > 0)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_periods_start_date ON payroll_periods(start_date);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_end_date ON payroll_periods(end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_status ON payroll_periods(status);

CREATE INDEX IF NOT EXISTS idx_payroll_components_type ON payroll_components(component_type);
CREATE INDEX IF NOT EXISTS idx_payroll_components_category ON payroll_components(category);
CREATE INDEX IF NOT EXISTS idx_payroll_components_is_active ON payroll_components(is_active);

CREATE INDEX IF NOT EXISTS idx_employee_salary_structure_employee ON employee_salary_structure(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_structure_component ON employee_salary_structure(payroll_component_id);
CREATE INDEX IF NOT EXISTS idx_employee_salary_structure_effective_from ON employee_salary_structure(effective_from);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_processed_at ON payroll_runs(processed_at);

CREATE INDEX IF NOT EXISTS idx_payroll_details_employee ON payroll_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_run ON payroll_details(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_status ON payroll_details(status);

CREATE INDEX IF NOT EXISTS idx_payroll_component_details_payroll ON payroll_component_details(payroll_detail_id);
CREATE INDEX IF NOT EXISTS idx_payroll_component_details_component ON payroll_component_details(payroll_component_id);

CREATE INDEX IF NOT EXISTS idx_employee_loans_employee ON employee_loans(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_loans_status ON employee_loans(status);
CREATE INDEX IF NOT EXISTS idx_employee_loans_start_date ON employee_loans(start_date);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_payroll_periods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_payroll_periods_updated_at ON payroll_periods;
CREATE TRIGGER trigger_payroll_periods_updated_at
    BEFORE UPDATE ON payroll_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_periods_updated_at();

CREATE OR REPLACE FUNCTION update_payroll_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_payroll_components_updated_at ON payroll_components;
CREATE TRIGGER trigger_payroll_components_updated_at
    BEFORE UPDATE ON payroll_components
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_components_updated_at();

CREATE OR REPLACE FUNCTION update_employee_salary_structure_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_employee_salary_structure_updated_at ON employee_salary_structure;
CREATE TRIGGER trigger_employee_salary_structure_updated_at
    BEFORE UPDATE ON employee_salary_structure
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_salary_structure_updated_at();

CREATE OR REPLACE FUNCTION update_payroll_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_payroll_runs_updated_at ON payroll_runs;
CREATE TRIGGER trigger_payroll_runs_updated_at
    BEFORE UPDATE ON payroll_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_runs_updated_at();

CREATE OR REPLACE FUNCTION update_payroll_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_payroll_details_updated_at ON payroll_details;
CREATE TRIGGER trigger_payroll_details_updated_at
    BEFORE UPDATE ON payroll_details
    FOR EACH ROW
    EXECUTE FUNCTION update_payroll_details_updated_at();

CREATE OR REPLACE FUNCTION update_employee_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_employee_loans_updated_at ON employee_loans;
CREATE TRIGGER trigger_employee_loans_updated_at
    BEFORE UPDATE ON employee_loans
    FOR EACH ROW
    EXECUTE FUNCTION update_employee_loans_updated_at();
