-- Fix for double counting in distribution_center_stats view
-- The previous version used LEFT JOINS which caused row multiplication when multiple transfers existed

CREATE OR REPLACE VIEW distribution_center_stats AS
SELECT 
    dc.id,
    dc.name,
    dc.type,
    dc.status,
    (SELECT COUNT(*) FROM product_locations pl WHERE pl.distribution_center_id = dc.id AND pl.status = 'active') as total_products,
    (SELECT COALESCE(SUM(current_stock), 0) FROM product_locations pl WHERE pl.distribution_center_id = dc.id AND pl.status = 'active') as total_stock,
    (SELECT COALESCE(SUM(pl.current_stock * p.cost_price), 0) 
     FROM product_locations pl 
     JOIN products p ON pl.product_id = p.id 
     WHERE pl.distribution_center_id = dc.id AND pl.status = 'active') as total_inventory_value,
    (SELECT COUNT(*) FROM product_locations pl 
     WHERE pl.distribution_center_id = dc.id AND pl.status = 'active' AND pl.current_stock <= pl.min_stock_level) as low_stock_products,
    (SELECT COUNT(*) FROM stock_transfers st_from 
     WHERE st_from.from_center_id = dc.id AND st_from.created_at >= CURRENT_DATE - INTERVAL '30 days') as outbound_transfers,
    (SELECT COUNT(*) FROM stock_transfers st_to 
     WHERE st_to.to_center_id = dc.id AND st_to.created_at >= CURRENT_DATE - INTERVAL '30 days') as inbound_transfers
FROM distribution_centers dc
WHERE dc.status = 'active';
