-- V64: Fix Sales Rep Orders Customer Foreign Key
-- This migration fixes the foreign key constraint to support both sales_rep_customers and factory_customers
-- when both modules are available

BEGIN;

-- Drop the existing foreign key constraint
ALTER TABLE sales_rep_orders 
DROP CONSTRAINT IF EXISTS sales_rep_orders_customer_id_fkey;

-- Create a function to validate customer_id exists in either table
CREATE OR REPLACE FUNCTION validate_sales_rep_order_customer()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if customer exists in sales_rep_customers
  IF EXISTS (SELECT 1 FROM sales_rep_customers WHERE id = NEW.customer_id) THEN
    RETURN NEW;
  END IF;
  
  -- Check if customer exists in factory_customers
  IF EXISTS (SELECT 1 FROM factory_customers WHERE id = NEW.customer_id) THEN
    RETURN NEW;
  END IF;
  
  -- If neither, raise an error
  RAISE EXCEPTION 'Customer with id % does not exist in either sales_rep_customers or factory_customers', NEW.customer_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate customer_id on insert/update
CREATE TRIGGER validate_sales_rep_order_customer_trigger
  BEFORE INSERT OR UPDATE ON sales_rep_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_sales_rep_order_customer();

-- Add a comment explaining the trigger
COMMENT ON FUNCTION validate_sales_rep_order_customer() 
IS 'Validates that customer_id exists in either sales_rep_customers or factory_customers table';

COMMIT;
