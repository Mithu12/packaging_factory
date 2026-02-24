-- Add customer_addresses table for multiple shipping addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
    id BIGSERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by customer
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);

-- Ensure only one default address per customer
CREATE UNIQUE INDEX idx_customer_addresses_default_one_per_customer 
ON customer_addresses (customer_id) 
WHERE (is_default IS TRUE);

-- Update updated_at trigger for customer_addresses
DROP TRIGGER IF EXISTS update_customer_addresses_updated_at ON customer_addresses;
CREATE TRIGGER update_customer_addresses_updated_at
    BEFORE UPDATE ON customer_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_orders_updated_at(); -- Reusing existing update_at function
