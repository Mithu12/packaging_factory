-- V71: HRM Attendance Regularization Table
-- Stores requests for attendance corrections (check-in/check-out time corrections)

CREATE TABLE IF NOT EXISTS attendance_regularization_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    original_date DATE NOT NULL,
    original_check_in_time TIME,
    original_check_out_time TIME,
    requested_check_in_time TIME,
    requested_check_out_time TIME,
    reason TEXT NOT NULL,
    supporting_document_urls TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,
    rejection_reason TEXT,
    manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_att_reg_employee_id ON attendance_regularization_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_reg_status ON attendance_regularization_requests(status);
CREATE INDEX IF NOT EXISTS idx_att_reg_original_date ON attendance_regularization_requests(original_date);
CREATE INDEX IF NOT EXISTS idx_att_reg_request_date ON attendance_regularization_requests(request_date);
