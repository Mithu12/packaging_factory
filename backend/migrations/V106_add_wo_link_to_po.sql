-- V106: Add work_order_id and customer_order_id to purchase_orders

ALTER TABLE purchase_orders ADD COLUMN work_order_id BIGINT NULL;
ALTER TABLE purchase_orders ADD COLUMN customer_order_id BIGINT NULL;

ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_order_work_order 
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;

ALTER TABLE purchase_orders ADD CONSTRAINT fk_purchase_order_customer_order 
    FOREIGN KEY (customer_order_id) REFERENCES factory_customer_orders(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys to improve join performance
CREATE INDEX idx_purchase_orders_work_order_id ON purchase_orders(work_order_id);
CREATE INDEX idx_purchase_orders_customer_order_id ON purchase_orders(customer_order_id);
