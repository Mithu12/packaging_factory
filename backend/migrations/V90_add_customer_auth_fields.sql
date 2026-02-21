-- Migration to add customer authentication and ERP access fields
-- V88_add_customer_auth_fields.sql

-- Add columns to customers table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'password_hash') THEN
        ALTER TABLE public.customers ADD COLUMN password_hash VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'erp_access_approved') THEN
        ALTER TABLE public.customers ADD COLUMN erp_access_approved BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'customers' AND COLUMN_NAME = 'erp_access_requested_at') THEN
        ALTER TABLE public.customers ADD COLUMN erp_access_requested_at TIMESTAMPTZ;
    END IF;
END $$;
