-- =====================================================
-- Auto Product Allocation Trigger Migration V40
-- Adds automatic allocation of new products to Main Warehouse
-- =====================================================

-- Create a function that auto-allocates products to main warehouse
CREATE OR REPLACE FUNCTION auto_allocate_product_to_main_warehouse()
RETURNS TRIGGER AS $$
DECLARE
  main_warehouse_id INTEGER;
BEGIN
  -- Get the main warehouse ID
  SELECT id INTO main_warehouse_id
  FROM distribution_centers
  WHERE code = 'DC-001' AND status = 'active'
  LIMIT 1;

  -- If main warehouse exists and product should be distributed
  IF main_warehouse_id IS NOT NULL AND NEW.is_distributed = true THEN
    -- Insert product location if it doesn't exist
    INSERT INTO product_locations (
      product_id,
      distribution_center_id,
      current_stock,
      min_stock_level,
      max_stock_level
    ) VALUES (
      NEW.id,
      main_warehouse_id,
      NEW.current_stock,
      NEW.min_stock_level,
      NEW.max_stock_level
    ) ON CONFLICT (product_id, distribution_center_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_allocate_product ON products;
CREATE TRIGGER trigger_auto_allocate_product
  AFTER INSERT ON products
  FOR EACH ROW
  WHEN (NEW.is_distributed = true)
  EXECUTE FUNCTION auto_allocate_product_to_main_warehouse();

COMMENT ON FUNCTION auto_allocate_product_to_main_warehouse() IS 'Automatically allocates new products to the main warehouse (DC-001) if they are marked as distributed';
COMMENT ON TRIGGER trigger_auto_allocate_product ON products IS 'Trigger to auto-allocate products to main warehouse on creation';
