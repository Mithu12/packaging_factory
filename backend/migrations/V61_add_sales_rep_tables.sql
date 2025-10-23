-- Migration V61: Sales Rep Module Database Tables
-- Description: Creates all necessary database tables for the Sales Rep module

-- Create sales_rep_customers table
CREATE TABLE IF NOT EXISTS sales_rep_customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    credit_limit DECIMAL(15,2) DEFAULT 0,
    current_balance DECIMAL(15,2) DEFAULT 0,
    sales_rep_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_rep_orders table
CREATE TABLE IF NOT EXISTS sales_rep_orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES sales_rep_customers(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    sales_rep_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_rep_order_items table
CREATE TABLE IF NOT EXISTS sales_rep_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES sales_rep_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    discount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_rep_invoices table
CREATE TABLE IF NOT EXISTS sales_rep_invoices (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES sales_rep_orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    balance_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    sales_rep_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_rep_payments table
CREATE TABLE IF NOT EXISTS sales_rep_payments (
    id BIGSERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES sales_rep_invoices(id) ON DELETE CASCADE,
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'credit_card')),
    reference_number VARCHAR(100),
    notes TEXT,
    sales_rep_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_rep_deliveries table
CREATE TABLE IF NOT EXISTS sales_rep_deliveries (
    id BIGSERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES sales_rep_orders(id) ON DELETE CASCADE,
    delivery_number VARCHAR(50) NOT NULL UNIQUE,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
    tracking_number VARCHAR(100),
    courier_service VARCHAR(100),
    delivery_address TEXT NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    notes TEXT,
    sales_rep_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_rep_notifications table
CREATE TABLE IF NOT EXISTS sales_rep_notifications (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_entity_type VARCHAR(50) CHECK (related_entity_type IN ('customer', 'order', 'invoice', 'payment', 'delivery')),
    related_entity_id INTEGER,
    sales_rep_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sales_rep_reports table
CREATE TABLE IF NOT EXISTS sales_rep_reports (
    id BIGSERIAL PRIMARY KEY,
    report_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    date_range_from DATE NOT NULL,
    date_range_to DATE NOT NULL,
    data JSONB,
    generated_by INTEGER REFERENCES users(id),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_sales_rep_customers_sales_rep_id ON sales_rep_customers(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_customers_email ON sales_rep_customers(email);
CREATE INDEX IF NOT EXISTS idx_sales_rep_customers_name ON sales_rep_customers(name);
CREATE INDEX IF NOT EXISTS idx_sales_rep_customers_city_state ON sales_rep_customers(city, state);

CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_customer_id ON sales_rep_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_sales_rep_id ON sales_rep_orders(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_order_number ON sales_rep_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_status ON sales_rep_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_rep_orders_order_date ON sales_rep_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_sales_rep_order_items_order_id ON sales_rep_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_order_items_product_id ON sales_rep_order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_sales_rep_invoices_order_id ON sales_rep_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_invoices_sales_rep_id ON sales_rep_invoices(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_invoices_invoice_number ON sales_rep_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_rep_invoices_status ON sales_rep_invoices(status);
CREATE INDEX IF NOT EXISTS idx_sales_rep_invoices_due_date ON sales_rep_invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_sales_rep_payments_invoice_id ON sales_rep_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_payments_sales_rep_id ON sales_rep_payments(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_payments_payment_number ON sales_rep_payments(payment_number);
CREATE INDEX IF NOT EXISTS idx_sales_rep_payments_payment_date ON sales_rep_payments(payment_date);

CREATE INDEX IF NOT EXISTS idx_sales_rep_deliveries_order_id ON sales_rep_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_deliveries_sales_rep_id ON sales_rep_deliveries(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_deliveries_delivery_number ON sales_rep_deliveries(delivery_number);
CREATE INDEX IF NOT EXISTS idx_sales_rep_deliveries_status ON sales_rep_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_sales_rep_deliveries_delivery_date ON sales_rep_deliveries(delivery_date);

CREATE INDEX IF NOT EXISTS idx_sales_rep_notifications_sales_rep_id ON sales_rep_notifications(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_notifications_is_read ON sales_rep_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_sales_rep_notifications_type ON sales_rep_notifications(type);
CREATE INDEX IF NOT EXISTS idx_sales_rep_notifications_created_at ON sales_rep_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_rep_notifications_related_entity ON sales_rep_notifications(related_entity_type, related_entity_id);

CREATE INDEX IF NOT EXISTS idx_sales_rep_reports_generated_by ON sales_rep_reports(generated_by);
CREATE INDEX IF NOT EXISTS idx_sales_rep_reports_report_type ON sales_rep_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_sales_rep_reports_generated_at ON sales_rep_reports(generated_at);

-- Create triggers to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_rep_customers_updated_at BEFORE UPDATE ON sales_rep_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_rep_orders_updated_at BEFORE UPDATE ON sales_rep_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_rep_order_items_updated_at BEFORE UPDATE ON sales_rep_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_rep_invoices_updated_at BEFORE UPDATE ON sales_rep_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_rep_payments_updated_at BEFORE UPDATE ON sales_rep_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_rep_deliveries_updated_at BEFORE UPDATE ON sales_rep_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_rep_notifications_updated_at BEFORE UPDATE ON sales_rep_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_rep_reports_updated_at BEFORE UPDATE ON sales_rep_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE sales_rep_customers IS 'Customer accounts managed by sales representatives';
COMMENT ON TABLE sales_rep_orders IS 'Orders created and managed by sales representatives';
COMMENT ON TABLE sales_rep_order_items IS 'Line items for sales rep orders';
COMMENT ON TABLE sales_rep_invoices IS 'Invoices generated from sales rep orders';
COMMENT ON TABLE sales_rep_payments IS 'Payments received against sales rep invoices';
COMMENT ON TABLE sales_rep_deliveries IS 'Delivery tracking for sales rep orders';
COMMENT ON TABLE sales_rep_notifications IS 'System notifications for sales representatives';
COMMENT ON TABLE sales_rep_reports IS 'Generated reports for sales representatives';

-- Add column comments
COMMENT ON COLUMN sales_rep_customers.sales_rep_id IS 'Sales rep assigned to this customer';
COMMENT ON COLUMN sales_rep_customers.credit_limit IS 'Maximum credit allowed for this customer';
COMMENT ON COLUMN sales_rep_customers.current_balance IS 'Current outstanding balance for this customer';

COMMENT ON COLUMN sales_rep_orders.sales_rep_id IS 'Sales rep who created this order';
COMMENT ON COLUMN sales_rep_orders.order_number IS 'Unique order number for tracking';
COMMENT ON COLUMN sales_rep_orders.discount_amount IS 'Total discount applied to this order';
COMMENT ON COLUMN sales_rep_orders.tax_amount IS 'Total tax amount for this order';
COMMENT ON COLUMN sales_rep_orders.final_amount IS 'Final amount after discounts and taxes';

COMMENT ON COLUMN sales_rep_order_items.product_name IS 'Product name at time of order (for historical reference)';
COMMENT ON COLUMN sales_rep_order_items.total_price IS 'Line total after quantity, price, and discount';

COMMENT ON COLUMN sales_rep_invoices.sales_rep_id IS 'Sales rep who generated this invoice';
COMMENT ON COLUMN sales_rep_invoices.balance_amount IS 'Remaining balance to be paid (computed: total_amount - paid_amount)';

COMMENT ON COLUMN sales_rep_payments.sales_rep_id IS 'Sales rep who recorded this payment';
COMMENT ON COLUMN sales_rep_payments.reference_number IS 'Payment reference from bank or payment processor';

COMMENT ON COLUMN sales_rep_deliveries.sales_rep_id IS 'Sales rep who scheduled this delivery';
COMMENT ON COLUMN sales_rep_deliveries.tracking_number IS 'Courier tracking number for delivery';
COMMENT ON COLUMN sales_rep_deliveries.courier_service IS 'Name of the courier service used';

COMMENT ON COLUMN sales_rep_notifications.sales_rep_id IS 'Sales rep this notification is for';
COMMENT ON COLUMN sales_rep_notifications.is_read IS 'Whether the sales rep has read this notification';
COMMENT ON COLUMN sales_rep_notifications.related_entity_type IS 'Type of entity this notification relates to';
COMMENT ON COLUMN sales_rep_notifications.related_entity_id IS 'ID of the related entity';

COMMENT ON COLUMN sales_rep_reports.generated_by IS 'User who generated this report';
COMMENT ON COLUMN sales_rep_reports.data IS 'JSON data containing the report results';

